export async function POST(req) {
  const body = await req.json()
  
  if (body.message && body.message.chat && body.message.chat.id) {
    const response = await fetch(
      'https://api.telegram.org/bot8477323092:AAF6X5Sh_NUge9N6MmEQyM84RcS8BCP3T6Y/sendMessage',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: body.message.chat.id,
          text: 'Working! Time: ' + Date.now()
        })
      }
    )
    
    const result = await response.text()
    return new Response(JSON.stringify({ 
      success: true, 
      telegram_status: response.status,
      telegram_response: result 
    }))
  }
  
  return new Response(JSON.stringify({ success: true, no_message_received: true }))
}
