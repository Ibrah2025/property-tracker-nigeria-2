import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../lib/firebase'
import { collection, addDoc, deleteDoc, doc, updateDoc, getDocs, getDoc } from 'firebase/firestore'

const TELEGRAM_TOKEN = '8477323092:AAF6X5Sh_NUge9N6MmEQyM84RcS8BCP3T6Y'

// Store last expense per user and list cache
const lastExpenseByUser = {}
const lastListByUser = {}
const deletedExpenses = {}

async function sendMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
  })
}

async function getRecentExpenses() {
  try {
    const snapshot = await getDocs(collection(db, 'expenses'))
    const expenses = []
    snapshot.forEach(doc => {
      expenses.push({ id: doc.id, ...doc.data() })
    })
    expenses.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    return expenses.slice(0, 10)
  } catch (error) {
    console.error('Error getting expenses:', error)
    return []
  }
}

async function getSummary(period = 'today') {
  try {
    const now = new Date()
    let startDate = new Date()
    
    switch(period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0)
        break
      case 'week':
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(now.getMonth() - 1)
        break
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1)
        break
    }
    
    const expensesSnapshot = await getDocs(collection(db, 'expenses'))
    const expenses = []
    
    expensesSnapshot.forEach(doc => {
      const data = doc.data()
      if (new Date(data.createdAt) >= startDate && !data.cancelled) {
        expenses.push(data)
      }
    })
    
    const byProject = {}
    const byVendor = {}
    let total = 0
    
    expenses.forEach(exp => {
      total += exp.amount || 0
      const project = exp.project || 'Unspecified'
      byProject[project] = (byProject[project] || 0) + exp.amount
      const vendor = exp.vendor || 'Unknown'
      byVendor[vendor] = (byVendor[vendor] || 0) + exp.amount
    })
    
    const topVendor = Object.entries(byVendor).sort((a, b) => b[1] - a[1])[0]
    
    return { total, count: expenses.length, byProject, topVendor }
  } catch (error) {
    console.error('Error getting summary:', error)
    return null
  }
}

async function getTotalExpenses(userId) {
  try {
    const snapshot = await getDocs(collection(db, 'expenses'))
    let userTotal = 0
    let grandTotal = 0
    
    snapshot.forEach(doc => {
      const data = doc.data()
      if (!data.cancelled) {
        grandTotal += data.amount || 0
        if (data.telegramUser === userId) {
          userTotal += data.amount || 0
        }
      }
    })
    
    return { userTotal, grandTotal }
  } catch (error) {
    console.error('Error getting totals:', error)
    return { userTotal: 0, grandTotal: 0 }
  }
}

async function getProjectBalance(projectName) {
  try {
    const budgets = {
      'Maitama Heights': 15000000,
      'Jabi Lakeside': 25000000,
      'Garki Site': 12000000,
      'Katampe Hills Estate': 20000000,
      'Asokoro Residences': 18000000,
      'Wuse II Towers': 30000000
    }
    
    const budget = budgets[projectName] || 10000000
    
    const expensesSnapshot = await getDocs(collection(db, 'expenses'))
    let spent = 0
    
    expensesSnapshot.forEach(doc => {
      const data = doc.data()
      if (data.project === projectName && !data.cancelled) {
        spent += data.amount || 0
      }
    })
    
    return { budget, spent, remaining: budget - spent }
  } catch (error) {
    console.error('Error getting balance:', error)
    return null
  }
}

async function searchExpenses(searchTerm) {
  try {
    const expensesSnapshot = await getDocs(collection(db, 'expenses'))
    const results = []
    
    expensesSnapshot.forEach(doc => {
      const data = doc.data()
      const searchLower = searchTerm.toLowerCase()
      
      if ((data.vendor && data.vendor.toLowerCase().includes(searchLower)) ||
          (data.project && data.project.toLowerCase().includes(searchLower)) ||
          (data.category && data.category.toLowerCase().includes(searchLower))) {
        results.push({ id: doc.id, ...data })
      }
    })
    
    return results.slice(0, 5)
  } catch (error) {
    console.error('Error searching:', error)
    return []
  }
}

