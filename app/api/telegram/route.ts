import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy, limit } from 'firebase/firestore'

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
      sessions.set(userId, { lastId: null, cache: [], projectCache: [] })
    }
    const session = sessions.get(userId)
    
    const cmd = text.toLowerCase()
    
    // MENU
    if (cmd === '/start' || cmd === 'menu' || cmd === 'help') {
      await sendMessage(chatId,
        '<b>PROPERTY TRACKER BOT</b>\n\n' +
        '<b>Expense Commands:</b>\n' +
        'Add: <code>200k cement Maitama</code>\n' +
        'List: <code>list</code>\n' +
        'Summary: <code>summary</code>\n\n' +
        '<b>Project Commands:</b>\n' +
        'View: <code>projects</code>\n' +
        'Add: <code>addproject Name 15m Location</code>\n' +
        'Edit: <code>project#1 20m</code>\n' +
        'Delete: <code>project#1 delete</code>\n' +
        'Balance: <code>balance Maitama</code>'
      )
      return NextResponse.json({ ok: true })
    }
    
    // PROJECTS LIST
    if (cmd === 'projects') {
      const projects = await getDocs(collection(db, 'projects'))
      
      if (projects.empty) {
        await sendMessage(chatId, 'No projects found')
        return NextResponse.json({ ok: true })
      }
      
      session.projectCache = []
      let text = '<b>PROJECTS:</b>\n\n'
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
        await sendMessage(chatId, 'Format: addproject ProjectName 15m Location')
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
        `<b>PROJECT CREATED!</b>\n\n` +
        `Name: ${name}\n` +
        `Budget: ${formatMoney(budget)}\n` +
        `Location: ${location}`
      )
      return NextResponse.json({ ok: true })
    }
    
    // PROJECT EDIT/DELETE
    const projectMatch = cmd.match(/^project#(\d+)\s*(.*)/)
    if (projectMatch) {
      const num = parseInt(projectMatch[1]) - 1
      const action = projectMatch[2].trim()
      
      if (!session.projectCache[num]) {
        await sendMessage(chatId, 'Invalid #. Type PROJECTS first')
        return NextResponse.json({ ok: true })
      }
      
      const target = session.projectCache[num]
      
      if (action === 'delete') {
        await deleteDoc(doc(db, 'projects', target.id))
        await sendMessage(chatId, `Deleted: ${target.name}`)
      } else {
        const budget = parseAmount(action)
        if (budget) {
          await updateDoc(doc(db, 'projects', target.id), { budget })
          await sendMessage(chatId, `Updated ${target.name} to ${formatMoney(budget)}`)
        }
      }
      return NextResponse.json({ ok: true })
    }
    
    // LIST EXPENSES
    if (cmd === 'list') {
      const expenses = await getDocs(
        query(collection(db, 'expenses'), orderBy('createdAt', 'desc'), limit(10))
      )
      
      if (expenses.empty) {
        await sendMessage(chatId, 'No expenses yet')
        return NextResponse.json({ ok: true })
      }
      
      let text = '<b>RECENT EXPENSES:</b>\n\n'
      let total = 0
      
      expenses.forEach(doc => {
        const data = doc.data()
        text += `${formatMoney(data.amount)} - ${data.vendor || 'Unknown'}\n`
        text += `${data.project || 'Unassigned'}\n\n`
        total += data.amount || 0
      })
      
      text += `<b>Total: ${formatMoney(total)}</b>`
      await sendMessage(chatId, text)
      return NextResponse.json({ ok: true })
    }
    
    // SUMMARY
    if (cmd === 'summary') {
      const expenses = await getDocs(collection(db, 'expenses'))
      let total = 0
      let count = 0
      
      expenses.forEach(doc => {
        total += doc.data().amount || 0
        count++
      })
      
      await sendMessage(chatId, 
        `<b>SUMMARY</b>\n\n` +
        `Total: ${formatMoney(total)}\n` +
        `Expenses: ${count}`
      )
      return NextResponse.json({ ok: true })
    }
    
    // BALANCE
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
        `Remaining: ${formatMoney(project.budget - spent)}`
      )
      return NextResponse.json({ ok: true })
    }
    
    // TRY TO PARSE AS EXPENSE
    const amount = parseAmount(text)
    if (amount > 0) {
      // Find project name
      const projects = await getDocs(collection(db, 'projects'))
      let projectName = 'Unassigned'
      
      projects.forEach(doc => {
        const data = doc.data()
        const key = data.name.toLowerCase().split(' ')[0]
        if (text.toLowerCase().includes(key)) {
          projectName = data.name
        }
      })
      
      // Extract vendor (last capitalized word)
      const words = text.split(' ')
      let vendor = 'Unknown'
      for (let i = words.length - 1; i >= 0; i--) {
        if (words[i][0] === words[i][0].toUpperCase() && !words[i].match(/^\d/)) {
          vendor = words[i]
          break
        }
      }
      
      // Extract category
      let category = 'Other'
      const categories = ['cement', 'blocks', 'sand', 'labour', 'transport']
      for (const cat of categories) {
        if (text.toLowerCase().includes(cat)) {
          category = cat.charAt(0).toUpperCase() + cat.slice(1)
          break
        }
      }
      
      await addDoc(collection(db, 'expenses'), {
        amount,
        project: projectName,
        vendor,
        category,
        source: 'telegram',
        telegramUser: userName,
        createdAt: new Date().toISOString()
      })
      
      session.lastId = doc.id
      
      await sendMessage(chatId,
        `<b>SAVED!</b>\n\n` +
        `Amount: ${formatMoney(amount)}\n` +
        `Project: ${projectName}\n` +
        `Vendor: ${vendor}\n` +
        `Category: ${category}`
      )
    } else {
      await sendMessage(chatId, 'Not understood.\n\nType MENU for help')
    }
    
    return NextResponse.json({ ok: true })
    
  } catch (error) {
    console.error('Telegram bot error:', error)
    return NextResponse.json({ ok: true })
  }
}
