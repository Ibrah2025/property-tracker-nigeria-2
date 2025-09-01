export async function POST(req) {
  const body = await req.json()
  if (!body.message) return Response.json({ ok: true })
  
  const chatId = body.message.chat.id
  const text = body.message.text || ''
  
  let response = 'Received: ' + text
  
  if (text.toLowerCase() === 'menu') {
    response = 'PROPERTY TRACKER\n\nAdd: 200k cement Maitama\nList - Show expenses\nMenu - This help'
  }
  
  await fetch('https://api.telegram.org/bot8477323092:AAF6X5Sh_NUge9N6MmEQyM84RcS8BCP3T6Y/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: response })
  })
  
  return Response.json({ ok: true })
}
