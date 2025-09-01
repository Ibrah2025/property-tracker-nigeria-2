import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

// Nigerian bank SMS patterns
const BANK_PATTERNS = {
  gtbank: {
    identifier: ['GTBank', 'GTB', '737'],
    debitPattern: /Amt:\s*NGN([\d,]+\.?\d*)\s+(?:Desc|To):\s*([^\n]+)/i,
    vendorPattern: /(?:To|Desc|REF):\s*([^\n]+?)(?:\s+Bal:|$)/i
  },
  access: {
    identifier: ['AccessBank', 'Access', '901'],
    debitPattern: /NGN([\d,]+\.?\d*)\s+(?:debited|sent to)\s+([^\n]+)/i,
    vendorPattern: /to\s+([^\n]+?)(?:\s+on|$)/i
  },
  uba: {
    identifier: ['UBA', '919'],
    debitPattern: /Debit.*NGN([\d,]+\.?\d*).*?(?:to|Beneficiary):\s*([^\n]+)/i,
    vendorPattern: /Beneficiary:\s*([^\n]+?)(?:\s+|$)/i
  },
  firstbank: {
    identifier: ['FirstBank', 'FBN', '894'],
    debitPattern: /Debit.*N([\d,]+\.?\d*).*?to\s+([^\n]+)/i,
    vendorPattern: /to\s+([^\n]+?)(?:\s+|$)/i
  },
  zenith: {
    identifier: ['Zenith', '966'],
    debitPattern: /Amt:\s*NGN([\d,]+\.?\d*).*?(?:To|Desc):\s*([^\n]+)/i,
    vendorPattern: /(?:To|Desc):\s*([^\n]+?)(?:\s+|$)/i
  }
};

export async function POST(req: NextRequest) {
  try {
    // Get data from SMS forwarder app
    const data = await req.json();
    console.log('SMS received:', data);
    
    // Handle different SMS forwarder formats
    const sender = data.from || data.sender || data.number || '';
    const message = data.message || data.text || data.body || '';
    const timestamp = data.timestamp || data.received_at || new Date().toISOString();
    
    // Identify bank
    let detectedBank = null;
    let pattern = null;
    
    for (const [bank, config] of Object.entries(BANK_PATTERNS)) {
      if (config.identifier.some(id => 
        sender.includes(id) || message.includes(id)
      )) {
        detectedBank = bank;
        pattern = config;
        break;
      }
    }
    
    if (!detectedBank) {
      console.log('Not a bank SMS, ignoring');
      return NextResponse.json({ ignored: true, reason: 'Not from recognized bank' });
    }
    
    // Extract amount
    const amountMatch = message.match(pattern.debitPattern);
    if (!amountMatch) {
      console.log('No debit found in SMS');
      return NextResponse.json({ ignored: true, reason: 'No debit transaction found' });
    }
    
    const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    
    // Extract vendor/beneficiary
    let vendor = 'Unknown';
    const vendorMatch = message.match(pattern.vendorPattern);
    if (vendorMatch) {
      vendor = vendorMatch[1].trim()
        .replace(/\s+/g, ' ')  // Clean extra spaces
        .replace(/\*/g, '')    // Remove asterisks
        .substring(0, 50);     // Limit length
    }
    
    // Try to categorize based on vendor
    let category = 'Bank Transfer';
    const vendorLower = vendor.toLowerCase();
    
    if (vendorLower.includes('dangote')) category = 'Cement';
    else if (vendorLower.includes('electric') || vendorLower.includes('nepa') || vendorLower.includes('phcn')) category = 'Electrical';
    else if (vendorLower.includes('water')) category = 'Borehole';
    else if (vendorLower.includes('labour') || vendorLower.includes('salary')) category = 'Labour';
    else if (vendorLower.includes('fuel') || vendorLower.includes('diesel')) category = 'Fuel/Diesel';
    
    // Create expense object
    const expense = {
      amount: amount,
      vendor: vendor,
      category: category,
      project: 'Unknown',  // Will need manual assignment
      source: 'bank-sms-' + detectedBank,
      description: 'Auto-captured from ' + detectedBank.toUpperCase() + ' SMS',
      originalMessage: message.substring(0, 500),  // Store original for reference
      createdAt: timestamp,
      bank: detectedBank
    };
    
    console.log('Parsed expense:', expense);
    
    // Save to Firebase
    const docRef = await addDoc(collection(db, 'expenses'), expense);
    
    // Also send notification to Telegram for confirmation
    const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = '1795204153'; // Your chat ID
    
    const telegramMessage = `🏦 Bank SMS Auto-Captured:\n` +
      `Bank: ${detectedBank.toUpperCase()}\n` +
      `Amount: ₦${amount.toLocaleString()}\n` +
      `Vendor: ${vendor}\n` +
      `Category: ${category}\n\n` +
      `ID: ${docRef.id.slice(-6)}\n` +
      `Reply with project name to assign (e.g. "Maitama Heights")`;
    
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: telegramMessage
      })
    });
    
    return NextResponse.json({ 
      success: true, 
      expense,
      id: docRef.id,
      message: 'SMS parsed and saved successfully'
    });
    
  } catch (error: any) {
    console.error('SMS processing error:', error);
    return NextResponse.json({ 
      error: 'Failed to process SMS',
      details: error.message 
    }, { status: 500 });
  }
}
