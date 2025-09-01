import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../lib/firebase'
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore'

export async function POST(req: NextRequest) {
  try {
    const sale = await req.json()
    
    // Calculate total project cost
    const expensesQuery = query(
      collection(db, 'expenses'),
      where('project', '==', sale.project)
    )
    const expensesSnapshot = await getDocs(expensesQuery)
    
    let totalCost = 0
    expensesSnapshot.forEach(doc => {
      totalCost += doc.data().amount || 0
    })
    
    // Calculate profit
    const grossProfit = sale.salePrice - totalCost
    const profitMargin = (grossProfit / sale.salePrice) * 100
    
    // Additional costs (Nigerian property sale specifics)
    const agentCommission = sale.salePrice * (sale.agentRate || 0.05) // 5% default
    const legalFees = sale.legalFees || 500000 // ₦500k default
    const capitalGainsTax = grossProfit * 0.1 // 10% CGT in Nigeria
    
    const netProfit = grossProfit - agentCommission - legalFees - capitalGainsTax
    const netMargin = (netProfit / sale.salePrice) * 100
    
    // Save sale record
    const saleRecord = {
      ...sale,
      totalCost,
      grossProfit,
      profitMargin: profitMargin.toFixed(2),
      agentCommission,
      legalFees,
      capitalGainsTax,
      netProfit,
      netMargin: netMargin.toFixed(2),
      createdAt: new Date().toISOString()
    }
    
    const docRef = await addDoc(collection(db, 'sales'), saleRecord)
    
    return NextResponse.json({ 
      id: docRef.id, 
      ...saleRecord 
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const salesSnapshot = await getDocs(collection(db, 'sales'))
    const sales = []
    
    salesSnapshot.forEach(doc => {
      sales.push({ id: doc.id, ...doc.data() })
    })
    
    return NextResponse.json(sales)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
