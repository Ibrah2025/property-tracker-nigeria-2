'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function HomePage() {
  const [projects, setProjects] = useState([])
  const [expenses, setExpenses] = useState([])
  const [totalSpent, setTotalSpent] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch projects
      const projectsSnapshot = await getDocs(collection(db, 'projects'))
      const projectsData = projectsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      // If no projects exist, create default ones
      if (projectsData.length === 0) {
        const defaultProjects = [
          { name: 'Maitama Heights', budget: 850000, location: 'Maitama, Abuja' },
          { name: 'Garki Site', budget: 750000, location: 'Garki, Abuja' },
          { name: 'Jabi Lakeside', budget: 950000, location: 'Jabi, Abuja' },
          { name: 'Asokoro Residences', budget: 1250000, location: 'Asokoro, Abuja' },
          { name: 'Katampe Hills Estate', budget: 2450000, location: 'Katampe, Abuja' },
          { name: 'Wuse II Towers', budget: 1850000, location: 'Wuse II, Abuja' }
        ]
        
        // Add default projects to Firebase
        for (const project of defaultProjects) {
          await addDoc(collection(db, 'projects'), project)
        }
        
        // Fetch again
        const newSnapshot = await getDocs(collection(db, 'projects'))
        projectsData = newSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      }
      
      setProjects(projectsData)
      
      // Fetch expenses
      const expensesSnapshot = await getDocs(
        query(collection(db, 'expenses'), orderBy('createdAt', 'desc'), limit(10))
      )
      const expensesData = expensesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setExpenses(expensesData)
      
      // Calculate total spent
      const total = expensesData.reduce((sum, exp) => sum + (exp.amount || 0), 0)
      setTotalSpent(total)
      
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Property Tracker</h1>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-600 rounded-lg p-6">
            <h3 className="text-lg opacity-80">Total Spent</h3>
            <p className="text-3xl font-bold">?{(totalSpent/1000000).toFixed(2)}M</p>
          </div>
          <div className="bg-green-600 rounded-lg p-6">
            <h3 className="text-lg opacity-80">Active Projects</h3>
            <p className="text-3xl font-bold">{projects.length}</p>
          </div>
          <div className="bg-purple-600 rounded-lg p-6">
            <h3 className="text-lg opacity-80">Total Budget</h3>
            <p className="text-3xl font-bold">
              ?{(projects.reduce((sum, p) => sum + (p.budget || 0), 0)/1000000).toFixed(2)}M
            </p>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {projects.map(project => {
              // Calculate spent for this project
              const projectExpenses = expenses.filter(e => 
                e.project?.toLowerCase().includes(project.name.toLowerCase().split(' ')[0])
              )
              const spent = projectExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
              const progress = project.budget ? (spent / project.budget * 100) : 0
              
              return (
                <div key={project.id} className="bg-gray-900 rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-4">{project.name}</h3>
                  <div className="space-y-2 text-gray-400">
                    <p>Budget: ?{((project.budget || 0)/1000000).toFixed(2)}M</p>
                    <p>Spent: ?{(spent/1000000).toFixed(2)}M</p>
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span>{progress.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-sm">{projectExpenses.length} transactions</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Expenses */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Recent Expenses</h2>
          <div className="bg-gray-900 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left">Amount</th>
                  <th className="px-6 py-3 text-left">Project</th>
                  <th className="px-6 py-3 text-left">Vendor</th>
                  <th className="px-6 py-3 text-left">Category</th>
                  <th className="px-6 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      No expenses yet. Add expenses via Telegram bot.
                    </td>
                  </tr>
                ) : (
                  expenses.map(expense => (
                    <tr key={expense.id} className="border-t border-gray-800">
                      <td className="px-6 py-4">?{((expense.amount || 0)/1000).toFixed(0)}k</td>
                      <td className="px-6 py-4">{expense.project || 'Unassigned'}</td>
                      <td className="px-6 py-4">{expense.vendor || 'Unknown'}</td>
                      <td className="px-6 py-4">{expense.category || 'Other'}</td>
                      <td className="px-6 py-4">
                        {expense.createdAt ? new Date(expense.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
