'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Filter, Download, ArrowLeft } from 'lucide-react'
import { debounce } from 'lodash'
import Link from 'next/link'

export default function SearchInterface() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    projects: [],
    vendors: [],
    dateFrom: '',
    dateTo: '',
    minAmount: '',
    maxAmount: ''
  })
  const [results, setResults] = useState([])
  const [analytics, setAnalytics] = useState({})
  const [loading, setLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  
  const performSearch = useCallback(
    debounce(async (query, currentFilters) => {
      setLoading(true)
      
      try {
        const response = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            ...currentFilters,
            minAmount: currentFilters.minAmount ? parseFloat(currentFilters.minAmount) : undefined,
            maxAmount: currentFilters.maxAmount ? parseFloat(currentFilters.maxAmount) : undefined
          })
        })
        
        const data = await response.json()
        
        if (data.success) {
          setResults(data.results)
          setAnalytics(data.analytics)
        }
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setLoading(false)
      }
    }, 300),
    []
  )
  
  useEffect(() => {
    performSearch(searchQuery, filters)
  }, [searchQuery, filters])
  
  const exportResults = () => {
    const csv = [
      ['Date', 'Amount', 'Vendor', 'Project', 'Category', 'Description'],
      ...results.map(r => [
        new Date(r.createdAt).toLocaleDateString(),
        r.amount,
        r.vendor,
        r.project,
        r.category,
        r.description
      ])
    ].map(row => row.join(',')).join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'expenses.csv'
    a.click()
  }
  
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto p-4">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/" className="text-gray-400 hover:text-white">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-3xl font-bold text-white">Expense Search</h1>
        </div>
        
        <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search expenses, vendors, projects..."
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
            >
              <Filter size={20} />
              Filters
              {Object.values(filters).flat().filter(Boolean).length > 0 && (
                <span className="bg-white text-blue-600 px-2 py-0.5 rounded-full text-sm font-bold">
                  {Object.values(filters).flat().filter(Boolean).length}
                </span>
              )}
            </button>
            <button
              onClick={exportResults}
              className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors"
            >
              <Download size={20} />
              Export
            </button>
          </div>
          
          {showFilters && (
            <div className="mt-4 p-4 border-t border-gray-700 grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Date Range</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                  />
                  <span className="self-center text-gray-400">to</span>
                  <input
                    type="date"
                    className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Amount Range</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400"
                    value={filters.minAmount}
                    onChange={(e) => setFilters({...filters, minAmount: e.target.value})}
                  />
                  <span className="self-center text-gray-400">to</span>
                  <input
                    type="number"
                    placeholder="Max"
                    className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400"
                    value={filters.maxAmount}
                    onChange={(e) => setFilters({...filters, maxAmount: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Searching...</div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No results found</div>
          ) : (
            <div className="divide-y divide-gray-700">
              {results.map((result) => (
                <div key={result.id} className="p-4 hover:bg-gray-750 transition-colors">
                  <div className="flex justify-between">
                    <div>
                      <div className="font-medium text-white">{result.description || 'No description'}</div>
                      <div className="text-sm text-gray-400">
                        {result.vendor} • {result.project} • {result.category}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-yellow-400">
                        N{(result.amount / 1000000).toFixed(2)}M
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(result.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
