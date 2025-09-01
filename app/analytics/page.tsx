'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, TrendingUp, BarChart3, PieChart, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/firebase'
import { collection, getDocs } from 'firebase/firestore'

export default function AnalyticsPage() {
  const router = useRouter()
  const [expenses, setExpenses] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [dateRange, setDateRange] = useState('all')

  useEffect(() => {
    fetchData()
  }, [dateRange])

  const normalizeProjectName = (name) => {
    if (!name) return 'Unassigned'
    
    const nameMap = {
      'maitama': 'Maitama Heights',
      'maitama heights': 'Maitama Heights',
      'garki': 'Garki Site',
      'garki1': 'Garki Site',
      'jabi': 'Jabi Lakeside',
      'jabi lakeside': 'Jabi Lakeside',
      'katampe': 'Katampe Hills Estate',
      'katampe hills estate': 'Katampe Hills Estate',
      'asokoro': 'Asokoro Residences',
      'asokoro residences': 'Asokoro Residences',
      'wuse': 'Wuse II Towers',
      'wuse ii towers': 'Wuse II Towers',
      'test complex': 'Demonstration Site',
      'test': 'Demonstration Site'
    }
    
    const normalized = name.toLowerCase().trim()
    return nameMap[normalized] || name
  }

  const fetchData = async () => {
    const expensesSnapshot = await getDocs(collection(db, 'expenses'))
    const expensesData = []
    
    expensesSnapshot.forEach((doc) => {
      const data = { id: doc.id, ...doc.data() }
      data.project = normalizeProjectName(data.project)
      expensesData.push(data)
    })

    const now = new Date()
    const filtered = expensesData.filter(exp => {
      if (dateRange === 'all') return true
      const expDate = new Date(exp.createdAt)
      
      switch(dateRange) {
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          return expDate >= weekAgo
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          return expDate >= monthAgo
        case 'quarter':
          const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          return expDate >= quarterAgo
        default:
          return true
      }
    })

    setExpenses(filtered)
    calculateAnalytics(filtered)
  }

  const calculateAnalytics = (data) => {
    const byProject = {}
    const byCategory = {}
    const byVendor = {}
    
    data.forEach(exp => {
      const project = exp.project || 'Unassigned'
      byProject[project] = (byProject[project] || 0) + (exp.amount || 0)
      
      const category = exp.category || 'Other'
      byCategory[category] = (byCategory[category] || 0) + (exp.amount || 0)
      
      const vendor = exp.vendor || 'Unknown'
      byVendor[vendor] = (byVendor[vendor] || 0) + (exp.amount || 0)
    })

    const projectEntries = Object.entries(byProject)
      .filter(([name, amount]) => amount > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)

    setAnalytics({
      total: data.reduce((sum, exp) => sum + (exp.amount || 0), 0),
      count: data.length,
      avgExpense: data.length ? data.reduce((sum, exp) => sum + (exp.amount || 0), 0) / data.length : 0,
      byProject: projectEntries,
      byCategory: Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 6),
      byVendor: Object.entries(byVendor).sort((a, b) => b[1] - a[1]).slice(0, 10),
      maxProject: projectEntries.length > 0 ? projectEntries[0][1] : 0
    })
  }

  const getBarHeight = (amount) => {
    if (!analytics || analytics.maxProject === 0) return 0
    return Math.round((amount / analytics.maxProject) * 100)
  }

  const getBarColor = (index) => {
    const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-violet-500', 'bg-amber-500', 'bg-red-500', 'bg-cyan-500', 'bg-pink-500', 'bg-lime-500']
    return colors[index % colors.length]
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
              <p className="text-gray-400 text-sm mt-1">Financial insights and trends</p>
            </div>
          </div>
          
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Time</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="quarter">Last 90 Days</option>
          </select>
        </div>

        {analytics && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6">
                <p className="text-sm opacity-90">Total Spent</p>
                <p className="text-3xl font-bold">₦{(analytics.total / 1000000).toFixed(2)}M</p>
              </div>
              
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6">
                <p className="text-sm opacity-90">Transactions</p>
                <p className="text-3xl font-bold">{analytics.count}</p>
              </div>
              
              <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6">
                <p className="text-sm opacity-90">Active Projects</p>
                <p className="text-3xl font-bold">{analytics.byProject.length}</p>
              </div>
              
              <div className="bg-gradient-to-r from-amber-600 to-amber-700 rounded-xl p-6">
                <p className="text-sm opacity-90">Avg Expense</p>
                <p className="text-3xl font-bold">₦{(analytics.avgExpense / 1000000).toFixed(2)}M</p>
              </div>
            </div>

            {/* Simple Bar Chart */}
            <div className="bg-gray-900 rounded-xl p-6 mb-8">
              <h2 className="text-lg font-semibold mb-6">Expenses by Project</h2>
              <div className="space-y-4">
                {analytics.byProject.map(([name, amount], index) => (
                  <div key={name}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-300">{name}</span>
                      <span className="font-semibold">₦{(amount / 1000000).toFixed(2)}M</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-6">
                      <div 
                        className={`${getBarColor(index)} h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
                        style={{ width: `${getBarHeight(amount)}%` }}
                      >
                        {getBarHeight(amount) > 20 && (
                          <span className="text-xs text-white font-semibold">
                            {Math.round((amount / analytics.total) * 100)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-900 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">Top Categories</h2>
                <div className="space-y-3">
                  {analytics.byCategory.map(([cat, amount]) => (
                    <div key={cat} className="flex justify-between items-center">
                      <span className="text-gray-300">{cat}</span>
                      <span className="font-semibold">₦{(amount / 1000000).toFixed(2)}M</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-gray-900 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">Top Vendors</h2>
                <div className="space-y-3">
                  {analytics.byVendor.slice(0, 6).map(([vendor, amount]) => (
                    <div key={vendor} className="flex justify-between items-center">
                      <span className="text-gray-300 truncate">{vendor}</span>
                      <span className="font-semibold">₦{(amount / 1000000).toFixed(2)}M</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
