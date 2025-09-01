'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Users, DollarSign, TrendingUp, Phone, Mail } from 'lucide-react'

export default function VendorsPage() {
  const [vendors, setVendors] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchVendors()
  }, [])

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      const data = await response.json()
      
      if (data.success) {
        // Process vendor data
        const vendorMap = {}
        data.results.forEach(expense => {
          const vendor = expense.vendor || 'Unknown'
          if (!vendorMap[vendor]) {
            vendorMap[vendor] = {
              name: vendor,
              totalAmount: 0,
              transactionCount: 0,
              lastTransaction: expense.createdAt,
              projects: new Set(),
              categories: new Set()
            }
          }
          vendorMap[vendor].totalAmount += expense.amount
          vendorMap[vendor].transactionCount += 1
          vendorMap[vendor].projects.add(expense.project)
          vendorMap[vendor].categories.add(expense.category)
          
          if (new Date(expense.createdAt) > new Date(vendorMap[vendor].lastTransaction)) {
            vendorMap[vendor].lastTransaction = expense.createdAt
          }
        })
        
        const vendorList = Object.values(vendorMap).map(v => ({
          ...v,
          projects: Array.from(v.projects).filter(p => p),
          categories: Array.from(v.categories).filter(c => c)
        })).sort((a, b) => b.totalAmount - a.totalAmount)
        
        setVendors(vendorList)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading vendors...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-400 hover:text-white">
              <ArrowLeft size={24} />
            </Link>
            <h1 className="text-3xl font-bold">Vendors Management</h1>
          </div>
          <input
            type="text"
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white w-64"
          />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Users size={20} />
              <span>Total Vendors</span>
            </div>
            <div className="text-2xl font-bold">{vendors.length}</div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <DollarSign size={20} />
              <span>Total Paid</span>
            </div>
            <div className="text-2xl font-bold text-yellow-400">
              ₦{(vendors.reduce((sum, v) => sum + v.totalAmount, 0) / 1000000).toFixed(2)}M
            </div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <TrendingUp size={20} />
              <span>Avg per Vendor</span>
            </div>
            <div className="text-2xl font-bold text-blue-400">
              ₦{vendors.length > 0 ? ((vendors.reduce((sum, v) => sum + v.totalAmount, 0) / vendors.length) / 1000000).toFixed(2) : 0}M
            </div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="text-gray-400 mb-2">Top Vendor</div>
            <div className="text-lg font-bold text-green-400">
              {vendors[0]?.name || 'N/A'}
            </div>
          </div>
        </div>

        {/* Vendors Table */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Transactions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Projects
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Categories
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Last Transaction
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredVendors.map((vendor, index) => (
                <tr key={index} className="hover:bg-gray-750 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">{vendor.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-yellow-400 font-bold">
                      ₦{(vendor.totalAmount / 1000000).toFixed(2)}M
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-300">{vendor.transactionCount}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-300">
                      {vendor.projects.slice(0, 2).join(', ')}
                      {vendor.projects.length > 2 && ` +${vendor.projects.length - 2}`}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-300">
                      {vendor.categories.slice(0, 2).join(', ')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-400">
                      {new Date(vendor.lastTransaction).toLocaleDateString()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
