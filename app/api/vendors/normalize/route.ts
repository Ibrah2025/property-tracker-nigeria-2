import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    // Vendor name mappings for consolidation
    const vendorMappings: { [key: string]: string } = {
      'dagote': 'Dangote',
      'dangote cement': 'Dangote',
      'none': 'Unknown',
      'cement': 'Unknown',
      'muster eletronics': 'Master Electronics',
      'dang': 'Dangote'
    };
    
    // Get all expenses
    const expensesSnapshot = await getDocs(collection(db, 'expenses'));
    let updated = 0;
    
    for (const expense of expensesSnapshot.docs) {
      const data = expense.data();
      const vendorLower = data.vendor?.toLowerCase() || '';
      
      // Check if vendor needs normalization
      if (vendorMappings[vendorLower]) {
        await updateDoc(doc(db, 'expenses', expense.id), {
          vendor: vendorMappings[vendorLower]
        });
        updated++;
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      updated,
      message: `Normalized ${updated} vendor names` 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to normalize vendors' }, { status: 500 });
  }
}
