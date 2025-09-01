export async function POST(req) {
  const body = await req.json()
  
  if (body.message) {
    const chatId = body.message.chat.id
    const text = body.message.text || 'no text'
    
    const response = await fetch(
      'https://api.telegram.org/bot8477323092:AAF6X5Sh_NUge9N6MmEQyM84RcS8BCP3T6Y/sendMessage',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: 'Bot v2 working! You said: ' + text
        })
      }
    )
    
    return Response.json({ worked: true, sent: response.ok })
  }
  
  return Response.json({ worked: true, no_message: true })
}
