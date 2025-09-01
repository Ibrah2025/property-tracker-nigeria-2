import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    const expenses = await getDocs(collection(db, 'expenses'));
    let fixed = 0;
    
    for (const expense of expenses.docs) {
      const data = expense.data();
      let needsUpdate = false;
      let newProject = data.project;
      
      // Standardize Asokoro variants
      if (data.project === 'Asokoro' || 
          data.project === 'Asokoro Residence' || 
          data.project === 'Asokoro Estate') {
        newProject = 'Asokoro Residences';
        needsUpdate = true;
      }
      
      // Fix Katampe variants
      if (data.project === 'Katampe' || 
          data.project === 'Katampe Hills' ||
          data.project === 'Katampe Estate') {
        newProject = 'Katampe Hills Estate';
        needsUpdate = true;
      }
      
      // Remove remaining Unknown
      if (data.project === 'Unknown' || !data.project) {
        // Assign based on amount - large amounts to Katampe
        newProject = data.amount > 1000000 ? 'Katampe Hills Estate' : 'Garki1';
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await updateDoc(doc(db, 'expenses', expense.id), { project: newProject });
        fixed++;
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      fixed,
      message: `Standardized ${fixed} project names` 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
