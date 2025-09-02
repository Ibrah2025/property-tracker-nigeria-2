'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, query, orderBy, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function HomePage() {
  const [projects, setProjects] = useState([])
  const [expenses, setExpenses] = useState([])
  const [totalSpent, setTotalSpent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // Auto-refresh every 30 seconds
    return () => clearInterval(interval)
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
          { name: 'Maitama Heights', budget: 15000000, location: 'Maitama, Abuja', status: 'active' },
          { name: 'Garki Site', budget: 12000000, location: 'Garki, Abuja', status: 'active' },
          { name: 'Jabi Lakeside', budget: 25000000, location: 'Jabi, Abuja', status: 'active' },
          { name: 'Asokoro Residences', budget: 18000000, location: 'Asokoro, Abuja', status: 'active' },
          { name: 'Katampe Hills', budget: 20000000, location: 'Katampe, Abuja', status: 'active' },
          { name: 'Wuse II Towers', budget: 30000000, location: 'Wuse II, Abuja', status: 'active' }
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
        query(collection(db, 'expenses'), orderBy('createdAt', 'desc'), limit(50))
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

  const getFilteredExpenses = () => {
    const now = new Date()
    switch(activeTab) {
      case 'today':
        return expenses.filter(e => {
          const expDate = new Date(e.createdAt)
          return expDate.toDateString() === now.toDateString()
        })
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return expenses.filter(e => new Date(e.createdAt) >= weekAgo)
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        return expenses.filter(e => new Date(e.createdAt) >= monthAgo)
      default:
        return expenses
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-3xl font-bold mb-4">Property Tracker</div>
          <div className="text-gray-400">Loading dashboard...</div>
        </div>
      </div>
    )
  }

  const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0)
  const filteredExpenses = getFilteredExpenses()
  const activeProjects = projects.filter(p => p.status === 'active').length

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Property Tracker</h1>
            <div className="flex items-center gap-4">
              <span className="text-gray-400">Premium Construction Management</span>
              <button 
                onClick={fetchData}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 shadow-xl">
            <h3 className="text-lg opacity-90 mb-2">Total Spent</h3>
            <p className="text-3xl font-bold">{formatMoney(totalSpent)}</p>
            <p className="text-sm opacity-75 mt-2">{expenses.length} expenses recorded</p>
          </div>
          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-6 shadow-xl">
            <h3 className="text-lg opacity-90 mb-2">Active Projects</h3>
            <p className="text-3xl font-bold">{activeProjects}</p>
            <p className="text-sm opacity-75 mt-2">of {projects.length} total</p>
          </div>
          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-6 shadow-xl">
            <h3 className="text-lg opacity-90 mb-2">Total Budget</h3>
            <p className="text-3xl font-bold">{formatMoney(totalBudget)}</p>
            <p className="text-sm opacity-75 mt-2">Combined budget</p>
          </div>
          <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl p-6 shadow-xl">
            <h3 className="text-lg opacity-90 mb-2">Budget Used</h3>
            <p className="text-3xl font-bold">{((totalSpent/totalBudget)*100).toFixed(1)}%</p>
            <p className="text-sm opacity-75 mt-2">Overall progress</p>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <span className="mr-3">Projects</span>
            <span className="text-sm font-normal text-gray-400">Track development status</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {projects.map(project => {
              const projectExpenses = expenses.filter(e => {
                const projectName = project.name.toLowerCase().split(' ')[0]
                return e.project?.toLowerCase().includes(projectName)
              })
              const spent = projectExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
              const progress = project.budget ? (spent / project.budget * 100) : 0
              
              return (
                <div key={project.id} className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-gray-700 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-semibold">{project.name}</h3>
                    <span className={`px-2 py-1 rounded text-xs ${
                      progress >= 90 ? 'bg-red-900 text-red-300' : 
                      progress >= 70 ? 'bg-yellow-900 text-yellow-300' : 
                      'bg-green-900 text-green-300'
                    }`}>
                      {progress >= 90 ? 'Critical' : progress >= 70 ? 'Warning' : 'On Track'}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-gray-400">
                      <span>Budget:</span>
                      <span className="text-white font-medium">{formatMoney(project.budget)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Spent:</span>
                      <span className="text-white font-medium">{formatMoney(spent)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Location:</span>
                      <span className="text-white">{project.location}</span>
                    </div>
                    <div className="pt-3 border-t border-gray-800">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">Progress</span>
                        <span className="font-medium">{progress.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${
                            progress >= 90 ? 'bg-red-500' : 
                            progress >= 70 ? 'bg-yellow-500' : 
                            'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      <div className="mt-3 flex justify-between text-sm text-gray-400">
                        <span>{projectExpenses.length} transactions</span>
                        <span>{project.budget ? `N${((project.budget - spent)/1000000).toFixed(1)}M left` : ''}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Expenses Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Recent Expenses</h2>
            <div className="flex gap-2">
              {['all', 'today', 'week', 'month'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg capitalize transition-all ${
                    activeTab === tab 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {tab === 'all' ? 'All Time' : tab}
                </button>
              ))}
            </div>
          </div>
          
          <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 uppercase tracking-wider">Project</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 uppercase tracking-wider">Vendor</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 uppercase tracking-wider">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                        No expenses found for this period. Add expenses via Telegram bot @proptrack_ng_bot
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.slice(0, 20).map(expense => (
                      <tr key={expense.id} className="hover:bg-gray-800 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {expense.createdAt ? new Date(expense.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-green-400 font-medium">{formatThousands(expense.amount)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 bg-blue-900 text-blue-300 rounded text-sm">
                            {expense.project || 'Unassigned'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{expense.vendor || 'Unknown'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 bg-gray-800 rounded text-sm">
                            {expense.category || 'Other'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-gray-400 text-sm">
                            {expense.source === 'telegram' ? 'Telegram' : expense.source || 'Manual'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {filteredExpenses.length > 20 && (
              <div className="px-6 py-3 bg-gray-800 text-center text-sm text-gray-400">
                Showing 20 of {filteredExpenses.length} expenses
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="fixed bottom-8 right-8 flex flex-col gap-3">
          <button 
            onClick={() => window.open('https://t.me/proptrack_ng_bot', '_blank')}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg shadow-lg transition-all hover:scale-105 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.657-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
            </svg>
            Add via Telegram
          </button>
          <button 
            onClick={fetchData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow-lg transition-all hover:scale-105"
          >
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  )
}
