'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, query, orderBy, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function HomePage() {
  const [projects, setProjects] = useState([])
  const [expenses, setExpenses] = useState([])
  const [totalSpent, setTotalSpent] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const formatMoney = (amount) => {
    if (!amount) return 'N0'
    const millions = (amount / 1000000).toFixed(2)
    return `N${millions} Million`
  }

  const formatThousands = (amount) => {
    if (!amount) return 'N0'
    return `N${Math.round(amount / 1000).toLocaleString()}k`
  }

  const fetchData = async () => {
    try {
      // Fetch projects
      let projectsSnapshot = await getDocs(collection(db, 'projects'))
      let projectsData = projectsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      // If no projects exist, create default ones
      if (projectsData.length === 0) {
        console.log('Creating default projects...')
        const defaultProjects = [
          { name: 'Maitama Heights', budget: 15000000, location: 'Maitama, Abuja' },
          { name: 'Garki Site', budget: 12000000, location: 'Garki, Abuja' },
          { name: 'Jabi Lakeside', budget: 25000000, location: 'Jabi, Abuja' },
          { name: 'Asokoro Residences', budget: 18000000, location: 'Asokoro, Abuja' },
          { name: 'Katampe Hills', budget: 20000000, location: 'Katampe, Abuja' },
          { name: 'Wuse II Towers', budget: 30000000, location: 'Wuse II, Abuja' }
        ]
        
        for (const project of defaultProjects) {
          await addDoc(collection(db, 'projects'), project)
        }
        
        projectsSnapshot = await getDocs(collection(db, 'projects'))
        projectsData = projectsSnapshot.docs.map(doc => ({
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

  const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0)

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Property Tracker</h1>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-600 rounded-lg p-6">
            <h3 className="text-lg opacity-80">Total Spent</h3>
            <p className="text-2xl font-bold">{formatMoney(totalSpent)}</p>
            <p className="text-sm opacity-70">{expenses.length} expenses</p>
          </div>
          <div className="bg-green-600 rounded-lg p-6">
            <h3 className="text-lg opacity-80">Active Projects</h3>
            <p className="text-3xl font-bold">{projects.length}</p>
            <p className="text-sm opacity-70">All projects</p>
          </div>
          <div className="bg-purple-600 rounded-lg p-6">
            <h3 className="text-lg opacity-80">Total Budget</h3>
            <p className="text-2xl font-bold">{formatMoney(totalBudget)}</p>
            <p className="text-sm opacity-70">Combined budget</p>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {projects.map(project => {
              // Calculate spent for this project
              const projectExpenses = expenses.filter(e => {
                const projectName = project.name.toLowerCase().split(' ')[0]
                return e.project?.toLowerCase().includes(projectName)
              })
              const spent = projectExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
              const progress = project.budget ? (spent / project.budget * 100) : 0
              
              return (
                <div key={project.id} className="bg-gray-900 rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-4">{project.name}</h3>
                  <div className="space-y-2 text-gray-400">
                    <p>Budget: {formatMoney(project.budget)}</p>
                    <p>Spent: {formatMoney(spent)}</p>
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span>{progress.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-sm mt-2">{projectExpenses.length} transactions</p>
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
                      <td className="px-6 py-4">{formatThousands(expense.amount)}</td>
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

        {/* Refresh Button */}
        <button 
          onClick={() => window.location.reload()} 
          className="fixed bottom-8 right-8 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow-lg transition-colors"
        >
          Refresh Data
        </button>
      </div>
    </div>
  )
}
