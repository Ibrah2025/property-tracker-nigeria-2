import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../lib/firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectFilter = searchParams.get('project')
    
    console.log('Fetching expenses, project filter:', projectFilter)
    
    const expensesRef = collection(db, 'expenses')
    let q = expensesRef
    
    // Apply project filter if provided
    if (projectFilter) {
      q = query(expensesRef, where('project', '==', projectFilter))
    }
    
    const snapshot = await getDocs(q)
    const expenses = []
    
    snapshot.forEach((doc) => {
      expenses.push({
        id: doc.id,
        ...doc.data()
      })
    })
    
    console.log(`Found ${expenses.length} expenses`)
    
    return NextResponse.json({
      success: true,
      expenses: expenses
    })
    
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('Creating expense:', body)
    
    const { addDoc } = await import('firebase/firestore')
    
    const docRef = await addDoc(collection(db, 'expenses'), {
      ...body,
      createdAt: new Date().toISOString()
    })
    
    return NextResponse.json({
      success: true,
      id: docRef.id
    })
    
  } catch (error) {
    console.error('Error creating expense:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
