import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy, limit } from 'firebase/firestore'

const sessions = new Map()

// Validation functions
function parseAmount(text) {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(k|m)?/i)
  if (!match) return 0
  
  let amount = parseFloat(match[1])
  const unit = match[2]?.toLowerCase()
  
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
    electrical: 'Electrical',
    pop: 'POP'
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

export async function POST(req: NextRequest) {
  try {
    // Parse Twilio webhook
    const formData = await req.formData()
    const from = (formData.get('From') || '').toString().replace('whatsapp:', '')
    const body = (formData.get('Body') || '').toString().trim()
    
    console.log(`WhatsApp from ${from}: "${body}"`)
    
    // Get/create session
    if (!sessions.has(from)) {
      sessions.set(from, { lastId: null, cache: [] })
    }
    const session = sessions.get(from)
    
    const cmd = body.toLowerCase()
    let response = ''
    
    // MENU/HELP
    if (cmd === 'menu' || cmd === 'help' || cmd === 'start') {
      response = `PROPERTY TRACKER

Add: 200k cement Maitama
List - Show expenses
Summary - Today's total
Balance Jabi - Project status
Search vendor - Find expenses
Cancel - Delete last
Edit 300k - Change last
#3 delete - Remove item
#3 500k - Edit amount`
    }
    
    // LIST
    else if (cmd === 'list') {
      const expenses = await getDocs(
        query(collection(db, 'expenses'), orderBy('createdAt', 'desc'), limit(10))
      )
      
      if (expenses.empty) {
        response = 'No expenses yet\n\nAdd: 200k cement Maitama'
      } else {
        session.cache = []
        response = 'RECENT EXPENSES:\n\n'
        let total = 0
        let index = 1
        
        expenses.forEach(doc => {
          const data = doc.data()
          // Skip invalid entries
          if (!data.amount || isNaN(data.amount)) return
          
          session.cache.push({ id: doc.id, ...data })
          response += `#${index}. ${formatMoney(data.amount)} - ${data.vendor || 'Unknown'}\n`
          response += `   ${data.project || 'Unassigned'}\n\n`
          total += Number(data.amount) || 0
          index++
        })
        
        response += `Total: ${formatMoney(total)}`
      }
    }
    
    // SUMMARY
    else if (cmd.startsWith('summary')) {
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
      
      response = `SUMMARY - ${period.toUpperCase()}\n\n`
      response += `Total: ${formatMoney(stats.total)}\n`
      response += `Expenses: ${stats.count}\n\n`
      
      if (Object.keys(stats.byProject).length > 0) {
        response += 'By Project:\n'
        Object.entries(stats.byProject)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .forEach(([p, amt]) => {
            response += `${p}: ${formatMoney(amt)}\n`
          })
      }
    }
    
    // BALANCE
    else if (cmd.startsWith('balance')) {
      const search = body.substring(7).toLowerCase().trim()
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
        response = 'Project not found\n\nUse: Maitama, Jabi, Garki, etc.'
      } else {
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
        const status = percentage >= 90 ? 'OVER!' : percentage >= 70 ? 'Caution' : 'Good'
        
        response = `${found.toUpperCase()}\n\n`
        response += `Budget: ${formatMoney(budget)}\n`
        response += `Spent: ${formatMoney(spent)} (${percentage}%)\n`
        response += `Remaining: ${formatMoney(remaining)}\n`
        response += `Status: ${status}`
      }
    }
    
    // SEARCH
    else if (cmd.startsWith('search')) {
      const term = body.substring(6).trim().toLowerCase()
      if (!term) {
        response = 'Search what?\n\nExample: search Dangote'
      } else {
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
          response = 'No results found'
        } else {
          response = `SEARCH: ${term}\n\n`
          let total = 0
          
          results.slice(0, 5).forEach(exp => {
            response += `${formatMoney(exp.amount)} - ${exp.vendor}\n`
            response += `  ${exp.project}\n\n`
            total += Number(exp.amount) || 0
          })
          
          response += `Total: ${formatMoney(total)}`
        }
      }
    }
    
    // NUMBERED COMMANDS (#3 delete or #3 500k)
    else if (cmd.match(/^#(\d+)/)) {
      const match = cmd.match(/^#(\d+)\s*(.*)/)
      const num = parseInt(match[1]) - 1
      const action = match[2].trim()
      
      if (!session.cache[num]) {
        response = 'Invalid #\n\nType LIST first'
      } else {
        const target = session.cache[num]
        
        if (action === 'delete') {
          await deleteDoc(doc(db, 'expenses', target.id))
          response = `Deleted #${num + 1}`
        } else {
          const amount = parseAmount(action)
          if (amount) {
            await updateDoc(doc(db, 'expenses', target.id), {
              amount,
              editedAt: new Date().toISOString()
            })
            response = `#${num + 1} updated to ${formatMoney(amount)}`
          } else {
            response = 'Use: #3 delete or #3 500k'
          }
        }
      }
    }
    
    // CANCEL
    else if (cmd === 'cancel' || cmd === 'undo') {
      if (session.lastId) {
        await deleteDoc(doc(db, 'expenses', session.lastId))
        response = 'Last expense deleted'
        session.lastId = null
      } else {
        response = 'No recent expense'
      }
    }
    
    // EDIT
    else if (cmd.startsWith('edit ')) {
      if (!session.lastId) {
        response = 'No recent expense to edit'
      } else {
        const amount = parseAmount(body.substring(5))
        if (amount) {
          await updateDoc(doc(db, 'expenses', session.lastId), {
            amount,
            editedAt: new Date().toISOString()
          })
          response = `Updated to ${formatMoney(amount)}`
        } else {
          response = 'Invalid amount'
        }
      }
    }
    
    // WHO (expenses by user)
    else if (cmd === 'who') {
      const expenses = await getDocs(collection(db, 'expenses'))
      const byUser = {}
      
      expenses.forEach(doc => {
        const data = doc.data()
        if (!data.amount || isNaN(data.amount)) return
        
        const user = data.whatsappNumber || 'Unknown'
        if (!byUser[user]) byUser[user] = { total: 0, count: 0 }
        byUser[user].total += Number(data.amount)
        byUser[user].count++
      })
      
      response = 'EXPENSES BY USER:\n\n'
      Object.entries(byUser)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 5)
        .forEach(([user, data]) => {
          const phone = user.slice(-4) // Last 4 digits
          response += `...${phone}: ${formatMoney(data.total)} (${data.count})\n`
        })
    }
    
    // TOTAL
    else if (cmd === 'total') {
      const expenses = await getDocs(collection(db, 'expenses'))
      let grandTotal = 0
      let userTotal = 0
      
      expenses.forEach(doc => {
        const data = doc.data()
        if (!data.amount || isNaN(data.amount)) return
        
        const amount = Number(data.amount)
        grandTotal += amount
        if (data.whatsappNumber === from) {
          userTotal += amount
        }
      })
      
      const percentage = grandTotal > 0 ? Math.round((userTotal/grandTotal) * 100) : 0
      
      response = `TOTALS:\n\n`
      response += `Your Total: ${formatMoney(userTotal)}\n`
      response += `Grand Total: ${formatMoney(grandTotal)}\n`
      response += `Your Share: ${percentage}%`
    }
    
    // PARSE AS NEW EXPENSE
    else {
      const parsed = parseExpense(body)
      
      if (parsed && parsed.amount > 0) {
        const expense = {
          amount: parsed.amount,
          project: parsed.project,
          vendor: parsed.vendor,
          category: parsed.category,
          source: 'whatsapp',
          whatsappNumber: from,
          originalText: body,
          createdAt: new Date().toISOString()
        }
        
        const docRef = await addDoc(collection(db, 'expenses'), expense)
        session.lastId = docRef.id
        
        response = `SAVED!\n\n`
        response += `Amount: ${formatMoney(parsed.amount)}\n`
        response += `Project: ${parsed.project}\n`
        response += `Vendor: ${parsed.vendor}\n`
        response += `Category: ${parsed.category}\n\n`
        response += `Type CANCEL to undo`
      } else {
        response = 'Not understood\n\nFormat: 200k cement Maitama\n\nType MENU for help'
      }
    }
    
    // Ensure response fits SMS limit
    if (response.length > 1500) {
      response = response.substring(0, 1497) + '...'
    }
    
    // Return TwiML response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${response}</Message></Response>`
    
    return new Response(twiml, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' }
    })
    
  } catch (error) {
    console.error('WhatsApp error:', error)
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Error occurred. Try again.</Message></Response>',
      { status: 200, headers: { 'Content-Type': 'text/xml' } }
    )
  }
}
