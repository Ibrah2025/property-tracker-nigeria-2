import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy, limit, where } from 'firebase/firestore'

const TELEGRAM_TOKEN = '8477323092:AAF6X5Sh_NUge9N6MmEQyM84RcS8BCP3T6Y'
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
  
  if (unit === 'k') amount = amount * 1000
  else if (unit === 'm') amount = amount * 1000000
  
  if (amount < 1000 || amount > 100000000) return 0
  
  return amount
}

function parseExpense(text) {
  const amount = parseAmount(text)
  if (!amount) return null
  
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
  
  const words = text.split(' ')
  let vendor = 'Unknown'
  for (let i = words.length - 1; i >= 0; i--) {
    const word = words[i]
    if (word && word[0] === word[0].toUpperCase() && !word.match(/^\d/)) {
      vendor = word
      break
    }
  }
  
  const categories = {
    cement: 'Cement',
    block: 'Blocks',
    blocks: 'Blocks',
    labour: 'Labour',
    labor: 'Labour',
    transport: 'Transport',
    wood: 'Wood',
    sand: 'Sand',
    paint: 'Paint',
    plumbing: 'Plumbing',
    electrical: 'Electrical',
    door: 'Doors/Windows',
    doors: 'Doors/Windows',
    window: 'Doors/Windows',
    windows: 'Doors/Windows',
    iron: 'Iron/Steel',
    steel: 'Iron/Steel',
    roofing: 'Roofing',
    tiles: 'Tiles',
    pop: 'POP',
    granite: 'Granite',
    marble: 'Marble'
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
  if (!amount || isNaN(amount)) return 'N0'
  if (amount >= 1000000) return `N${(amount/1000000).toFixed(2)}M`
  if (amount >= 1000) return `N${Math.round(amount/1000)}k`
  return `N${amount}`
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
    
    if (!sessions.has(userId)) {
      sessions.set(userId, { lastId: null, cache: [] })
    }
    const session = sessions.get(userId)
    
    const cmd = text.toLowerCase()
    
    // MENU/HELP
    if (cmd === '/start' || cmd === 'menu' || cmd === 'help') {
      await sendMessage(chatId,
        '<b>PROPERTY TRACKER BOT</b>\n\n' +
        '<b>Basic Commands:</b>\n' +
        'Add: <code>200k cement Maitama Dangote</code>\n' +
        'List: <code>list</code> - Last 10 expenses\n' +
        'Summary: <code>summary</code> - Overall totals\n' +
        'Cancel: <code>cancel</code> - Delete last entry\n\n' +
        '<b>Advanced Commands:</b>\n' +
        'Search: <code>search Dangote</code>\n' +
        'Balance: <code>balance Maitama</code>\n' +
        'Edit: <code>#3 500k</code> - Edit entry #3\n' +
        'Delete: <code>#3 delete</code> - Delete entry #3\n\n' +
        '<b>Projects:</b> Maitama, Jabi, Garki, Katampe, Asokoro, Wuse\n' +
        '<b>Categories:</b> Cement, Blocks, Sand, Labour, Transport, etc.'
      )
      return NextResponse.json({ ok: true })
    }
    
    // LIST
    if (cmd === 'list') {
      const expenses = await getDocs(
        query(collection(db, 'expenses'), orderBy('createdAt', 'desc'), limit(10))
      )
      
      if (expenses.empty) {
        await sendMessage(chatId, 'No expenses recorded yet')
        return NextResponse.json({ ok: true })
      }
      
      session.cache = []
      let text = '<b>RECENT EXPENSES:</b>\n\n'
      let total = 0
      let index = 1
      
      expenses.forEach(doc => {
        const data = doc.data()
        if (!data.amount || isNaN(data.amount)) return
        
        session.cache.push({ id: doc.id, ...data })
        text += `<b>#${index}</b> ${formatMoney(data.amount)} - ${data.vendor || 'Unknown'}\n`
        text += `    ${data.project || 'Unassigned'} | ${data.category || 'Other'}\n`
        text += `    ${new Date(data.createdAt).toLocaleDateString()}\n\n`
        total += Number(data.amount) || 0
        index++
      })
      
      text += `<b>Total: ${formatMoney(total)}</b>`
      await sendMessage(chatId, text)
      return NextResponse.json({ ok: true })
    }
    
    // SUMMARY
    if (cmd.startsWith('summary')) {
      const period = cmd.split(' ')[1] || 'all'
      const now = new Date()
      let startDate = new Date(0)
      
      if (period === 'today') {
        startDate = new Date()
        startDate.setHours(0, 0, 0, 0)
      } else if (period === 'week') {
        startDate.setDate(now.getDate() - 7)
      } else if (period === 'month') {
        startDate.setMonth(now.getMonth() - 1)
      }
      
      const expenses = await getDocs(collection(db, 'expenses'))
      const stats = { total: 0, count: 0, byProject: {}, byCategory: {}, byVendor: {} }
      
      expenses.forEach(doc => {
        const data = doc.data()
        if (!data.amount || isNaN(data.amount)) return
        if (new Date(data.createdAt) >= startDate) {
          const amount = Number(data.amount)
          stats.total += amount
          stats.count++
          
          const project = data.project || 'Unassigned'
          stats.byProject[project] = (stats.byProject[project] || 0) + amount
          
          const category = data.category || 'Other'
          stats.byCategory[category] = (stats.byCategory[category] || 0) + amount
          
          const vendor = data.vendor || 'Unknown'
          stats.byVendor[vendor] = (stats.byVendor[vendor] || 0) + amount
        }
      })
      
      let text = `<b>SUMMARY - ${period.toUpperCase()}</b>\n\n`
      text += `<b>Overall:</b>\n`
      text += `Total: ${formatMoney(stats.total)}\n`
      text += `Expenses: ${stats.count}\n`
      text += `Average: ${formatMoney(stats.count ? stats.total/stats.count : 0)}\n\n`
      
      if (Object.keys(stats.byProject).length > 0) {
        text += '<b>By Project:</b>\n'
        Object.entries(stats.byProject)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .forEach(([name, amt]) => {
            text += `${name}: ${formatMoney(amt)}\n`
          })
        text += '\n'
      }
      
      if (Object.keys(stats.byCategory).length > 0) {
        text += '<b>Top Categories:</b>\n'
        Object.entries(stats.byCategory)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .forEach(([name, amt]) => {
            text += `${name}: ${formatMoney(amt)}\n`
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
        await sendMessage(chatId, 'Project not found. Use: Maitama, Jabi, Garki, Katampe, Asokoro, or Wuse')
        return NextResponse.json({ ok: true })
      }
      
      const budget = budgets[found]
      const expenses = await getDocs(collection(db, 'expenses'))
      let spent = 0
      let count = 0
      
      expenses.forEach(doc => {
        const data = doc.data()
        if (data.project === found && data.amount && !isNaN(data.amount)) {
          spent += Number(data.amount)
          count++
        }
      })
      
      const remaining = budget - spent
      const percentage = Math.round((spent/budget) * 100)
      const status = percentage >= 90 ? 'CRITICAL' : percentage >= 70 ? 'WARNING' : 'ON TRACK'
      
      await sendMessage(chatId,
        `<b>${found.toUpperCase()}</b>\n\n` +
        `Budget: ${formatMoney(budget)}\n` +
        `Spent: ${formatMoney(spent)} (${percentage}%)\n` +
        `Remaining: ${formatMoney(remaining)}\n` +
        `Transactions: ${count}\n\n` +
        `Status: <b>${status}</b>`
      )
      return NextResponse.json({ ok: true })
    }
    
    // SEARCH
    if (cmd.startsWith('search')) {
      const term = text.substring(6).trim().toLowerCase()
      if (!term) {
        await sendMessage(chatId, 'Usage: search Dangote')
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
        await sendMessage(chatId, 'No results found')
        return NextResponse.json({ ok: true })
      }
      
      let text = `<b>SEARCH RESULTS: "${term}"</b>\n\n`
      let total = 0
      
      results.slice(0, 10).forEach(exp => {
        text += `${formatMoney(exp.amount)} - ${exp.vendor || 'Unknown'}\n`
        text += `   ${exp.project || 'Unassigned'} | ${exp.category || 'Other'}\n`
        text += `   ${new Date(exp.createdAt).toLocaleDateString()}\n\n`
        total += Number(exp.amount) || 0
      })
      
      text += `<b>Found: ${results.length} results</b>\n`
      text += `<b>Total: ${formatMoney(total)}</b>`
      await sendMessage(chatId, text)
      return NextResponse.json({ ok: true })
    }
    
    // NUMBERED COMMANDS (#3 delete, #3 500k)
    const numMatch = cmd.match(/^#(\d+)\s*(.*)/)
    if (numMatch) {
      const num = parseInt(numMatch[1]) - 1
      const action = numMatch[2].trim()
      
      if (!session.cache[num]) {
        await sendMessage(chatId, 'Invalid number. Type LIST first')
        return NextResponse.json({ ok: true })
      }
      
      const target = session.cache[num]
      
      if (action === 'delete') {
        await deleteDoc(doc(db, 'expenses', target.id))
        await sendMessage(chatId, `Deleted #${num + 1}`)
      } else {
        const amount = parseAmount(action)
        if (amount) {
          await updateDoc(doc(db, 'expenses', target.id), { 
            amount,
            editedAt: new Date().toISOString(),
            editedBy: userName
          })
          await sendMessage(chatId, `Updated #${num + 1} to ${formatMoney(amount)}`)
        } else {
          await sendMessage(chatId, 'Usage: #3 delete or #3 500k')
        }
      }
      return NextResponse.json({ ok: true })
    }
    
    // CANCEL (delete last)
    if (cmd === 'cancel' || cmd === 'undo') {
      if (session.lastId) {
        await deleteDoc(doc(db, 'expenses', session.lastId))
        await sendMessage(chatId, 'Last expense deleted')
        session.lastId = null
      } else {
        await sendMessage(chatId, 'No recent expense to delete')
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
        `<b>SAVED!</b>\n\n` +
        `Amount: ${formatMoney(parsed.amount)}\n` +
        `Project: ${parsed.project}\n` +
        `Vendor: ${parsed.vendor}\n` +
        `Category: ${parsed.category}`
      )
    } else {
      await sendMessage(chatId, 
        'Not understood.\n\n' +
        'Format: <code>200k cement Maitama</code>\n' +
        'Type MENU for help'
      )
    }
    
    return NextResponse.json({ ok: true })
    
  } catch (error) {
    console.error('Telegram bot error:', error)
    return NextResponse.json({ ok: true })
  }
}