async function getUserExpenses() {
  try {
    const expensesSnapshot = await getDocs(collection(db, 'expenses'))
    const byUser = {}
    
    expensesSnapshot.forEach(doc => {
      const data = doc.data()
      if (data.telegramUser && !data.cancelled) {
        const user = data.telegramUser
        if (!byUser[user]) {
          byUser[user] = { total: 0, count: 0 }
        }
        byUser[user].total += data.amount || 0
        byUser[user].count++
      }
    })
    
    return byUser
  } catch (error) {
    console.error('Error getting user expenses:', error)
    return {}
  }
}

async function deleteExpense(expenseId, userId) {
  try {
    const expenseDoc = await getDoc(doc(db, 'expenses', expenseId))
    if (expenseDoc.exists()) {
      deletedExpenses[userId] = { id: expenseId, data: expenseDoc.data() }
    }
    
    await deleteDoc(doc(db, 'expenses', expenseId))
    return true
  } catch (error) {
    console.error('Error deleting:', error)
    return false
  }
}

async function undoDelete(userId) {
  try {
    const deleted = deletedExpenses[userId]
    if (!deleted) return null
    
    const docRef = await addDoc(collection(db, 'expenses'), {
      ...deleted.data,
      restoredAt: new Date().toISOString()
    })
    
    delete deletedExpenses[userId]
    return { ...deleted.data, id: docRef.id }
  } catch (error) {
    console.error('Error undoing:', error)
    return null
  }
}

async function cancelExpense(expenseId) {
  try {
    await updateDoc(doc(db, 'expenses', expenseId), {
      cancelled: true,
      cancelledAt: new Date().toISOString()
    })
    return true
  } catch (error) {
    console.error('Error cancelling:', error)
    return false
  }
}

async function editExpense(expenseId, updates) {
  try {
    await updateDoc(doc(db, 'expenses', expenseId), {
      ...updates,
      editedAt: new Date().toISOString()
    })
    return true
  } catch (error) {
    console.error('Error editing:', error)
    return false
  }
}

