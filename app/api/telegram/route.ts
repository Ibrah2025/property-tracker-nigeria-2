import { NextRequest, NextResponse } from 'next/server'

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || '8477323092:AAF6X5Sh_NUge9N6MmEQyM84RcS8BCP3T6Y'

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
    console.log('Telegram webhook received:', JSON.stringify(body))
    
    const message = body.message
    if (!message) return NextResponse.json({ ok: true })
    
    const chatId = message.chat.id
    const text = message.text || ''
    
    // Simple test response
    await sendMessage(chatId, `Received: ${text}\n\nToken: ${TELEGRAM_TOKEN ? 'Set' : 'Missing'}`)
    
    return NextResponse.json({ ok: true })
    
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ ok: true })
  }
}
