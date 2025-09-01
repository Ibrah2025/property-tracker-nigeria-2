import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy, limit, where } from 'firebase/firestore'

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || ''
const sessions = new Map()

async function sendMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
  })
}

function parseAmount(text) {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(k|m)?/i)
  if (!match) return 0
  
  let amount = parseFloat(match[1])
  const unit = match[2]?.toLowerCase()
  
  // Proper conversion
  if (unit === 'k') amount = amount * 1000
  else if (unit === 'm') amount = amount * 1000000
  
  // Validate reasonable amounts (1k to 100M)
  if (amount < 1000 || amount > 100000000) return 0
  
  return amount
}

function parseExpense(text) {
  const amount = parseAmount(text)
  if (!amount) return null
  
  // Projects
  const projects = {
    maitama: 'Maitama Heights',
    jabi: 'Jabi Lakeside',
    garki: 'Garki Site',
    katampe: 'Katampe Hills',
    asokoro: 'Asokoro Residences',
    wuse: 'Wuse II Towers'
  }
  
  let project = 'Unassigned'
  const lower = text.toLowerCase()
  for (const [key, val] of Object.entries(projects)) {
    if (lower.includes(key)) {
      project = val
      break
    }
  }
  
  // Vendor - last capitalized word
  const words = text.split(' ')
  let vendor = 'Unknown'
  for (let i = words.length - 1; i >= 0; i--) {
    const word = words[i]
    if (word && word[0] === word[0].toUpperCase() && !word.match(/^\d/)) {
      vendor = word
      break
    }
  }
  
  // Category
  const categories = {
    cement: 'Cement',
    block: 'Blocks',
    labour: 'Labour',
    transport: 'Transport',
    wood: 'Wood',
    sand: 'Sand',
    paint: 'Paint',
    plumbing: 'Plumbing',
    electrical: 'Electrical'
  }
  
  let category = 'Other'
  for (const [key, val] of Object.entries(categories)) {
    if (lower.includes(key)) {
      category = val
      break
    }
  }
  
  return { amount, project, vendor, category }
}

function formatMoney(amount) {
  if (!amount || isNaN(amount)) return '?0'
  if (amount >= 1000000) return `?${(amount/1000000).toFixed(2)}M`
  if (amount >= 1000) return `?${Math.round(amount/1000)}k`
  return `?${amount}`
}