function parseExpense(text) {
  const amountMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:k|m|million|thousand)?/i)
  if (!amountMatch) return null
  
  let amount = parseFloat(amountMatch[1])
  
  if (text.toLowerCase().includes('k') && amount > 1000) {
    return { error: true, amount: amount * 1000, original: text }
  }
  
  if (text.toLowerCase().includes('m')) amount *= 1000000
  else if (text.toLowerCase().includes('k')) amount *= 1000
  
  let project = 'Not specified'
  const projectMap = {
    'maitama': 'Maitama Heights',
    'jabi': 'Jabi Lakeside',
    'garki': 'Garki Site',
    'katampe': 'Katampe Hills Estate',
    'asokoro': 'Asokoro Residences',
    'wuse': 'Wuse II Towers'
  }
  
  const lowerText = text.toLowerCase()
  for (const [key, value] of Object.entries(projectMap)) {
    if (lowerText.includes(key)) {
      project = value
      break
    }
  }
  
  const words = text.split(' ')
  let vendor = 'Not specified'
  for (let i = words.length - 1; i >= 0; i--) {
    const word = words[i]
    if (word[0] && word[0] === word[0].toUpperCase() && !word.match(/^\d/)) {
      vendor = word
      break
    }
  }
  
  let category = 'Other'
  const categoryMap = {
    'cement': 'Cement',
    'wood': 'Materials',
    'block': 'Blocks',
    'labour': 'Labour',
    'sand': 'Materials',
    'iron': 'Materials',
    'roofing': 'Roofing',
    'payment': 'Payment',
    'salary': 'Labour'
  }
  
  for (const [key, value] of Object.entries(categoryMap)) {
    if (lowerText.includes(key)) {
      category = value
      break
    }
  }
  
  const partialMatch = text.match(/paid?\s+(\d+(?:\.\d+)?)\s*(?:k|m)?\s+of\s+(\d+(?:\.\d+)?)\s*(?:k|m)?/i)
  if (partialMatch) {
    let paid = parseFloat(partialMatch[1])
    let total = parseFloat(partialMatch[2])
    
    if (text.toLowerCase().includes('m')) {
      paid *= 1000000
      total *= 1000000
    } else if (text.toLowerCase().includes('k')) {
      paid *= 1000
      total *= 1000
    }
    
    return { 
      amount: paid, 
      vendor, 
      category: 'Payment', 
      project,
      isPartial: true,
      totalOwed: total,
      balance: total - paid
    }
  }
  
  return { amount, vendor, category, project }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const message = body.message
    
    if (!message) return NextResponse.json({ ok: true })
    
    const chatId = message.chat.id
    const text = message.text || ''
    const userName = message.from?.first_name || 'User'
    const userId = message.from?.id || chatId
    
    console.log(`Message from ${userName}: ${text}`)
    
    // MENU command
    if (text === '/start' || text.toLowerCase() === 'menu') {
      await sendMessage(chatId, 
        '<b>PROPERTY TRACKER MENU</b>\n\n' +
        '<b>ADD EXPENSE:</b>\n' +
        '• 150k wood Jabi Abdullahi\n' +
        '• 2m cement Maitama Dangote\n' +
        '• paid 2m of 5m Dangote (Partial payment)\n\n' +
        '<b>VIEW & REPORTS:</b>\n' +
        '• list - Last 10 expenses\n' +
        '• summary - Todays summary\n' +
        '• summary week/month/year - Period summary\n' +
        '• balance Maitama - Project budget status\n' +
        '• search Dangote - Find vendor expenses\n' +
        '• who - Expenses by user\n' +
        '• total - Your total vs Grand total\n\n' +
        '<b>EDIT & DELETE:</b>\n' +
        '• edit 250k - Change last expense amount\n' +
        '• #3 300k - Change item #3 amount\n' +
        '• cancel - Cancel last expense (keeps record)\n' +
        '• #3 delete - Permanently delete item #3\n' +
        '• undo - Restore last deleted expense\n\n' +
        '<b>HELP:</b>\n' +
        '• help - Quick command guide\n' +
        '• menu - See this full menu\n\n' +
        '<b>PROJECTS:</b> Maitama, Jabi, Garki, Katampe, Asokoro, Wuse'
      )
      return NextResponse.json({ ok: true })
    }
    
    // HELP command
    if (text.toLowerCase() === 'help') {
      await sendMessage(chatId,
        '<b>QUICK HELP GUIDE</b>\n\n' +
        '<b>ADDING EXPENSES:</b>\n' +
        '• 200k cement Maitama - Basic expense\n' +
        '• 1.5m blocks Jabi Dangote - With vendor\n' +
        '• paid 2m of 5m - Partial payment\n\n' +
        '<b>VIEWING DATA:</b>\n' +
        '• list - See last 10 expenses\n' +
        '• summary - Todays summary\n' +
        '• summary week - Weekly summary\n' +
        '• summary month - Monthly summary\n' +
        '• balance Maitama - Project budget status\n' +
        '• search Dangote - Find vendor expenses\n' +
        '• who - See who spent what\n' +
        '• total - Your spending vs everyone\n\n' +
        '<b>EDITING:</b>\n' +
        '• edit 300k - Change last expense amount\n' +
        '• edit Dangote - Change last vendor\n' +
        '• #3 500k - Change item #3 from list\n\n' +
        '<b>REMOVING:</b>\n' +
        '• cancel - Cancel last expense (keeps record)\n' +
        '• #3 delete - Delete item #3 permanently\n' +
        '• undo - Restore last deleted item\n\n' +
        '<b>PROJECTS:</b>\n' +
        'Use any: Maitama, Jabi, Garki, Katampe, Asokoro, Wuse\n\n' +
        '<b>AMOUNTS:</b>\n' +
        '• 500 = N500\n' +
        '• 500k = N500,000\n' +
        '• 2.5m = N2,500,000\n\n' +
        'Type <b>menu</b> for complete options'
      )
      return NextResponse.json({ ok: true })
    }
    
    // TOTAL command
    if (text.toLowerCase() === 'total') {
      const totals = await getTotalExpenses(userName)
      
      const percentage = totals.grandTotal > 0 
        ? Math.round((totals.userTotal / totals.grandTotal) * 100) 
        : 0
      
      await sendMessage(chatId,
        `<b>EXPENSE TOTALS</b>\n\n` +
        `Your Total: <b>N${(totals.userTotal/1000000).toFixed(2)}M</b>\n` +
        `Grand Total: <b>N${(totals.grandTotal/1000000).toFixed(2)}M</b>\n` +
        `Your Share: <b>${percentage}%</b>\n\n` +
        `You have contributed ${percentage}% of all expenses`
      )
      return NextResponse.json({ ok: true })
    }
    
    // UNDO command
    if (text.toLowerCase() === 'undo') {
      const restored = await undoDelete(userId)
      if (restored) {
        await sendMessage(chatId,
          `<b>EXPENSE RESTORED</b>\n\n` +
          `Amount: N${(restored.amount/1000000).toFixed(2)}M\n` +
          `Vendor: ${restored.vendor}\n` +
          `Project: ${restored.project}`
        )
      } else {
        await sendMessage(chatId, 'Nothing to undo')
      }
      return NextResponse.json({ ok: true })
    }
    
    // SUMMARY command
    if (text.toLowerCase().startsWith('summary')) {
      const parts = text.toLowerCase().split(' ')
      const period = parts[1] || 'today'
      
      const summary = await getSummary(period)
      if (!summary) {
        await sendMessage(chatId, 'Could not get summary')
        return NextResponse.json({ ok: true })
      }
      
      let summaryText = `<b>SUMMARY - ${period.toUpperCase()}</b>\n\n`
      summaryText += `Total: <b>N${(summary.total/1000000).toFixed(2)}M</b>\n`
      summaryText += `Expenses: <b>${summary.count}</b>\n`
      
      if (summary.count > 0) {
        summaryText += `Average: <b>N${((summary.total/summary.count)/1000000).toFixed(2)}M</b>\n`
      }
      
      if (summary.topVendor) {
        summaryText += `Top Vendor: <b>${summary.topVendor[0]} (N${(summary.topVendor[1]/1000000).toFixed(1)}M)</b>\n`
      }
      
      if (Object.keys(summary.byProject).length > 0) {
        summaryText += '\n<b>By Project:</b>\n'
        Object.entries(summary.byProject)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .forEach(([project, amount]) => {
            summaryText += `${project}: N${(amount/1000000).toFixed(2)}M\n`
          })
      }
      
      await sendMessage(chatId, summaryText)
      return NextResponse.json({ ok: true })
    }
    
    // BALANCE command
    if (text.toLowerCase().startsWith('balance')) {
      const parts = text.split(' ')
      if (parts.length < 2) {
        await sendMessage(chatId, 'Format: balance Maitama')
        return NextResponse.json({ ok: true })
      }
      
      const projectMap = {
        'maitama': 'Maitama Heights',
        'jabi': 'Jabi Lakeside',
        'garki': 'Garki Site',
        'katampe': 'Katampe Hills Estate',
        'asokoro': 'Asokoro Residences',
        'wuse': 'Wuse II Towers'
      }
      
      const searchTerm = parts.slice(1).join(' ').toLowerCase()
      let projectName = null
      
      for (const [key, value] of Object.entries(projectMap)) {
        if (searchTerm.includes(key)) {
          projectName = value
          break
        }
      }
      
      if (!projectName) {
        await sendMessage(chatId, 'Project not found')
        return NextResponse.json({ ok: true })
      }
      
      const balance = await getProjectBalance(projectName)
      if (!balance) {
        await sendMessage(chatId, 'Could not get balance')
        return NextResponse.json({ ok: true })
      }
      
      const percentage = Math.round((balance.spent / balance.budget) * 100)
      const status = percentage >= 90 ? 'OVER BUDGET!' : percentage >= 70 ? 'CAUTION' : 'ON TRACK'
      
      let balanceText = `<b>${projectName.toUpperCase()}</b>\n\n`
      balanceText += `Budget: N${(balance.budget/1000000).toFixed(1)}M\n`
      balanceText += `Spent: N${(balance.spent/1000000).toFixed(1)}M (${percentage}%)\n`
      balanceText += `Remaining: N${(balance.remaining/1000000).toFixed(1)}M\n\n`
      balanceText += `Status: ${status}`
      
      if (percentage >= 90) {
        balanceText += '\n\n<b>WARNING: Budget nearly exhausted!</b>'
      }
      
      await sendMessage(chatId, balanceText)
      return NextResponse.json({ ok: true })
    }
    
    // SEARCH command
    if (text.toLowerCase().startsWith('search')) {
      const searchTerm = text.substring(6).trim()
      if (!searchTerm) {
        await sendMessage(chatId, 'Format: search Dangote')
        return NextResponse.json({ ok: true })
      }
      
      const results = await searchExpenses(searchTerm)
      if (results.length === 0) {
        await sendMessage(chatId, `No results for "${searchTerm}"`)
        return NextResponse.json({ ok: true })
      }
      
      let searchText = `<b>SEARCH: ${searchTerm}</b>\n\n`
      let total = 0
      
      results.forEach((exp, index) => {
        const date = new Date(exp.createdAt).toLocaleDateString()
        searchText += `${index + 1}. N${(exp.amount/1000000).toFixed(2)}M - ${exp.vendor}\n`
        searchText += `   ${exp.project} | ${date}\n\n`
        total += exp.amount
      })
      
      searchText += `<b>Total: N${(total/1000000).toFixed(2)}M</b>`
      
      await sendMessage(chatId, searchText)
      return NextResponse.json({ ok: true })
    }
    
    // WHO command
    if (text.toLowerCase() === 'who') {
      const userExpenses = await getUserExpenses()
      
      if (Object.keys(userExpenses).length === 0) {
        await sendMessage(chatId, 'No user expenses found')
        return NextResponse.json({ ok: true })
      }
      
      let whoText = '<b>EXPENSES BY USER</b>\n\n'
      
      Object.entries(userExpenses)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 5)
        .forEach(([user, data]) => {
          whoText += `<b>${user}:</b> N${(data.total/1000000).toFixed(2)}M (${data.count} expenses)\n`
        })
      
      await sendMessage(chatId, whoText)
      return NextResponse.json({ ok: true })
    }
    
    // LIST command
    if (text.toLowerCase() === 'list') {
      const expenses = await getRecentExpenses()
      if (expenses.length === 0) {
        await sendMessage(chatId, 'No expenses found\n\nAdd one: 150k wood Jabi Abdullahi')
        return NextResponse.json({ ok: true })
      }
      
      lastListByUser[userId] = expenses
      
      let listText = '<b>LAST 10 EXPENSES:</b>\n\n'
      expenses.forEach((exp, index) => {
        const date = new Date(exp.createdAt).toLocaleDateString()
        const cancelled = exp.cancelled ? '[CANCELLED] ' : ''
        listText += `<b>#${index + 1}</b> ${cancelled}N${(exp.amount/1000000).toFixed(2)}M - ${exp.vendor || 'Unknown'}\n`
        listText += `    ${exp.project || 'No project'} | ${date}\n\n`
      })
      
      listText += '<b>Total:</b> N' + 
        (expenses.filter(e => !e.cancelled).reduce((sum, exp) => sum + exp.amount, 0) / 1000000).toFixed(2) + 
        'M\n\n'
      listText += '<i>Edit: #3 250k | Delete: #3 delete</i>'
      
      await sendMessage(chatId, listText)
      return NextResponse.json({ ok: true })
    }
    
    // Handle numbered edits (#3 200k or #3 delete)
    const numberEditMatch = text.match(/^#(\d+)\s+(.+)$/i)
    if (numberEditMatch) {
      const itemNumber = parseInt(numberEditMatch[1])
      const editCommand = numberEditMatch[2].trim()
      
      const cachedList = lastListByUser[userId]
      if (!cachedList || cachedList.length < itemNumber) {
        await sendMessage(chatId, 'Type <b>list</b> first')
        return NextResponse.json({ ok: true })
      }
      
      const targetExpense = cachedList[itemNumber - 1]
      
      if (editCommand.toLowerCase() === 'delete') {
        const deleted = await deleteExpense(targetExpense.id, userId)
        if (deleted) {
          await sendMessage(chatId, `<b>DELETED #${itemNumber}</b>\n\nType <b>undo</b> to restore`)
        }
        return NextResponse.json({ ok: true })
      }
      
      const amountMatch = editCommand.match(/(\d+(?:\.\d+)?)\s*(?:k|m)?/i)
      if (amountMatch) {
        let newAmount = parseFloat(amountMatch[1])
        if (editCommand.toLowerCase().includes('m')) newAmount *= 1000000
        else if (editCommand.toLowerCase().includes('k')) newAmount *= 1000
        
        const edited = await editExpense(targetExpense.id, { amount: newAmount })
        if (edited) {
          await sendMessage(chatId, `<b>UPDATED #${itemNumber}</b>\n\nNew: N${(newAmount/1000000).toFixed(2)}M`)
        }
        return NextResponse.json({ ok: true })
      }
      
      await sendMessage(chatId, 'Format: #3 250k or #3 delete')
      return NextResponse.json({ ok: true })
    }
    
    // CANCEL command
    if (text.toLowerCase() === 'cancel') {
      const lastId = lastExpenseByUser[userId]
      if (lastId) {
        const cancelled = await cancelExpense(lastId)
        if (cancelled) {
          await sendMessage(chatId, '<b>EXPENSE CANCELLED</b>\n\n<i>Record kept but marked as cancelled</i>')
          delete lastExpenseByUser[userId]
        }
      } else {
        await sendMessage(chatId, 'No recent expense to cancel')
      }
      return NextResponse.json({ ok: true })
    }
    
    // EDIT command
    if (text.toLowerCase().startsWith('edit ')) {
      const lastId = lastExpenseByUser[userId]
      if (!lastId) {
        await sendMessage(chatId, 'No recent expense to edit')
        return NextResponse.json({ ok: true })
      }
      
      const editText = text.substring(5).trim()
      const updates = {}
      
      const amountMatch = editText.match(/(\d+(?:\.\d+)?)\s*(?:k|m)?/i)
      if (amountMatch) {
        let newAmount = parseFloat(amountMatch[1])
        if (editText.toLowerCase().includes('m')) newAmount *= 1000000
        else if (editText.toLowerCase().includes('k')) newAmount *= 1000
        updates.amount = newAmount
      }
      
      const projectMap = {
        'maitama': 'Maitama Heights',
        'jabi': 'Jabi Lakeside',
        'garki': 'Garki Site',
        'katampe': 'Katampe Hills Estate',
        'asokoro': 'Asokoro Residences',
        'wuse': 'Wuse II Towers'
      }
      
      for (const [key, value] of Object.entries(projectMap)) {
        if (editText.toLowerCase().includes(key)) {
          updates.project = value
          break
        }
      }
      
      if (!updates.amount && !updates.project && editText.length > 0) {
        updates.vendor = editText
      }
      
      if (Object.keys(updates).length > 0) {
        const edited = await editExpense(lastId, updates)
        if (edited) {
          await sendMessage(chatId, '<b>UPDATED</b>')
        }
      }
      return NextResponse.json({ ok: true })
    }
    
    // Parse new expense
    let parsed = parseExpense(text)
    
    if (!parsed) {
      await sendMessage(chatId, 'Not understood\n\nExample: <b>200k cement Maitama</b>\n\nType <b>help</b> or <b>menu</b>')
      return NextResponse.json({ ok: true })
    }
    
    // Check for error/confirmation
    if (text.toLowerCase() === 'yes' && lastExpenseByUser[userId + '_pending']) {
      parsed = lastExpenseByUser[userId + '_pending']
      delete lastExpenseByUser[userId + '_pending']
    } else if (text.toLowerCase() === 'no' && lastExpenseByUser[userId + '_pending']) {
      delete lastExpenseByUser[userId + '_pending']
      await sendMessage(chatId, 'Cancelled')
      return NextResponse.json({ ok: true })
    } else if (parsed.error) {
      lastExpenseByUser[userId + '_pending'] = parsed
      await sendMessage(chatId, 
        `<b>LARGE AMOUNT!</b>\n\n` +
        `Amount: N${(parsed.amount/1000000).toFixed(0)}M\n\n` +
        `Reply: <b>yes</b> or <b>no</b>`
      )
      return NextResponse.json({ ok: true })
    }
    
    // Save expense
    const expense = {
      ...parsed,
      source: 'telegram',
      telegramUser: userName,
      originalText: text,
      createdAt: new Date().toISOString()
    }
    
    const docRef = await addDoc(collection(db, 'expenses'), expense)
    lastExpenseByUser[userId] = docRef.id
    
    let responseText = `<b>SAVED!</b>\n\n` +
      `Amount: <b>N${(parsed.amount/1000000).toFixed(3)}M</b>\n` +
      `Vendor: <b>${parsed.vendor}</b>\n` +
      `Project: <b>${parsed.project}</b>\n`
    
    if (parsed.isPartial) {
      responseText += `\n<b>PARTIAL PAYMENT</b>\n` +
        `Paid: N${(parsed.amount/1000000).toFixed(2)}M\n` +
        `Total Owed: N${(parsed.totalOwed/1000000).toFixed(2)}M\n` +
        `Balance: N${(parsed.balance/1000000).toFixed(2)}M`
    }
    
    responseText += '\n\n<i>Type list, summary, or menu</i>'
    
    await sendMessage(chatId, responseText)
    
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Bot error:', error)
    return NextResponse.json({ ok: true })
  }
}
