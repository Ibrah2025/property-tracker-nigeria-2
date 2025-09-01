"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Download, 
  Filter, 
  Search, 
  Trash2, 
  Calendar,
  Building2,
  DollarSign,
  RefreshCw,
  X
} from 'lucide-react'
import { db } from '@/lib/firebase'
import { collection, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore'
import { formatCurrency } from '@/utils/formatters'

export default function ExpensesPage() {
  const router = useRouter()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterProject, setFilterProject] = useState('all')
  const [totalAmount, setTotalAmount] = useState(0)

  useEffect(() => {
    fetchExpenses()
  }, [])

  const fetchExpenses = async () => {
    setLoading(true)
    try {
      const q = query(collection(db, 'expenses'), orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)
      
      const expensesData = []
      let total = 0
      
      snapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() }
        expensesData.push(data)
        total += data.amount || 0
      })
      
      setExpenses(expensesData)
      setTotalAmount(total)
    } catch (error) {
      console.error('Error fetching expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (expenseId) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      try {
        await deleteDoc(doc(db, 'expenses', expenseId))
        await fetchExpenses()
      } catch (error) {
        console.error('Error deleting expense:', error)
      }
    }
  }

  const exportToExcel = () => {
    const csvContent = [
      ['Date', 'Vendor', 'Project', 'Category', 'Amount', 'Description'],
      ...filteredExpenses.map(e => [
        new Date(e.createdAt || e.date).toLocaleDateString(),
        e.vendor || 'Unknown',
        e.project || '',
        e.category || '',
        e.amount || 0,
        e.description || ''
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  // FIXED: Accurate search function
  const filteredExpenses = expenses.filter(expense => {
    // If there's a search query, check if it matches any field
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase().trim()
      
      // Check all relevant fields for the search term
      const matchesSearch = 
        (expense.vendor && expense.vendor.toLowerCase().includes(searchLower)) ||
        (expense.description && expense.description.toLowerCase().includes(searchLower)) ||
        (expense.category && expense.category.toLowerCase().includes(searchLower)) ||
        (expense.project && expense.project.toLowerCase().includes(searchLower)) ||
        (expense.amount && expense.amount.toString().includes(searchQuery))
      
      // If search doesn't match, exclude this expense
      if (!matchesSearch) return false
    }
    
    // Apply project filter
    const matchesProject = filterProject === 'all' || expense.project === filterProject
    
    return matchesProject
  })

  // Calculate filtered total
  const filteredTotal = filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0)

  const projects = [...new Set(expenses.map(e => e.project).filter(Boolean))]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black flex items-center justify-center">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
          <p className="text-gray-400">Loading expenses...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black text-white">
      {/* Header with Back Button */}
      <div className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-xl border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">All Expenses</h1>
                <p className="text-sm text-gray-400">Complete transaction history</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">
                {searchQuery || filterProject !== 'all' ? 'Filtered' : 'Total'}
              </p>
              <p className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                {formatCurrency(searchQuery || filterProject !== 'all' ? filteredTotal : totalAmount)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl p-4 mb-6 border border-gray-700">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Bar with Clear Button */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search expenses, vendors, projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none text-white placeholder-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            
            {/* Project Filter */}
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none text-white"
            >
              <option value="all">All Projects</option>
              {projects.map(project => (
                <option key={project} value={project}>{project}</option>
              ))}
            </select>
            
            {/* Export Button */}
            <button
              onClick={exportToExcel}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-lg font-medium flex items-center gap-2 transition-all"
            >
              <Download className="w-5 h-5" />
              Export to Excel
            </button>
          </div>
        </div>

        {/* Results Count and Clear Filters */}
        <div className="mb-4 flex justify-between items-center">
          <p className="text-sm text-gray-400">
            {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''} found
            {searchQuery && ` for "${searchQuery}"`}
          </p>
          {(searchQuery || filterProject !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setFilterProject('all')
              }}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Expenses List */}
        {filteredExpenses.length === 0 ? (
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl p-12 text-center border border-gray-700">
            <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-xl text-gray-400 mb-2">
              {searchQuery ? `No results for "${searchQuery}"` : 'No expenses found'}
            </p>
            <p className="text-sm text-gray-500">
              {searchQuery ? 'Try a different search term' : 'Try adjusting your filters'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredExpenses.map(expense => (
              <div key={expense.id} className="bg-gray-800/50 backdrop-blur-xl rounded-xl p-5 border border-gray-700 hover:border-blue-500/50 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium">
                        {expense.project || 'Unassigned'}
                      </span>
                      <span className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm">
                        {expense.category || 'Other'}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">
                      {expense.vendor || 'Unknown Vendor'}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {expense.description || 'No description'}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      {new Date(expense.createdAt || expense.date).toLocaleDateString('en-NG')}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">
                        {formatCurrency(expense.amount)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Expense FAB */}
      <button
        onClick={() => router.push('/add-expense')}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-transform"
      >
        <span className="text-2xl font-bold text-white">+</span>
      </button>
    </div>
  )
}
