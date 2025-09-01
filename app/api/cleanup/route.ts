import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpenses } from '@/lib/cleanup-expenses';

export async function POST(req: NextRequest) {
  try {
    const fixed = await cleanupExpenses();
    return NextResponse.json({ 
      success: true, 
      message: `Fixed ${fixed} expenses` 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
