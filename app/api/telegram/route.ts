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

function formatDate(date) {
 return new Date(date).toLocaleDateString('en-GB', { 
   day: '2-digit', 
   month: '2-digit', 
   year: 'numeric' 
 })
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
     sessions.set(userId, { 
       lastExpenseId: null, 
       expenseCache: [], 
       projectCache: [],
       vendorCache: [],
       alerts: []
     })
   }
   const session = sessions.get(userId)
   
   const cmd = text.toLowerCase()
   
   // COMPREHENSIVE MENU
   if (cmd === '/start' || cmd === 'menu' || cmd === 'help') {
     await sendMessage(chatId,
       '<b> PROPERTY TRACKER - COMPLETE GUIDE</b>\n\n' +
       
       '<b> EXPENSE MANAGEMENT</b>\n' +
       ' <b>Add expense:</b> <code>500k cement Maitama Dangote</code>\n' +
       '  Example: "300k blocks Jabi BUA" adds N300,000 blocks expense\n' +
       ' <b>List expenses:</b> <code>list</code> - Shows last 10 expenses with numbers\n' +
       ' <b>Edit expense:</b> <code>#3 800k</code> - Changes expense #3 to N800,000\n' +
       ' <b>Delete expense:</b> <code>#3 delete</code> - Removes expense #3\n' +
       ' <b>Cancel last:</b> <code>cancel</code> - Deletes your last added expense\n\n' +
       
       '<b> PROJECT MANAGEMENT</b>\n' +
       ' <b>View projects:</b> <code>projects</code> - Lists all projects with numbers\n' +
       ' <b>Add project:</b> <code>addproject Marina 35m Victoria Island</code>\n' +
       '  Example: Creates "Marina" project with N35M budget\n' +
       ' <b>Edit budget:</b> <code>project#1 40m</code> - Updates project #1 to N40M\n' +
       ' <b>Delete project:</b> <code>project#1 delete</code> - Removes project #1\n' +
       ' <b>Check balance:</b> <code>balance Maitama</code> - Shows budget vs spent\n\n' +
       
       '<b> VENDOR MANAGEMENT</b>\n' +
       ' <b>View vendors:</b> <code>vendors</code> - Lists all vendors with numbers\n' +
       ' <b>Add vendor:</b> <code>addvendor Dangote Supplier 08012345678</code>\n' +
       ' <b>Edit vendor:</b> <code>vendor#1 08087654321</code> - Updates contact\n' +
       ' <b>Delete vendor:</b> <code>vendor#1 delete</code> - Removes vendor #1\n' +
       ' <b>Vendor summary:</b> <code>vendor Dangote</code> - Shows vendor stats\n\n' +
       
       '<b> ANALYTICS & REPORTS</b>\n' +
       ' <b>Full summary:</b> <code>summary</code> - Overall totals and stats\n' +
       ' <b>Weekly report:</b> <code>report week</code> - Last 7 days analysis\n' +
       ' <b>Monthly report:</b> <code>report month</code> - Last 30 days analysis\n' +
       ' <b>Search expenses:</b> <code>search cement</code> - Find by keyword\n' +
       ' <b>Top vendors:</b> <code>top vendors</code> - Top 5 by spending\n' +
       ' <b>Top categories:</b> <code>top categories</code> - Most spent areas\n' +
       ' <b>Project report:</b> <code>report Maitama</code> - Specific project\n\n' +
       
       '<b> ALERTS & EXPORTS</b>\n' +
       ' <b>Set alert:</b> <code>setalert Maitama 80</code> - Alert at 80% budget\n' +
       ' <b>View alerts:</b> <code>alerts</code> - Shows active alerts\n' +
       ' <b>Export data:</b> <code>export</code> - Get Excel download link\n' +
       ' <b>Quick stats:</b> <code>stats</code> - Dashboard overview\n\n' +
       
       '<b> TIPS:</b>\n' +
       ' Always use "list", "projects", or "vendors" first to see numbers\n' +
       ' Use # with numbers for editing/deleting (e.g., #1, #2)\n' +
       ' Amounts: 500k = N500,000 | 2m = N2,000,000\n' +
       ' Categories: cement, blocks, sand, labour, transport, etc.\n\n' +
       
       'Type any command to start! Need help? Just type <code>menu</code>'
     )
     return NextResponse.json({ ok: true })
   }
   
   // SIMPLE HELP
   if (cmd === 'simple' || cmd === 'help2') {
     await sendMessage(chatId,
       '<b> QUICK COMMANDS</b>\n\n' +
       ' <b>Expenses:</b>\n' +
       ' Add: <code>500k cement Maitama</code>\n' +
       ' View: <code>list</code>\n' +
       ' Delete: <code>#1 delete</code>\n\n' +
       ' <b>Projects:</b>\n' +
       ' View: <code>projects</code>\n' +
       ' Add: <code>addproject Name 20m Location</code>\n' +
       ' Balance: <code>balance Maitama</code>\n\n' +
       ' <b>Reports:</b>\n' +
       ' Summary: <code>summary</code>\n' +
       ' Weekly: <code>report week</code>\n' +
       ' Search: <code>search cement</code>\n\n' +
       'Full guide: type <code>menu</code>'
     )
     return NextResponse.json({ ok: true })
   }
   
   // LIST EXPENSES
   if (cmd === 'list') {
     const expenses = await getDocs(
       query(collection(db, 'expenses'), orderBy('createdAt', 'desc'), limit(10))
     )
     
     if (expenses.empty) {
       await sendMessage(chatId, 
         ' No expenses recorded yet.\n\n' +
         'Add your first expense:\n' +
         '<code>500k cement Maitama Dangote</code>'
       )
       return NextResponse.json({ ok: true })
     }
     
     session.expenseCache = []
     let text = '<b> RECENT EXPENSES</b>\n\n'
     let total = 0
     let index = 1
     
     expenses.forEach(doc => {
       const data = doc.data()
       session.expenseCache.push({ id: doc.id, ...data })
       
       text += `<b>#${index}</b> ${formatMoney(data.amount)}\n`
       text += ` Project: ${data.project || 'Unassigned'}\n`
       text += ` Vendor: ${data.vendor || 'Unknown'}\n`
       text += ` Category: ${data.category || 'Other'}\n`
       text += ` Date: ${formatDate(data.createdAt)}\n\n`
       
       total += data.amount || 0
       index++
     })
     
     text += `<b> TOTAL: ${formatMoney(total)}</b>\n\n`
     text += 'Edit: <code>#1 800k</code>\n'
     text += 'Delete: <code>#1 delete</code>'
     
     await sendMessage(chatId, text)
     return NextResponse.json({ ok: true })
   }
   
   // PROJECTS LIST
   if (cmd === 'projects') {
     const projects = await getDocs(collection(db, 'projects'))
     
     if (projects.empty) {
       await sendMessage(chatId, 
         ' No projects found.\n\n' +
         'Add your first project:\n' +
         '<code>addproject ProjectName 10m Location</code>'
       )
       return NextResponse.json({ ok: true })
     }
     
     session.projectCache = []
     let text = '<b> ALL PROJECTS</b>\n\n'
     let index = 1
     let totalBudget = 0
     
     for (const doc of projects.docs) {
       const data = doc.data()
       const expenses = await getDocs(
         query(collection(db, 'expenses'), where('project', '==', data.name))
       )
       let spent = 0
       expenses.forEach(exp => spent += exp.data().amount || 0)
       
       session.projectCache.push({ id: doc.id, ...data })
       const progress = data.budget ? (spent/data.budget * 100).toFixed(1) : 0
       const status = progress >= 90 ? '' : progress >= 70 ? '' : ''
       
       text += `<b>#${index}</b> ${data.name} ${status}\n`
       text += ` Location: ${data.location || 'Not specified'}\n`
       text += ` Budget: ${formatMoney(data.budget)}\n`
       text += ` Spent: ${formatMoney(spent)} (${progress}%)\n`
       text += ` Remaining: ${formatMoney(data.budget - spent)}\n`
       text += ` Status: ${data.status || 'Active'}\n\n`
       
       totalBudget += data.budget || 0
       index++
     }
     
     text += `<b> TOTAL PORTFOLIO: ${formatMoney(totalBudget)}</b>\n\n`
     text += 'Edit: <code>project#1 25m</code>\n'
     text += 'Delete: <code>project#1 delete</code>'
     
     await sendMessage(chatId, text)
     return NextResponse.json({ ok: true })
   }
   
   // VENDORS LIST
   if (cmd === 'vendors') {
     const vendors = await getDocs(collection(db, 'vendors'))
     
     if (vendors.empty) {
       await sendMessage(chatId, 
         ' No vendors found.\n\n' +
         'Add your first vendor:\n' +
         '<code>addvendor Name Type Contact</code>\n' +
         'Example: <code>addvendor Dangote Supplier 08012345678</code>'
       )
       return NextResponse.json({ ok: true })
     }
     
     session.vendorCache = []
     let text = '<b> ALL VENDORS</b>\n\n'
     let index = 1
     
     for (const doc of vendors.docs) {
       const data = doc.data()
       const expenses = await getDocs(
         query(collection(db, 'expenses'), where('vendor', '==', data.name))
       )
       let totalSpent = 0
       expenses.forEach(exp => totalSpent += exp.data().amount || 0)
       
       session.vendorCache.push({ id: doc.id, ...data })
       
       text += `<b>#${index}</b> ${data.name}\n`
       text += ` Type: ${data.type || 'General'}\n`
       text += ` Contact: ${data.contact || 'Not provided'}\n`
       text += ` Total spent: ${formatMoney(totalSpent)}\n`
       text += ` Transactions: ${expenses.size}\n\n`
       index++
     }
     
     text += 'Edit: <code>vendor#1 08087654321</code>\n'
     text += 'Delete: <code>vendor#1 delete</code>'
     
     await sendMessage(chatId, text)
     return NextResponse.json({ ok: true })
   }
   
   // SUMMARY
   if (cmd === 'summary') {
     const expenses = await getDocs(collection(db, 'expenses'))
     const projects = await getDocs(collection(db, 'projects'))
     
     let totalSpent = 0
     let expenseCount = 0
     const byProject = {}
     const byCategory = {}
     const byVendor = {}
     
     expenses.forEach(doc => {
       const data = doc.data()
       totalSpent += data.amount || 0
       expenseCount++
       
       byProject[data.project || 'Unassigned'] = (byProject[data.project || 'Unassigned'] || 0) + data.amount
       byCategory[data.category || 'Other'] = (byCategory[data.category || 'Other'] || 0) + data.amount
       byVendor[data.vendor || 'Unknown'] = (byVendor[data.vendor || 'Unknown'] || 0) + data.amount
     })
     
     let totalBudget = 0
     projects.forEach(doc => totalBudget += doc.data().budget || 0)
     
     let text = '<b> COMPLETE SUMMARY</b>\n\n'
     text += ` Total Spent: ${formatMoney(totalSpent)}\n`
     text += ` Total Budget: ${formatMoney(totalBudget)}\n`
     text += ` Budget Used: ${totalBudget ? (totalSpent/totalBudget*100).toFixed(1) : 0}%\n`
     text += ` Total Expenses: ${expenseCount}\n`
     text += ` Average Expense: ${formatMoney(expenseCount ? totalSpent/expenseCount : 0)}\n\n`
     
     text += '<b>Top Projects by Spending:</b>\n'
     Object.entries(byProject)
       .sort((a, b) => b[1] - a[1])
       .slice(0, 3)
       .forEach(([proj, amt]) => {
         text += ` ${proj}: ${formatMoney(amt)}\n`
       })
     
     text += '\n<b>Top Categories:</b>\n'
     Object.entries(byCategory)
       .sort((a, b) => b[1] - a[1])
       .slice(0, 3)
       .forEach(([cat, amt]) => {
         text += ` ${cat}: ${formatMoney(amt)}\n`
       })
     
     text += '\n<b>Top Vendors:</b>\n'
     Object.entries(byVendor)
       .sort((a, b) => b[1] - a[1])
       .slice(0, 3)
       .forEach(([vendor, amt]) => {
         text += ` ${vendor}: ${formatMoney(amt)}\n`
       })
     
     text += '\nFor detailed reports: <code>report week</code> or <code>report month</code>'
     
     await sendMessage(chatId, text)
     return NextResponse.json({ ok: true })
   }
   
   // ADD PROJECT
   if (cmd.startsWith('addproject ')) {
     const parts = text.substring(11).split(' ')
     if (parts.length < 2) {
       await sendMessage(chatId, 
         ' Invalid format\n\n' +
         'Correct format: <code>addproject Name Budget Location</code>\n' +
         'Example: <code>addproject Marina 35m Victoria Island</code>'
       )
       return NextResponse.json({ ok: true })
     }
     
     const name = parts[0]
     const budget = parseAmount(parts[1])
     const location = parts.slice(2).join(' ') || 'Abuja'
     
     if (!budget) {
       await sendMessage(chatId, ' Invalid budget amount. Use format like 10m or 5000k')
       return NextResponse.json({ ok: true })
     }
     
     await addDoc(collection(db, 'projects'), {
       name,
       budget,
       location,
       status: 'active',
       createdAt: new Date().toISOString(),
       createdBy: userName
     })
     
     await sendMessage(chatId, 
       ` <b>PROJECT CREATED SUCCESSFULLY!</b>\n\n` +
       ` Name: ${name}\n` +
       ` Budget: ${formatMoney(budget)}\n` +
       ` Location: ${location}\n` +
       ` Status: Active\n` +
       ` Created by: ${userName}\n\n` +
       `View all projects: <code>projects</code>`
     )
     return NextResponse.json({ ok: true })
   }
   
   // ADD VENDOR
   if (cmd.startsWith('addvendor ')) {
     const parts = text.substring(10).split(' ')
     if (parts.length < 2) {
       await sendMessage(chatId, 
         ' Invalid format\n\n' +
         'Correct format: <code>addvendor Name Type Contact</code>\n' +
         'Example: <code>addvendor BUA Supplier 08098765432</code>'
       )
       return NextResponse.json({ ok: true })
     }
     
     const name = parts[0]
     const type = parts[1] || 'Supplier'
     const contact = parts[2] || ''
     
     await addDoc(collection(db, 'vendors'), {
       name,
       type,
       contact,
       createdAt: new Date().toISOString(),
       createdBy: userName
     })
     
     await sendMessage(chatId, 
       ` <b>VENDOR ADDED SUCCESSFULLY!</b>\n\n` +
       ` Name: ${name}\n` +
       ` Type: ${type}\n` +
       ` Contact: ${contact || 'Not provided'}\n\n` +
       `View all vendors: <code>vendors</code>`
     )
     return NextResponse.json({ ok: true })
   }
   
   // PROJECT COMMANDS (#1 delete, #1 20m)
   const projectMatch = cmd.match(/^project#(\d+)\s*(.*)/)
   if (projectMatch) {
     const num = parseInt(projectMatch[1]) - 1
     const action = projectMatch[2].trim()
     
     if (!session.projectCache[num]) {
       await sendMessage(chatId, 
         ' Invalid project number.\n\n' +
         'Type <code>projects</code> first to see the list with numbers.'
       )
       return NextResponse.json({ ok: true })
     }
     
     const target = session.projectCache[num]
     
     if (action === 'delete') {
       await deleteDoc(doc(db, 'projects', target.id))
       await sendMessage(chatId, 
         ` Project "${target.name}" deleted successfully!\n\n` +
         `View remaining projects: <code>projects</code>`
       )
     } else {
       const budget = parseAmount(action)
       if (budget) {
         await updateDoc(doc(db, 'projects', target.id), { 
           budget,
           updatedAt: new Date().toISOString()
         })
         await sendMessage(chatId, 
           ` Updated "${target.name}" budget\n\n` +
           `Old budget: ${formatMoney(target.budget)}\n` +
           `New budget: ${formatMoney(budget)}\n\n` +
           `View details: <code>balance ${target.name}</code>`
         )
       } else {
         await sendMessage(chatId, 
           ' Invalid command\n\n' +
           `To update budget: <code>project#${num+1} 20m</code>\n` +
           `To delete: <code>project#${num+1} delete</code>`
         )
       }
     }
     return NextResponse.json({ ok: true })
   }
   
   // VENDOR COMMANDS (#1 delete, #1 contact)
   const vendorMatch = cmd.match(/^vendor#(\d+)\s*(.*)/)
   if (vendorMatch) {
     const num = parseInt(vendorMatch[1]) - 1
     const action = vendorMatch[2].trim()
     
     if (!session.vendorCache[num]) {
       await sendMessage(chatId, 
         ' Invalid vendor number.\n\n' +
         'Type <code>vendors</code> first to see the list with numbers.'
       )
       return NextResponse.json({ ok: true })
     }
     
     const target = session.vendorCache[num]
     
     if (action === 'delete') {
       await deleteDoc(doc(db, 'vendors', target.id))
       await sendMessage(chatId, 
         ` Vendor "${target.name}" deleted successfully!\n\n` +
         `View remaining vendors: <code>vendors</code>`
       )
     } else if (action) {
       await updateDoc(doc(db, 'vendors', target.id), { 
         contact: action,
         updatedAt: new Date().toISOString()
       })
       await sendMessage(chatId, 
         ` Updated "${target.name}" contact to ${action}\n\n` +
         `View all vendors: <code>vendors</code>`
       )
     }
     return NextResponse.json({ ok: true })
   }
   
   // VENDOR SUMMARY
   if (cmd.startsWith('vendor ') && !cmd.includes('#')) {
     const vendorName = text.substring(7)
     const expenses = await getDocs(collection(db, 'expenses'))
     
     let vendorExpenses = []
     expenses.forEach(doc => {
       const data = doc.data()
       if (data.vendor?.toLowerCase().includes(vendorName.toLowerCase())) {
         vendorExpenses.push(data)
       }
     })
     
     if (vendorExpenses.length === 0) {
       await sendMessage(chatId, `No expenses found for vendor "${vendorName}"`)
       return NextResponse.json({ ok: true })
     }
     
     const total = vendorExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
     const byProject = {}
     const byCategory = {}
     
     vendorExpenses.forEach(e => {
       byProject[e.project || 'Unassigned'] = (byProject[e.project || 'Unassigned'] || 0) + e.amount
       byCategory[e.category || 'Other'] = (byCategory[e.category || 'Other'] || 0) + e.amount
     })
     
     let text = `<b> VENDOR ANALYSIS: ${vendorName.toUpperCase()}</b>\n\n`
     text += ` Total spent: ${formatMoney(total)}\n`
     text += ` Transactions: ${vendorExpenses.length}\n`
     text += ` Average: ${formatMoney(total/vendorExpenses.length)}\n\n`
     
     text += '<b>By Project:</b>\n'
     Object.entries(byProject)
       .sort((a, b) => b[1] - a[1])
       .forEach(([proj, amt]) => {
         text += ` ${proj}: ${formatMoney(amt)}\n`
       })
     
     text += '\n<b>By Category:</b>\n'
     Object.entries(byCategory)
       .sort((a, b) => b[1] - a[1])
       .forEach(([cat, amt]) => {
         text += ` ${cat}: ${formatMoney(amt)}\n`
       })
     
     await sendMessage(chatId, text)
     return NextResponse.json({ ok: true })
   }
   
   // EXPENSE COMMANDS (#1 delete, #1 500k)
   const expenseMatch = cmd.match(/^#(\d+)\s*(.*)/)
   if (expenseMatch) {
     const num = parseInt(expenseMatch[1]) - 1
     const action = expenseMatch[2].trim()
     
     if (!session.expenseCache[num]) {
       await sendMessage(chatId, 
         ' Invalid expense number.\n\n' +
         'Type <code>list</code> first to see expenses with numbers.'
       )
       return NextResponse.json({ ok: true })
     }
     
     const target = session.expenseCache[num]
     
     if (action === 'delete') {
       await deleteDoc(doc(db, 'expenses', target.id))
       await sendMessage(chatId, 
         ` Expense deleted successfully!\n\n` +
         `Amount: ${formatMoney(target.amount)}\n` +
         `Project: ${target.project}\n\n` +
         `View remaining: <code>list</code>`
       )
     } else {
       const amount = parseAmount(action)
       if (amount) {
         await updateDoc(doc(db, 'expenses', target.id), { 
           amount,
           updatedAt: new Date().toISOString()
         })
         await sendMessage(chatId, 
           ` Expense updated!\n\n` +
           `Old amount: ${formatMoney(target.amount)}\n` +
           `New amount: ${formatMoney(amount)}\n\n` +
           `View all: <code>list</code>`
         )
       }
     }
     return NextResponse.json({ ok: true })
   }
   
   // BALANCE CHECK
   if (cmd.startsWith('balance')) {
     const projectName = text.substring(7).trim()
     
     if (!projectName) {
       await sendMessage(chatId, 
         ' Please specify a project.\n\n' +
         'Example: <code>balance Maitama</code>'
       )
       return NextResponse.json({ ok: true })
     }
     
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
       await sendMessage(chatId, 
         ` Project "${projectName}" not found.\n\n` +
         `View all projects: <code>projects</code>`
       )
       return NextResponse.json({ ok: true })
     }
     
     let spent = 0
     let expenseList = []
     expenses.forEach(doc => {
       const data = doc.data()
       if (data.project === project.name) {
         spent += data.amount || 0
         expenseList.push(data)
       }
     })
     
     const remaining = project.budget - spent
     const percentage = project.budget ? (spent/project.budget * 100) : 0
     const status = percentage >= 90 ? ' CRITICAL' : percentage >= 70 ? ' WARNING' : ' ON TRACK'
     
     let text = `<b> ${project.name.toUpperCase()} - BUDGET ANALYSIS</b>\n\n`
     text += ` Status: ${status}\n`
     text += ` Budget: ${formatMoney(project.budget)}\n`
     text += ` Spent: ${formatMoney(spent)} (${percentage.toFixed(1)}%)\n`
     text += ` Remaining: ${formatMoney(remaining)}\n`
     text += ` Transactions: ${expenseList.length}\n\n`
     
     if (percentage >= 90) {
       text += ' <b>ALERT: Budget nearly exhausted!</b>\n'
     } else if (percentage >= 70) {
       text += ' <b>WARNING: Approaching budget limit</b>\n'
     }
     
     if (expenseList.length > 0) {
       text += '\n<b>Recent expenses:</b>\n'
       expenseList.slice(0, 3).forEach(exp => {
         text += ` ${formatMoney(exp.amount)} - ${exp.vendor || 'Unknown'} (${exp.category || 'Other'})\n`
       })
     }
     
     await sendMessage(chatId, text)
     return NextResponse.json({ ok: true })
   }
   
   // CANCEL/UNDO LAST
   if (cmd === 'cancel' || cmd === 'undo') {
     if (session.lastExpenseId) {
       await deleteDoc(doc(db, 'expenses', session.lastExpenseId))
       await sendMessage(chatId, ' Your last expense has been deleted.')
       session.lastExpenseId = null
     } else {
       await sendMessage(chatId, ' No recent expense to cancel.')
     }
     return NextResponse.json({ ok: true })
   }
   
   // SEARCH
   if (cmd.startsWith('search ')) {
     const searchTerm = text.substring(7).toLowerCase()
     
     if (!searchTerm) {
       await sendMessage(chatId, 
         ' Please provide a search term.\n\n' +
         'Example: <code>search cement</code>'
       )
       return NextResponse.json({ ok: true })
     }
     
     const expenses = await getDocs(collection(db, 'expenses'))
     let results = []
     
     expenses.forEach(doc => {
       const data = doc.data()
       const searchIn = `${data.vendor} ${data.project} ${data.category} ${data.description}`.toLowerCase()
       if (searchIn.includes(searchTerm)) {
         results.push(data)
       }
     })
     
     if (results.length === 0) {
       await sendMessage(chatId, `No expenses found matching "${searchTerm}"`)
       return NextResponse.json({ ok: true })
     }
     
     const total = results.reduce((sum, e) => sum + (e.amount || 0), 0)
     
     let text = `<b> SEARCH RESULTS: "${searchTerm}"</b>\n\n`
     text += `Found ${results.length} expenses\n`
     text += `Total amount: ${formatMoney(total)}\n\n`
     
     results.slice(0, 10).forEach(exp => {
       text += ` ${formatMoney(exp.amount)} - ${exp.vendor || 'Unknown'}\n`
       text += `  ${exp.project || 'Unassigned'} | ${exp.category || 'Other'}\n`
       text += `  ${formatDate(exp.createdAt)}\n\n`
     })
     
     if (results.length > 10) {
       text += `\n... and ${results.length - 10} more results`
     }
     
     await sendMessage(chatId, text)
     return NextResponse.json({ ok: true })
   }
   
   // REPORTS (week, month, project)
   if (cmd.startsWith('report')) {
     const period = text.substring(6).trim()
     const now = new Date()
     let startDate = new Date()
     let reportTitle = ''
     
     if (period === 'week') {
       startDate.setDate(now.getDate() - 7)
       reportTitle = 'WEEKLY REPORT (Last 7 Days)'
     } else if (period === 'month') {
       startDate.setDate(now.getDate() - 30)
       reportTitle = 'MONTHLY REPORT (Last 30 Days)'
     } else {
       // Project report
       const expenses = await getDocs(collection(db, 'expenses'))
       let projectExpenses = []
       
       expenses.forEach(doc => {
         const data = doc.data()
         if (data.project?.toLowerCase().includes(period.toLowerCase())) {
           projectExpenses.push(data)
         }
       })
       
       if (projectExpenses.length === 0) {
         await sendMessage(chatId, 
           `No expenses found for project "${period}".\n\n` +
           `Try: <code>report week</code> or <code>report month</code>`
         )
         return NextResponse.json({ ok: true })
       }
       
       const total = projectExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
       const byCategory = {}
       const byVendor = {}
       
       projectExpenses.forEach(e => {
         byCategory[e.category || 'Other'] = (byCategory[e.category || 'Other'] || 0) + e.amount
         byVendor[e.vendor || 'Unknown'] = (byVendor[e.vendor || 'Unknown'] || 0) + e.amount
       })
       
       let text = `<b> PROJECT REPORT: ${period.toUpperCase()}</b>\n\n`
       text += ` Total Spent: ${formatMoney(total)}\n`
       text += ` Transactions: ${projectExpenses.length}\n`
       text += ` Average: ${formatMoney(total/projectExpenses.length)}\n\n`
       
       text += '<b>By Category:</b>\n'
       Object.entries(byCategory)
         .sort((a, b) => b[1] - a[1])
         .forEach(([cat, amt]) => {
           const pct = (amt/total*100).toFixed(1)
           text += ` ${cat}: ${formatMoney(amt)} (${pct}%)\n`
         })
       
       text += '\n<b>By Vendor:</b>\n'
       Object.entries(byVendor)
         .sort((a, b) => b[1] - a[1])
         .slice(0, 5)
         .forEach(([vendor, amt]) => {
           const pct = (amt/total*100).toFixed(1)
           text += ` ${vendor}: ${formatMoney(amt)} (${pct}%)\n`
         })
       
       await sendMessage(chatId, text)
       return NextResponse.json({ ok: true })
     }
     
     // Time-based report
     const expenses = await getDocs(collection(db, 'expenses'))
     let filteredExpenses = []
     
     expenses.forEach(doc => {
       const data = doc.data()
       if (new Date(data.createdAt) >= startDate) {
         filteredExpenses.push(data)
       }
     })
     
     if (filteredExpenses.length === 0) {
       await sendMessage(chatId, `No expenses found for the ${period} period.`)
       return NextResponse.json({ ok: true })
     }
     
     const total = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
     const byProject = {}
     const byCategory = {}
     const byVendor = {}
     const dailyTotals = {}
     
     filteredExpenses.forEach(e => {
       byProject[e.project || 'Unassigned'] = (byProject[e.project || 'Unassigned'] || 0) + e.amount
       byCategory[e.category || 'Other'] = (byCategory[e.category || 'Other'] || 0) + e.amount
       byVendor[e.vendor || 'Unknown'] = (byVendor[e.vendor || 'Unknown'] || 0) + e.amount
       
       const day = formatDate(e.createdAt)
       dailyTotals[day] = (dailyTotals[day] || 0) + e.amount
     })
     
     const dailyAverage = total / (period === 'week' ? 7 : 30)
     
     let text = `<b> ${reportTitle}</b>\n\n`
     text += ` Total Spent: ${formatMoney(total)}\n`
     text += ` Transactions: ${filteredExpenses.length}\n`
     text += ` Daily Average: ${formatMoney(dailyAverage)}\n`
     text += ` Per Transaction: ${formatMoney(total/filteredExpenses.length)}\n\n`
     
     text += '<b>Top Projects:</b>\n'
     Object.entries(byProject)
       .sort((a, b) => b[1] - a[1])
       .slice(0, 3)
       .forEach(([proj, amt]) => {
         text += ` ${proj}: ${formatMoney(amt)}\n`
       })
     
     text += '\n<b>Top Categories:</b>\n'
     Object.entries(byCategory)
       .sort((a, b) => b[1] - a[1])
       .slice(0, 3)
       .forEach(([cat, amt]) => {
         text += ` ${cat}: ${formatMoney(amt)}\n`
       })
     
     text += '\n<b>Top Vendors:</b>\n'
     Object.entries(byVendor)
       .sort((a, b) => b[1] - a[1])
       .slice(0, 3)
       .forEach(([vendor, amt]) => {
         text += ` ${vendor}: ${formatMoney(amt)}\n`
       })
     
     await sendMessage(chatId, text)
     return NextResponse.json({ ok: true })
   }
   
   // TOP COMMANDS
   if (cmd.startsWith('top ')) {
     const type = text.substring(4).trim()
     const expenses = await getDocs(collection(db, 'expenses'))
     
     if (type === 'vendors') {
       const byVendor = {}
       
       expenses.forEach(doc => {
         const data = doc.data()
         byVendor[data.vendor || 'Unknown'] = (byVendor[data.vendor || 'Unknown'] || 0) + data.amount
       })
       
       const sorted = Object.entries(byVendor).sort((a, b) => b[1] - a[1])
       
       let text = '<b> TOP VENDORS BY SPENDING</b>\n\n'
       sorted.slice(0, 10).forEach(([vendor, amount], index) => {
         const trophy = index === 0 ? '' : index === 1 ? '' : index === 2 ? '' : `${index + 1}.`
         text += `${trophy} ${vendor}: ${formatMoney(amount)}\n`
       })
       
       await sendMessage(chatId, text)
     } else if (type === 'categories') {
       const byCategory = {}
       
       expenses.forEach(doc => {
         const data = doc.data()
         byCategory[data.category || 'Other'] = (byCategory[data.category || 'Other'] || 0) + data.amount
       })
       
       const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1])
       const total = sorted.reduce((sum, [, amt]) => sum + amt, 0)
       
       let text = '<b> TOP CATEGORIES BY SPENDING</b>\n\n'
       sorted.slice(0, 10).forEach(([category, amount], index) => {
         const trophy = index === 0 ? '' : index === 1 ? '' : index === 2 ? '' : `${index + 1}.`
         const percentage = (amount/total*100).toFixed(1)
         text += `${trophy} ${category}: ${formatMoney(amount)} (${percentage}%)\n`
       })
       
       await sendMessage(chatId, text)
     } else {
       await sendMessage(chatId, 
         'Available top commands:\n' +
         ' <code>top vendors</code>\n' +
         ' <code>top categories</code>'
       )
     }
     return NextResponse.json({ ok: true })
   }
   
   // SET ALERT
   if (cmd.startsWith('setalert ')) {
     const parts = text.substring(9).split(' ')
     if (parts.length < 2) {
       await sendMessage(chatId, 
         ' Invalid format\n\n' +
         'Correct format: <code>setalert ProjectName Percentage</code>\n' +
         'Example: <code>setalert Maitama 80</code>\n' +
         'This will alert you when Maitama reaches 80% of budget'
       )
       return NextResponse.json({ ok: true })
     }
     
     const projectName = parts[0]
     const threshold = parseInt(parts[1])
     
     if (!threshold || threshold < 1 || threshold > 100) {
       await sendMessage(chatId, ' Threshold must be between 1 and 100')
       return NextResponse.json({ ok: true })
     }
     
     session.alerts.push({ project: projectName, threshold, userId })
     
     await sendMessage(chatId, 
       ` <b>ALERT SET!</b>\n\n` +
       `You'll be notified when ${projectName} reaches ${threshold}% of budget.\n\n` +
       `View all alerts: <code>alerts</code>`
     )
     return NextResponse.json({ ok: true })
   }
   
   // VIEW ALERTS
   if (cmd === 'alerts') {
     if (session.alerts.length === 0) {
       await sendMessage(chatId, 
         'No alerts set.\n\n' +
         'Set an alert: <code>setalert Maitama 80</code>'
       )
       return NextResponse.json({ ok: true })
     }
     
     let text = '<b> ACTIVE ALERTS</b>\n\n'
     session.alerts.forEach((alert, index) => {
       text += `${index + 1}. ${alert.project} at ${alert.threshold}%\n`
     })
     
     text += '\nAlerts will trigger when projects reach threshold.'
     
     await sendMessage(chatId, text)
     return NextResponse.json({ ok: true })
   }
   
   // STATS (Quick Dashboard)
   if (cmd === 'stats') {
     const expenses = await getDocs(collection(db, 'expenses'))
     const projects = await getDocs(collection(db, 'projects'))
     const vendors = await getDocs(collection(db, 'vendors'))
     
     const today = new Date()
     today.setHours(0, 0, 0, 0)
     
     let todayTotal = 0
     let weekTotal = 0
     let monthTotal = 0
     
     expenses.forEach(doc => {
       const data = doc.data()
       const expDate = new Date(data.createdAt)
       
       if (expDate >= today) todayTotal += data.amount || 0
       if (expDate >= new Date(today.getTime() - 7*24*60*60*1000)) weekTotal += data.amount || 0
       if (expDate >= new Date(today.getTime() - 30*24*60*60*1000)) monthTotal += data.amount || 0
     })
     
     let text = '<b> QUICK STATS DASHBOARD</b>\n\n'
     text += ` Today: ${formatMoney(todayTotal)}\n`
     text += ` This Week: ${formatMoney(weekTotal)}\n`
     text += ` This Month: ${formatMoney(monthTotal)}\n\n`
     text += ` Projects: ${projects.size}\n`
     text += ` Vendors: ${vendors.size}\n`
     text += ` Total Expenses: ${expenses.size}\n\n`
     text += 'Full summary: <code>summary</code>'
     
     await sendMessage(chatId, text)
     return NextResponse.json({ ok: true })
   }
   
   // EXPORT
    if (cmd === 'export') {
      await sendMessage(chatId, 
        '<b>📥 EXPORT DATA</b>\n\n' +
        'Your data export is being prepared...\n\n' +
        'Visit the web dashboard to download:\n' +
        'https://property-tracker-djkqs86bu-ibrahim-abubakars-projects.vercel.app\n\n' +
        'Click "Export Excel" button to download all data.'
      )
      return NextResponse.json({ ok: true })
    }
   
   // TRY TO PARSE AS EXPENSE
   const amount = parseAmount(text)
   if (amount > 0) {
     const lowerText = text.toLowerCase()
     
    // VENDOR DETECTION - Smart detection
      let vendor = 'Unknown'
      
      // Quick check for specific vendor names in the message
      if (lowerText.includes(' musa')) vendor = 'Musa'
      else if (lowerText.includes(' ahmed')) vendor = 'Ahmed'
      else if (lowerText.includes(' ibrahim')) vendor = 'Ibrahim'
      else if (lowerText.includes(' ali')) vendor = 'Ali'
      const words = text.split(' ')
      
      // Known company vendors (check first)
      if (lowerText.includes('dangote')) vendor = 'Dangote'
      else if (lowerText.includes('bua')) vendor = 'BUA'
      else if (lowerText.includes('julius') || lowerText.includes('berger')) vendor = 'Julius Berger'
      else if (lowerText.includes('emos')) vendor = 'Emos'
      else if (lowerText.includes('schneider')) vendor = 'Schneider'
      else if (lowerText.includes('lafarge')) vendor = 'Lafarge'
      else if (lowerText.includes('elephant')) vendor = 'Elephant Cement'
      else if (lowerText.includes('unicem')) vendor = 'Unicem'
      else if (lowerText.includes('ashaka')) vendor = 'Ashaka'
      
      // If no company found, look for person name (last word that's not a material)
      if (vendor === 'Unknown') {
        const materials = ['cement', 'blocks', 'sand', 'nails', 'paint', 'wood', 'tiles', 
                          'granite', 'marble', 'pipes', 'wire', 'rods', 'iron', 'steel']
        
        // Get the last word that could be a vendor
        const lastWord = words[words.length - 1]
        const secondLastWord = words.length > 1 ? words[words.length - 2] : null
        
        // Check if last word is a vendor (not a number, not k/m, not in materials)
        if (lastWord && 
            !lastWord.match(/^\d/) && 
            !lastWord.toLowerCase().includes('k') && 
            !lastWord.toLowerCase().includes('m') &&
            !materials.includes(lastWord.toLowerCase())) {
          vendor = lastWord.charAt(0).toUpperCase() + lastWord.slice(1).toLowerCase()
        }
        // If last word failed, check second-to-last (in case last is a location)
        else if (secondLastWord && 
                 !materials.includes(secondLastWord.toLowerCase()) &&
                 !secondLastWord.match(/^\d/)) {
          vendor = secondLastWord.charAt(0).toUpperCase() + secondLastWord.slice(1).toLowerCase()
        }
        
        // Check words from the end
        for (let i = words.length - 1; i >= 0; i--) {
          const word = words[i]
          const wordLower = word.toLowerCase()
          
          // Skip numbers, amounts, materials, and project names
          if (word.match(/^\d/) || 
              wordLower.includes('k') || 
              wordLower.includes('m') ||
              materials.includes(wordLower) ||
              wordLower === 'kubwa' ||
              word.length <= 1) {
            continue
          }
          
          // This should be the vendor
          vendor = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          break
        }
      }
      
     
     // PROJECT DETECTION - Check actual projects from database
      let projectName = 'Unassigned'
      const projects = await getDocs(collection(db, 'projects'))
      
      projects.forEach(doc => {
        const data = doc.data()
        const projectKey = data.name.toLowerCase().split(' ')[0] // Get first word of project name
        if (lowerText.includes(projectKey)) {
          projectName = data.name
        }
      })
     // CATEGORY DETECTION
     let category = 'Other'
     if (lowerText.includes('cement')) category = 'Cement'
     else if (lowerText.includes('block')) category = 'Blocks'
     else if (lowerText.includes('sand')) category = 'Sand'
     else if (lowerText.includes('labour') || lowerText.includes('labor')) category = 'Labour'
     else if (lowerText.includes('transport')) category = 'Transport'
     else if (lowerText.includes('wood')) category = 'Wood'
     else if (lowerText.includes('paint')) category = 'Paint'
     else if (lowerText.includes('plumbing') || lowerText.includes('pipe')) category = 'Plumbing'
     else if (lowerText.includes('electrical') || lowerText.includes('wire') || lowerText.includes('generator')) category = 'Electrical'
     else if (lowerText.includes('roofing')) category = 'Roofing'
     else if (lowerText.includes('tiles') || lowerText.includes('tile')) category = 'Tiles'
      else if (lowerText.includes('nail') || lowerText.includes('iron') || lowerText.includes('steel') || lowerText.includes('rod')) category = 'Iron/Steel'
     else if (lowerText.includes('granite')) category = 'Granite'
     else if (lowerText.includes('marble')) category = 'Marble'
     else if (lowerText.includes('pop')) category = 'POP'
     else if (lowerText.includes('door') || lowerText.includes('window')) category = 'Doors/Windows'
     
     
     // Save expense
     const docRef = await addDoc(collection(db, 'expenses'), {
       amount,
       project: projectName,
       vendor,
       category,
       source: 'telegram',
       telegramUser: userName,
       originalText: text,
       createdAt: new Date().toISOString()
     })
     
     session.lastExpenseId = docRef.id
     
     // Check project budget and send alert if needed
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
         
         if (percentage >= 100) {
           alertMsg = '\n\n <b>ALERT: Project is OVER BUDGET!</b>'
         } else if (percentage >= 90) {
           alertMsg = '\n\n <b>WARNING: 90% of budget used!</b>'
         } else if (percentage >= 75) {
           alertMsg = '\n\n <b>NOTICE: 75% of budget used</b>'
         }
         
         await sendMessage(chatId,
           ` <b>EXPENSE SAVED!</b>\n\n` +
           ` Amount: ${formatMoney(amount)}\n` +
           ` Project: ${projectName}\n` +
           ` Vendor: ${vendor}\n` +
           ` Category: ${category}\n` +
           ` Date: ${formatDate(new Date())}\n\n` +
           `Project budget: ${formatMoney(projectData.budget)}\n` +
           `Total spent: ${formatMoney(totalSpent)} (${percentage.toFixed(1)}%)` +
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
       ` Category: ${category}\n` +
       ` Date: ${formatDate(new Date())}\n\n` +
       `To cancel: <code>cancel</code>`
     )
   } else {
     await sendMessage(chatId, 
       ' Command not recognized.\n\n' +
       'Type <code>menu</code> for full command list\n' +
       'Type <code>simple</code> for quick commands\n\n' +
       'Example expense: <code>500k cement Maitama</code>'
     )
   }
   
   return NextResponse.json({ ok: true })
   
 } catch (error) {
   console.error('Telegram bot error:', error)
   return NextResponse.json({ ok: true })
 }
}
