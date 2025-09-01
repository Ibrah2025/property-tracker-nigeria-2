import { NextRequest, NextResponse } from 'next/server'

const TELEGRAM_TOKEN = '8477323092:AAF6X5Sh_NUge9N6MmEQyM84RcS8BCP3T6Y'

async function sendMessage(chatId: number, text: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      chat_id: chatId, 
      text: text,
      parse_mode: 'HTML' 
    })
  })
  return response.ok
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('Telegram received:', JSON.stringify(body).substring(0, 200))
    
    const message = body.message
    if (!message) return NextResponse.json({ ok: true })
    
    const chatId = message.chat.id
    const text = (message.text || '').toLowerCase()
    
    // Basic responses without database
    if (text === 'menu' || text === '/start') {
      await sendMessage(chatId, 
        '<b>?? PROPERTY TRACKER</b>\n\n' +
        'Bot is active!\n\n' +
        'Commands:\n' +
        '• menu - This menu\n' +
        '• Any amount (e.g., 350k) - Will be saved\n\n' +
        'Database connection is being fixed.'
      )
    } else if (text.includes('k') || text.includes('m')) {
      // Parse amount
      const match = text.match(/(\d+)\s*(k|m)?/i)
      if (match) {
        const amount = parseInt(match[1]) * (match[2] === 'm' ? 1000 : 1)
        await sendMessage(chatId, `? Received ?${amount}k\n\n(Database saving temporarily disabled)`)
      }
    } else {
      await sendMessage(chatId, 'Type "menu" for help')
    }
    
    return NextResponse.json({ ok: true })
    
  } catch (error) {
    console.error('Telegram error:', error)
    return NextResponse.json({ ok: true })
  }
}
