import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore'

function parseAmount(text) {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(k|m)?/i)
  if (!match) return 0
  
  let amount = parseFloat(match[1])
  if (match[2]?.toLowerCase() === 'k') amount *= 1000
  else if (match[2]?.toLowerCase() === 'm') amount *= 1000000
  
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
    if (words[i][0] === words[i][0].toUpperCase() && !words[i].match(/^\d/)) {
      vendor = words[i]
      break
    }
  }
  
  const categories = {
    cement: 'Cement',
    block: 'Blocks',
    labour: 'Labour',
    transport: 'Transport',
    sand: 'Sand',
    paint: 'Paint',
    door: 'Doors/Windows',
    window: 'Doors/Windows'
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

export async function POST(req) {
  try {
    const formData = await req.formData()
    const body = formData.get('Body')?.toString() || ''
    const from = formData.get('From')?.toString() || ''
    
    const text = body.trim().toLowerCase()
    
    let response = ''
    
    if (text === 'menu' || text === 'help') {
      response = 'PROPERTY TRACKER\n\n' +
        'Add: 200k cement Maitama\n' +
        'LIST - Recent expenses\n' +
        'SUMMARY - Total spent\n' +
        'MENU - This help'
    }
    else if (text === 'list') {
      const expenses = await getDocs(
        query(collection(db, 'expenses'), orderBy('createdAt', 'desc'), limit(5))
      )
      
      if (expenses.empty) {
        response = 'No expenses yet'
      } else {
        response = 'RECENT EXPENSES:\n\n'
        let total = 0
        
        expenses.forEach(doc => {
          const data = doc.data()
          response += `N${Math.round(data.amount/1000)}k - ${data.vendor || 'Unknown'}\n`
          response += `${data.project || 'Unassigned'}\n\n`
          total += data.amount || 0
        })
        
        response += `Total: N${Math.round(total/1000)}k`
      }
    }
    else if (text === 'summary') {
      const expenses = await getDocs(collection(db, 'expenses'))
      let total = 0
      let count = 0
      
      expenses.forEach(doc => {
        total += doc.data().amount || 0
        count++
      })
      
      response = `SUMMARY\n\nTotal: N${(total/1000000).toFixed(2)}M\nExpenses: ${count}`
    }
    else {
      const parsed = parseExpense(body)
      
      if (parsed && parsed.amount > 0) {
        await addDoc(collection(db, 'expenses'), {
          amount: parsed.amount,
          project: parsed.project,
          vendor: parsed.vendor,
          category: parsed.category,
          source: 'whatsapp',
          whatsappNumber: from,
          originalText: body,
          createdAt: new Date().toISOString()
        })
        
        response = `SAVED!\n\n` +
          `Amount: N${Math.round(parsed.amount/1000)}k\n` +
          `Project: ${parsed.project}\n` +
          `Vendor: ${parsed.vendor}\n` +
          `Category: ${parsed.category}`
      } else {
        response = 'Not understood\n\nFormat: 200k cement Maitama\n\nType MENU for help'
      }
    }
    
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${response}</Message></Response>`
    
    return new NextResponse(twiml, {
      headers: { 'Content-Type': 'text/xml' }
    })
    
  } catch (error) {
    console.error('WhatsApp error:', error)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Error processing request</Message></Response>',
      { headers: { 'Content-Type': 'text/xml' } }
    )
  }
}
