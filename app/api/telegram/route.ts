export async function POST(req) {
  const body = await req.json()
  
  if (body.message && body.message.chat && body.message.chat.id) {
    // Send response directly
    await fetch('https://api.telegram.org/bot8477323092:AAF6X5Sh_NUge9N6MmEQyM84RcS8BCP3T6Y/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: body.message.chat.id,
        text: 'Bot is working! You sent: ' + (body.message.text || 'no text')
      })
    })
  }
  
  return Response.json({ ok: true })
}
