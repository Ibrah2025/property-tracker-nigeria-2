import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../lib/firebase'
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore'

export async function GET(req: NextRequest) {
  try {
    const projectsSnapshot = await getDocs(collection(db, 'projects'))
    const expensesSnapshot = await getDocs(collection(db, 'expenses'))
    
    const projects = []
    projectsSnapshot.forEach(doc => {
      projects.push({ id: doc.id, ...doc.data() })
    })
    
    // If no projects in database, use defaults
    if (projects.length === 0) {
      const defaults = [
        { name: 'Maitama Heights', location: 'Maitama, Abuja', budget: 50000000, status: 'active' },
        { name: 'Asokoro Residences', location: 'Asokoro, Abuja', budget: 75000000, status: 'active' },
        { name: 'Katampe Hills Estate', location: 'Katampe, Abuja', budget: 60000000, status: 'active' },
        { name: 'Wuse II Towers', location: 'Wuse II, Abuja', budget: 90000000, status: 'planning' },
        { name: 'Jabi Lakeside', location: 'Jabi, Abuja', budget: 45000000, status: 'active' }
      ]
      
      for (const proj of defaults) {
        const docRef = await addDoc(collection(db, 'projects'), proj)
        projects.push({ id: docRef.id, ...proj })
      }
    }
    
    // Calculate expenses per project
    const projectExpenses = {}
    expensesSnapshot.forEach(doc => {
      const data = doc.data()
      if (data.project) {
        projectExpenses[data.project] = (projectExpenses[data.project] || 0) + (data.amount || 0)
      }
    })
    
    const projectsWithExpenses = projects.map(project => ({
      ...project,
      totalExpenses: projectExpenses[project.name] || 0
    }))
    
    return NextResponse.json({
      success: true,
      projects: projectsWithExpenses
    })
    
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    const newProject = {
      name: body.name,
      location: body.location,
      budget: body.budget,
      status: body.status || 'planning',
      createdAt: new Date().toISOString()
    }
    
    const docRef = await addDoc(collection(db, 'projects'), newProject)
    
    return NextResponse.json({
      success: true,
      id: docRef.id,
      project: { ...newProject, id: docRef.id }
    })
    
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ success: false, error: 'Failed to create' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...updateData } = body
    
    await updateDoc(doc(db, 'projects', id), updateData)
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'No ID provided' }, { status: 400 })
    }
    
    await deleteDoc(doc(db, 'projects', id))
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 })
  }
}
