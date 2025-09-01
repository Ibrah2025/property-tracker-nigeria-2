import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore'

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || '8477323092:AAF6X5Sh_NUge9N6MmEQyM84RcS8BCP3T6Y'

async function sendMessage(chatId: number, text: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      chat_id: chatId, 
      text: text,
      parse_mode: 'HTML' 
    })
  })
}

function parseAmount(text: string) {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(k|m)?/i)
  if (!match) return 0
  let amount = parseFloat(match[1])
  if (match[2]?.toLowerCase() === 'k') amount *= 1000
  else if (match[2]?.toLowerCase() === 'm') amount *= 1000000
  return amount
}

function parseExpense(text: string) {
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
  
  // Category - expanded list
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
    door: 'Doors/Windows',
    window: 'Doors/Windows',
    iron: 'Iron/Steel',
    steel: 'Iron/Steel',
    roofing: 'Roofing',
    tiles: 'Tiles',
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const message = body.message
    if (!message) return NextResponse.json({ ok: true })
    
    const chatId = message.chat.id
    const text = message.text || ''
    const userName = message.from?.first_name || 'User'
    
    // Menu command
    if (text.toLowerCase() === 'menu' || text === '/start') {
      await sendMessage(chatId, 
        '<b>PROPERTY TRACKER</b>\n\n' +
        'Commands:\n' +
        '- Add: 200k cement Maitama Dangote\n' +
        '- list - Show expenses\n' +
        '- summary - Total summary\n' +
        '- menu - This menu'
      )
      return NextResponse.json({ ok: true })
    }
    
    // List command
    if (text.toLowerCase() === 'list') {
      try {
        const expenses = await getDocs(
          query(collection(db, 'expenses'), orderBy('createdAt', 'desc'), limit(5))
        )
        
        let response = '<b>Recent Expenses:</b>\n\n'
        let total = 0
        
        expenses.forEach(doc => {
          const data = doc.data()
          if (data.amount && !isNaN(data.amount)) {
            response += `N${(data.amount/1000).toFixed(0)}k - ${data.vendor || 'Unknown'} (${data.project || 'Unknown'})\n`
            total += Number(data.amount)
          }
        })
        
        response += `\n<b>Total: N${(total/1000).toFixed(0)}k</b>`
        await sendMessage(chatId, response)
      } catch (error) {
        await sendMessage(chatId, 'Error fetching expenses')
      }
      return NextResponse.json({ ok: true })
    }
    
    // Summary command
    if (text.toLowerCase() === 'summary') {
      try {
        const expenses = await getDocs(collection(db, 'expenses'))
        let total = 0
        let count = 0
        
        expenses.forEach(doc => {
          const data = doc.data()
          if (data.amount && !isNaN(data.amount)) {
            total += Number(data.amount)
            count++
          }
        })
        
        await sendMessage(chatId, 
          '<b>SUMMARY</b>\n\n' +
          `Total: N${(total/1000000).toFixed(2)}M\n` +
          `Count: ${count} expenses`
        )
      } catch (error) {
        await sendMessage(chatId, 'Error getting summary')
      }
      return NextResponse.json({ ok: true })
    }
    
    // Try to parse as expense
    const parsed = parseExpense(text)
    
    if (parsed && parsed.amount > 0) {
      await addDoc(collection(db, 'expenses'), {
        amount: parsed.amount,
        project: parsed.project,
        vendor: parsed.vendor,
        category: parsed.category,
        source: 'telegram',
        telegramUser: userName,
        text: text,
        createdAt: new Date().toISOString()
      })
      
      await sendMessage(chatId, 
        '<b>SAVED!</b>\n\n' +
        `Amount: N${(parsed.amount/1000).toFixed(0)}k\n` +
        `Project: ${parsed.project}\n` +
        `Vendor: ${parsed.vendor}\n` +
        `Category: ${parsed.category}`
      )
    } else {
      await sendMessage(chatId, 'Send: 200k cement Maitama\n\nType "menu" for help')
    }
    
    return NextResponse.json({ ok: true })
    
  } catch (error) {
    console.error('Telegram error:', error)
    return NextResponse.json({ ok: true })
  }
}
