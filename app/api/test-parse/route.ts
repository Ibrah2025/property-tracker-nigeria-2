import { NextRequest, NextResponse } from 'next/server';

function parseExpenseText(text: string) {
  let amount = 0;
  let location = 'Unknown';
  let category = 'General';
  let vendor = 'Unknown';
  
  // Amount
  const amountMatch = text.match(/(\d+)\s*(million|mil|m|k)?/i);
  if (amountMatch) {
    amount = parseInt(amountMatch[1]);
    const unit = amountMatch[2]?.toLowerCase();
    if (unit === 'k') amount *= 1000;
    if (unit === 'million' || unit === 'mil' || unit === 'm') amount *= 1000000;
  }
  
  // Location - MUST INCLUDE KATAMPE
  if (text.toLowerCase().includes('katampe')) location = 'Katampe Hills Estate';
  else if (text.toLowerCase().includes('maitama')) location = 'Maitama Heights';
  else if (text.toLowerCase().includes('garki')) location = 'Garki1';
  
  // Category - MUST INCLUDE TILES
  if (text.toLowerCase().includes('tile')) category = 'Tiles';
  else if (text.toLowerCase().includes('cement')) category = 'Cement';
  else if (text.toLowerCase().includes('block')) category = 'Blocks';
  
  // Vendor - last word that isn't recognized
  const words = text.split(' ');
  vendor = words[words.length - 1];
  
  return { amount, location, category, vendor };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const text = url.searchParams.get('text') || '';
  const result = parseExpenseText(text);
  return NextResponse.json(result);
}
