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
  
  return amount
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
      sessions.set(userId, { lastExpenseId: null, expenseCache: [], projectCache: [] })
    }
    const session = sessions.get(userId)
    
    const cmd = text.toLowerCase()
    
    // MENU COMMAND
    if (cmd === '/start' || cmd === 'menu' || cmd === 'help') {
      await sendMessage(chatId,
        '<b> PROPERTY TRACKER BOT</b>\n\n' +
        '<b> Add Expense:</b>\n' +
        'Format: <code>500k cement Maitama Dangote</code>\n\n' +
        '<b> Commands:</b>\n' +
        ' <code>list</code> - Last 10 expenses\n' +
        ' <code>summary</code> - Total summary\n' +
        ' <code>projects</code> - View all projects\n' +
        ' <code>balance Maitama</code> - Project balance\n' +
        ' <code>cancel</code> - Delete last expense\n\n' +
        '<b> Projects:</b>\n' +
        ' <code>addproject Name 20m Location</code>\n' +
        ' <code>project#1 delete</code> - Delete project\n\n' +
        '<b> Edit/Delete:</b>\n' +
        ' <code>#1 delete</code> - Delete expense #1\n' +
        ' <code>#1 800k</code> - Edit expense #1\n\n' +
        'Just type amount + details to add expense!'
      )
      return NextResponse.json({ ok: true })
    }
    
    // LIST COMMAND
    if (cmd === 'list') {
      const expenses = await getDocs(
        query(collection(db, 'expenses'), orderBy('createdAt', 'desc'), limit(10))
      )
      
      if (expenses.empty) {
        await sendMessage(chatId, 'No expenses yet. Add one: 500k cement Maitama')
        return NextResponse.json({ ok: true })
      }
      
      session.expenseCache = []
      let text = '<b> RECENT EXPENSES</b>\n\n'
      let index = 1
      let total = 0
      
      expenses.forEach(doc => {
        const data = doc.data()
        session.expenseCache.push({ id: doc.id, ...data })
        text += `<b>#${index}</b> ${formatMoney(data.amount)}\n`
        text += `Project: ${data.project || 'Unassigned'}\n`
        text += `Vendor: ${data.vendor || 'Unknown'}\n`
        text += `Category: ${data.category || 'Other'}\n\n`
        total += data.amount || 0
        index++
      })
      
      text += `<b>Total: ${formatMoney(total)}</b>`
      await sendMessage(chatId, text)
      return NextResponse.json({ ok: true })
    }
    
    // SUMMARY COMMAND
    if (cmd === 'summary') {
      const expenses = await getDocs(collection(db, 'expenses'))
      let total = 0
      let count = 0
      
      expenses.forEach(doc => {
        total += doc.data().amount || 0
        count++
      })
      
      await sendMessage(chatId, 
        `<b> SUMMARY</b>\n\n` +
        `Total Spent: ${formatMoney(total)}\n` +
        `Expenses: ${count}`
      )
      return NextResponse.json({ ok: true })
    }
    
    // PROJECTS COMMAND
    if (cmd === 'projects') {
      const projects = await getDocs(collection(db, 'projects'))
      
      if (projects.empty) {
        await sendMessage(chatId, 'No projects. Add: <code>addproject Name 10m Location</code>')
        return NextResponse.json({ ok: true })
      }
      
      session.projectCache = []
      let text = '<b> PROJECTS</b>\n\n'
      let index = 1
      
      projects.forEach(doc => {
        const data = doc.data()
        session.projectCache.push({ id: doc.id, ...data })
        text += `<b>#${index}</b> ${data.name}\n`
        text += `Budget: ${formatMoney(data.budget)}\n`
        text += `Location: ${data.location || 'N/A'}\n\n`
        index++
      })
      
      await sendMessage(chatId, text)
      return NextResponse.json({ ok: true })
    }
    
    // ADD PROJECT
    if (cmd.startsWith('addproject ')) {
      const parts = text.substring(11).split(' ')
      if (parts.length < 2) {
        await sendMessage(chatId, 'Format: <code>addproject Name 15m Location</code>')
        return NextResponse.json({ ok: true })
      }
      
      const name = parts[0]
      const budget = parseAmount(parts[1])
      const location = parts.slice(2).join(' ') || 'Abuja'
      
      if (!budget) {
        await sendMessage(chatId, 'Invalid budget amount')
        return NextResponse.json({ ok: true })
      }
      
      await addDoc(collection(db, 'projects'), {
        name,
        budget,
        location,
        status: 'active',
        createdAt: new Date().toISOString()
      })
      
      await sendMessage(chatId, 
        ` PROJECT CREATED!\n\n` +
        `Name: ${name}\n` +
        `Budget: ${formatMoney(budget)}\n` +
        `Location: ${location}`
      )
      return NextResponse.json({ ok: true })
    }
    
    // PROJECT COMMANDS (#1 delete)
    const projectMatch = cmd.match(/^project#(\d+)\s*(.*)/)
    if (projectMatch) {
      const num = parseInt(projectMatch[1]) - 1
      const action = projectMatch[2].trim()
      
      if (!session.projectCache[num]) {
        await sendMessage(chatId, 'Type <code>projects</code> first')
        return NextResponse.json({ ok: true })
      }
      
      const target = session.projectCache[num]
      
      if (action === 'delete') {
        await deleteDoc(doc(db, 'projects', target.id))
        await sendMessage(chatId, ` Deleted: ${target.name}`)
      }
      return NextResponse.json({ ok: true })
    }
    
    // EXPENSE COMMANDS (#1 delete, #1 500k)
    const expenseMatch = cmd.match(/^#(\d+)\s*(.*)/)
    if (expenseMatch) {
      const num = parseInt(expenseMatch[1]) - 1
      const action = expenseMatch[2].trim()
      
      if (!session.expenseCache[num]) {
        await sendMessage(chatId, 'Type <code>list</code> first')
        return NextResponse.json({ ok: true })
      }
      
      const target = session.expenseCache[num]
      
      if (action === 'delete') {
        await deleteDoc(doc(db, 'expenses', target.id))
        await sendMessage(chatId, ' Expense deleted')
      } else {
        const amount = parseAmount(action)
        if (amount) {
          await updateDoc(doc(db, 'expenses', target.id), { amount })
          await sendMessage(chatId, ` Updated to ${formatMoney(amount)}`)
        }
      }
      return NextResponse.json({ ok: true })
    }
    
    // BALANCE COMMAND
    if (cmd.startsWith('balance')) {
      const projectName = text.substring(7).trim()
      const projects = await getDocs(collection(db, 'projects'))
      const expenses = await getDocs(collection(db, 'expenses'))
      
      let project = null
      projects.forEach(doc => {
        const data = doc.data()
        if (data.name.toLowerCase().includes(projectName.toLowerCase())) {
          project = data
        }
      })
      
      if (!project) {
        await sendMessage(chatId, 'Project not found')
        return NextResponse.json({ ok: true })
      }
      
      let spent = 0
      expenses.forEach(doc => {
        const data = doc.data()
        if (data.project === project.name) {
          spent += data.amount || 0
        }
      })
      
      await sendMessage(chatId,
        `<b>${project.name}</b>\n\n` +
        `Budget: ${formatMoney(project.budget)}\n` +
        `Spent: ${formatMoney(spent)}\n` +
        `Remaining: ${formatMoney(project.budget - spent)}\n` +
        `Used: ${((spent/project.budget)*100).toFixed(1)}%`
      )
      return NextResponse.json({ ok: true })
    }
    
    // CANCEL COMMAND
    if (cmd === 'cancel' || cmd === 'undo') {
      if (session.lastExpenseId) {
        await deleteDoc(doc(db, 'expenses', session.lastExpenseId))
        await sendMessage(chatId, ' Last expense deleted')
        session.lastExpenseId = null
      } else {
        await sendMessage(chatId, 'No recent expense to cancel')
      }
      return NextResponse.json({ ok: true })
    }
    
    // TRY TO ADD EXPENSE
    const amount = parseAmount(text)
    if (amount > 0) {
      const lowerText = text.toLowerCase()
      
      // VENDOR DETECTION - CHECK THESE FIRST!
      let vendor = 'Unknown'
      if (lowerText.includes('dangote')) vendor = 'Dangote'
      else if (lowerText.includes('bua')) vendor = 'BUA'
      else if (lowerText.includes('julius') || lowerText.includes('berger')) vendor = 'Julius Berger'
      else if (lowerText.includes('emos')) vendor = 'Emos'
      else if (lowerText.includes('schneider')) vendor = 'Schneider'
      else if (lowerText.includes('lafarge')) vendor = 'Lafarge'
      else if (lowerText.includes('elephant')) vendor = 'Elephant Cement'
      else if (lowerText.includes('unicem')) vendor = 'Unicem'
      
      // PROJECT DETECTION
      let projectName = 'Unassigned'
      if (lowerText.includes('maitama')) projectName = 'Maitama Heights'
      else if (lowerText.includes('jabi')) projectName = 'Jabi Lakeside'
      else if (lowerText.includes('garki')) projectName = 'Garki Site'
      else if (lowerText.includes('katampe')) projectName = 'Katampe Hills'
      else if (lowerText.includes('asokoro')) projectName = 'Asokoro Residences'
      else if (lowerText.includes('wuse')) projectName = 'Wuse II Towers'
      
      // CATEGORY DETECTION
      let category = 'Other'
      if (lowerText.includes('cement')) category = 'Cement'
      else if (lowerText.includes('block')) category = 'Blocks'
      else if (lowerText.includes('sand')) category = 'Sand'
      else if (lowerText.includes('labour') || lowerText.includes('labor')) category = 'Labour'
      else if (lowerText.includes('transport')) category = 'Transport'
      else if (lowerText.includes('wood')) category = 'Wood'
      else if (lowerText.includes('paint')) category = 'Paint'
      else if (lowerText.includes('plumbing')) category = 'Plumbing'
      else if (lowerText.includes('electrical')) category = 'Electrical'
      else if (lowerText.includes('roofing')) category = 'Roofing'
      else if (lowerText.includes('tiles')) category = 'Tiles'
      else if (lowerText.includes('iron') || lowerText.includes('steel')) category = 'Iron/Steel'
      else if (lowerText.includes('granite')) category = 'Granite'
      
      // If vendor still unknown, check for other capitalized words
      if (vendor === 'Unknown') {
        const words = text.split(' ')
        const skipWords = ['maitama', 'jabi', 'garki', 'katampe', 'asokoro', 'wuse',
                          'cement', 'blocks', 'sand', 'labour', 'transport', 'paint']
        
        for (let i = words.length - 1; i >= 0; i--) {
          const word = words[i]
          const lowerWord = word.toLowerCase()
          if (!word.match(/^\d/) && 
              !lowerWord.includes('k') && 
              !lowerWord.includes('m') &&
              !skipWords.includes(lowerWord) && 
              word.length > 1) {
            vendor = word
            break
          }
        }
      }
      
      // Save expense
      const docRef = await addDoc(collection(db, 'expenses'), {
        amount,
        project: projectName,
        vendor,
        category,
        source: 'telegram',
        telegramUser: userName,
        createdAt: new Date().toISOString()
      })
      
      session.lastExpenseId = docRef.id
      
      // Check project budget
      let alertMsg = ''
      if (projectName !== 'Unassigned') {
        const projects = await getDocs(collection(db, 'projects'))
        let projectData = null
        
        projects.forEach(doc => {
          if (doc.data().name === projectName) {
            projectData = doc.data()
          }
        })
        
        if (projectData) {
          const expenses = await getDocs(
            query(collection(db, 'expenses'), where('project', '==', projectName))
          )
          let totalSpent = 0
          expenses.forEach(doc => totalSpent += doc.data().amount || 0)
          
          const percentage = (totalSpent/projectData.budget*100)
          if (percentage >= 90) alertMsg = '\n\n WARNING: Over 90% of budget used!'
          else if (percentage >= 75) alertMsg = '\n\n NOTICE: Over 75% of budget used'
          
          await sendMessage(chatId,
            ` <b>EXPENSE SAVED!</b>\n\n` +
            ` Amount: ${formatMoney(amount)}\n` +
            ` Project: ${projectName}\n` +
            ` Vendor: ${vendor}\n` +
            ` Category: ${category}\n\n` +
            `Budget: ${formatMoney(projectData.budget)}\n` +
            `Total Spent: ${formatMoney(totalSpent)} (${percentage.toFixed(1)}%)` +
            alertMsg
          )
          return NextResponse.json({ ok: true })
        }
      }
      
      await sendMessage(chatId,
        ` <b>EXPENSE SAVED!</b>\n\n` +
        ` Amount: ${formatMoney(amount)}\n` +
        ` Project: ${projectName}\n` +
        ` Vendor: ${vendor}\n` +
        ` Category: ${category}`
      )
    } else {
      await sendMessage(chatId, 
        'Not understood.\n\n' +
        'Format: <code>500k cement Maitama Dangote</code>\n' +
        'Type <code>menu</code> for help'
      )
    }
    
    return NextResponse.json({ ok: true })
    
  } catch (error) {
    console.error('Telegram bot error:', error)
    return NextResponse.json({ ok: true })
  }
}
