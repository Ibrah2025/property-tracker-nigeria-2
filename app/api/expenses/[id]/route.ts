import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updates = await req.json();
    const docRef = doc(db, 'expenses', params.id);
    
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await deleteDoc(doc(db, 'expenses', params.id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const docRef = doc(db, 'expenses', params.id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return NextResponse.json({ id: docSnap.id, ...docSnap.data() });
    } else {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}
