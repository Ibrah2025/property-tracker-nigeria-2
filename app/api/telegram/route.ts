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
        '<b>?? PROPERTY TRACKER</b>\n\n' +
        '• Add: <code>200k cement Maitama</code>\n' +
        '• <code>list</code> - Show expenses\n' +
        '• <code>summary</code> - Today\'s total\n' +
        '• <code>menu</code> - This menu'
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
            response += `?${(data.amount/1000).toFixed(0)}k - ${data.project || 'Unknown'}\n`
            total += Number(data.amount)
          }
        })
        
        response += `\n<b>Total: ?${(total/1000).toFixed(0)}k</b>`
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
          `<b>?? SUMMARY</b>\n\n` +
          `Total: ?${(total/1000000).toFixed(2)}M\n` +
          `Count: ${count} expenses`
        )
      } catch (error) {
        await sendMessage(chatId, 'Error getting summary')
      }
      return NextResponse.json({ ok: true })
    }
    
    // Try to parse as expense
    const amount = parseAmount(text)
    if (amount > 0) {
      let project = 'Unassigned'
      const projects = ['maitama', 'jabi', 'garki', 'katampe', 'asokoro', 'wuse']
      for (const p of projects) {
        if (text.toLowerCase().includes(p)) {
          project = p.charAt(0).toUpperCase() + p.slice(1)
          break
        }
      }
      
      await addDoc(collection(db, 'expenses'), {
        amount,
        project,
        source: 'telegram',
        telegramUser: userName,
        text: text,
        createdAt: new Date().toISOString()
      })
      
      await sendMessage(chatId, `? Saved ?${(amount/1000).toFixed(0)}k for ${project}`)
    } else {
      await sendMessage(chatId, 'Send: <code>200k cement Maitama</code>\nOr type <code>menu</code> for help')
    }
    
    return NextResponse.json({ ok: true })
    
  } catch (error) {
    console.error('Telegram error:', error)
    return NextResponse.json({ ok: true })
  }
}