export async function POST(req) {
  try {
    const body = await req.json()
    const message = body.message
    if (!message) return NextResponse.json({ ok: true })
    
    const chatId = message.chat.id
    const text = (message.text || '').trim()
    const userName = message.from?.first_name || 'User'
    const userId = message.from?.id
    
    // Get session
    if (!sessions.has(userId)) {
      sessions.set(userId, { lastId: null, cache: [] })
    }
    const session = sessions.get(userId)
    
    const cmd = text.toLowerCase()
    
    // MENU
    if (cmd === '/start' || cmd === 'menu' || cmd === 'help') {
      await sendMessage(chatId,
        '<b>?? PROPERTY TRACKER</b>\n\n' +
        '<b>Add:</b> 200k cement Maitama Dangote\n' +
        '<b>List:</b> Show last 10\n' +
        '<b>Summary:</b> Today/week/month\n' +
        '<b>Balance Jabi:</b> Project budget\n' +
        '<b>Search vendor:</b> Find expenses\n' +
        '<b>Cancel:</b> Delete last\n' +
        '<b>#3 delete:</b> Remove item 3\n' +
        '<b>#3 500k:</b> Edit item 3'
      )
      return NextResponse.json({ ok: true })
    }
    
    // LIST
    if (cmd === 'list') {
      const expenses = await getDocs(
        query(collection(db, 'expenses'), orderBy('createdAt', 'desc'), limit(10))
      )
      
      if (expenses.empty) {
        await sendMessage(chatId, '?? No expenses yet')
        return NextResponse.json({ ok: true })
      }
      
      session.cache = []
      let text = '<b>?? RECENT EXPENSES:</b>\n\n'
      let total = 0
      let index = 1
      
      expenses.forEach(doc => {
        const data = doc.data()
        // Skip invalid entries
        if (!data.amount || isNaN(data.amount)) return
        
        session.cache.push({ id: doc.id, ...data })
        text += `<b>#${index}</b> ${formatMoney(data.amount)} - ${data.vendor || 'Unknown'}\n`
        text += `    ${data.project || 'Unassigned'} | ${data.category || 'Other'}\n\n`
        total += Number(data.amount) || 0
        index++
      })
      
      text += `<b>Total: ${formatMoney(total)}</b>`
      await sendMessage(chatId, text)
      return NextResponse.json({ ok: true })
    }
    
    // SUMMARY
    if (cmd.startsWith('summary')) {
      const period = cmd.split(' ')[1] || 'today'
      const now = new Date()
      let startDate = new Date()
      
      if (period === 'week') startDate.setDate(now.getDate() - 7)
      else if (period === 'month') startDate.setMonth(now.getMonth() - 1)
      else startDate.setHours(0, 0, 0, 0)
      
      const expenses = await getDocs(collection(db, 'expenses'))
      const stats = { total: 0, count: 0, byProject: {} }
      
      expenses.forEach(doc => {
        const data = doc.data()
        if (!data.amount || isNaN(data.amount)) return
        if (new Date(data.createdAt) >= startDate) {
          const amount = Number(data.amount)
          stats.total += amount
          stats.count++
          const p = data.project || 'Unassigned'
          stats.byProject[p] = (stats.byProject[p] || 0) + amount
        }
      })
      
      let text = `<b>?? SUMMARY - ${period.toUpperCase()}</b>\n\n`
      text += `Total: ${formatMoney(stats.total)}\n`
      text += `Expenses: ${stats.count}\n\n`
      
      if (Object.keys(stats.byProject).length > 0) {
        text += '<b>By Project:</b>\n'
        Object.entries(stats.byProject)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .forEach(([p, amt]) => {
            text += `${p}: ${formatMoney(amt)}\n`
          })
      }
      
      await sendMessage(chatId, text)
      return NextResponse.json({ ok: true })
    }
    
    // BALANCE
    if (cmd.startsWith('balance')) {
      const search = text.substring(7).toLowerCase().trim()
      const budgets = {
        'Maitama Heights': 15000000,
        'Jabi Lakeside': 25000000,
        'Garki Site': 12000000,
        'Katampe Hills': 20000000,
        'Asokoro Residences': 18000000,
        'Wuse II Towers': 30000000
      }
      
      let found = null
      for (const key of Object.keys(budgets)) {
        if (key.toLowerCase().includes(search)) {
          found = key
          break
        }
      }
      
      if (!found) {
        await sendMessage(chatId, '?? Project not found')
        return NextResponse.json({ ok: true })
      }
      
      const budget = budgets[found]
      const expenses = await getDocs(collection(db, 'expenses'))
      let spent = 0
      
      expenses.forEach(doc => {
        const data = doc.data()
        if (data.project === found && data.amount && !isNaN(data.amount)) {
          spent += Number(data.amount)
        }
      })
      
      const remaining = budget - spent
      const percentage = Math.round((spent/budget) * 100)
      const status = percentage >= 90 ? '??' : percentage >= 70 ? '??' : '??'
      
      await sendMessage(chatId,
        `<b>?? ${found.toUpperCase()}</b>\n\n` +
        `Budget: ${formatMoney(budget)}\n` +
        `Spent: ${formatMoney(spent)} (${percentage}%)\n` +
        `Remaining: ${formatMoney(remaining)}\n\n` +
        `Status: ${status}`
      )
      return NextResponse.json({ ok: true })
    }
    
    // SEARCH
    if (cmd.startsWith('search')) {
      const term = text.substring(6).trim().toLowerCase()
      if (!term) {
        await sendMessage(chatId, '?? Search what? Example: search Dangote')
        return NextResponse.json({ ok: true })
      }
      
      const expenses = await getDocs(collection(db, 'expenses'))
      const results = []
      
      expenses.forEach(doc => {
        const data = doc.data()
        if (!data.amount || isNaN(data.amount)) return
        
        const searchIn = `${data.vendor} ${data.project} ${data.category}`.toLowerCase()
        if (searchIn.includes(term)) {
          results.push(data)
        }
      })
      
      if (results.length === 0) {
        await sendMessage(chatId, '?? No results found')
        return NextResponse.json({ ok: true })
      }
      
      let text = `<b>?? SEARCH: ${term}</b>\n\n`
      let total = 0
      
      results.slice(0, 10).forEach(exp => {
        text += `${formatMoney(exp.amount)} - ${exp.vendor || 'Unknown'}\n`
        text += `   ${exp.project || 'Unassigned'}\n\n`
        total += Number(exp.amount) || 0
      })
      
      text += `<b>Total: ${formatMoney(total)}</b>`
      await sendMessage(chatId, text)
      return NextResponse.json({ ok: true })
    }
    
    // NUMBERED COMMANDS
    const numMatch = cmd.match(/^#(\d+)\s*(.*)/)
    if (numMatch) {
      const num = parseInt(numMatch[1]) - 1
      const action = numMatch[2].trim()
      
      if (!session.cache[num]) {
        await sendMessage(chatId, '?? Invalid #. Type LIST first')
        return NextResponse.json({ ok: true })
      }
      
      const target = session.cache[num]
      
      if (action === 'delete') {
        await deleteDoc(doc(db, 'expenses', target.id))
        await sendMessage(chatId, `? Deleted #${num + 1}`)
      } else {
        const amount = parseAmount(action)
        if (amount) {
          await updateDoc(doc(db, 'expenses', target.id), { 
            amount,
            editedAt: new Date().toISOString()
          })
          await sendMessage(chatId, `?? #${num + 1} updated to ${formatMoney(amount)}`)
        } else {
          await sendMessage(chatId, '?? Use: #3 delete or #3 500k')
        }
      }
      return NextResponse.json({ ok: true })
    }
    
    // CANCEL
    if (cmd === 'cancel' || cmd === 'undo') {
      if (session.lastId) {
        await deleteDoc(doc(db, 'expenses', session.lastId))
        await sendMessage(chatId, '? Last expense deleted')
        session.lastId = null
      } else {
        await sendMessage(chatId, '?? No recent expense')
      }
      return NextResponse.json({ ok: true })
    }
    
    // EDIT
    if (cmd.startsWith('edit ')) {
      if (!session.lastId) {
        await sendMessage(chatId, '?? No recent expense to edit')
        return NextResponse.json({ ok: true })
      }
      
      const amount = parseAmount(text.substring(5))
      if (amount) {
        await updateDoc(doc(db, 'expenses', session.lastId), {
          amount,
          editedAt: new Date().toISOString()
        })
        await sendMessage(chatId, `?? Updated to ${formatMoney(amount)}`)
      } else {
        await sendMessage(chatId, '?? Invalid amount')
      }
      return NextResponse.json({ ok: true })
    }
    
    // PARSE AS EXPENSE
    const parsed = parseExpense(text)
    
    if (parsed && parsed.amount > 0) {
      const expense = {
        amount: parsed.amount,
        project: parsed.project,
        vendor: parsed.vendor,
        category: parsed.category,
        source: 'telegram',
        telegramUser: userName,
        telegramUserId: userId,
        originalText: text,
        createdAt: new Date().toISOString()
      }
      
      const docRef = await addDoc(collection(db, 'expenses'), expense)
      session.lastId = docRef.id
      
      await sendMessage(chatId,
        `? <b>SAVED!</b>\n\n` +
        `Amount: ${formatMoney(parsed.amount)}\n` +
        `Project: ${parsed.project}\n` +
        `Vendor: ${parsed.vendor}\n` +
        `Category: ${parsed.category}`
      )
    } else {
      await sendMessage(chatId, '? Not understood\n\nFormat: 200k cement Maitama')
    }
    
    return NextResponse.json({ ok: true })
    
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ ok: true })
  }
}

