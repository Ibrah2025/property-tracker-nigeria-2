'use client'
import { useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function ExpensesByProject() {
  const [data, setData] = useState([])
  
  useEffect(() => {
    loadProjectExpenses()
  }, [])
  
  const loadProjectExpenses = async () => {
    const validProjects = [
      'Katampe Hills Estate',
      'Maitama Heights',
      'Garki1',
      'Jabi Lakeside',
      'Asokoro Residences',
      'Wuse II Towers'
    ]
    
    const projectData = []
    
    for (const project of validProjects) {
      const q = query(collection(db, 'expenses'), where('project', '==', project))
      const snapshot = await getDocs(q)
      
      let total = 0
      snapshot.forEach(doc => {
        total += doc.data().amount || 0
      })
      
      if (total > 0) {
        projectData.push({
          name: project.replace(' Estate', '').replace(' Heights', '').replace(' Residences', ''),
          amount: total / 1000000, // Convert to millions
          full: total
        })
      }
    }
    
    // Sort by amount descending
    projectData.sort((a, b) => b.amount - a.amount)
    setData(projectData)
  }
  
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Expenses by Project</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="name" stroke="#9CA3AF" />
          <YAxis stroke="#9CA3AF" tickFormatter={(v) => `N${v}M`} />
          <Tooltip 
            formatter={(value) => `N${value}M`}
            contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
          />
          <Bar dataKey="amount" fill="#10B981" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
