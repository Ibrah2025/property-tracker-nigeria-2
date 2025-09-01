import { NextRequest, NextResponse } from 'next/server'

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || ''

export async function POST(req: NextRequest) {
  try {
    const { message, context } = await req.json()
    
    // Claude API call for parsing Nigerian construction context
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `You are a financial assistant for Nigerian property developers in Northern Nigeria (Abuja, Kaduna, Kano). Parse this message and extract expense information.

Context: Northern Nigerian construction market, amounts in Naira, common vendors include cement suppliers, block makers, contractors. Mix of English and Hausa is common.

Message: "${message}"

Extract and return JSON:
{
  "amount": number or null,
  "vendor": "vendor name" or null,
  "category": "category" or null,
  "project": "project name if mentioned" or null,
  "description": "cleaned description",
  "confidence": "high/medium/low"
}

Categories: Foundation, Blocks & Bricks, Cement, Roofing, Plumbing, Electrical, Finishing, Labour, Equipment, Permits, Security, Transportation, Other`
        }]
      })
    })

    if (!response.ok) {
      throw new Error('Claude API error')
    }

    const data = await response.json()
    const content = data.content[0].text
    const parsed = JSON.parse(content)
    
    return NextResponse.json({ success: true, parsed })
  } catch (error) {
    console.error('AI Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process message' 
    }, { status: 500 })
  }
}
