'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, TrendingUp, DollarSign, CheckCircle, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/firebase'
import { collection, addDoc, getDocs, updateDoc, doc, query, where } from 'firebase/firestore'

export default function SalesPage() {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [sales, setSales] = useState([])
  const [projects, setProjects] = useState([])
  const [projectExpenses, setProjectExpenses] = useState({})
  const [soldProjects, setSoldProjects] = useState(new Set())
  const [sale, setSale] = useState({
    project: '',
    salePrice: '',
    buyer: '',
    saleDate: new Date().toISOString().split('T')[0],
    paymentStatus: 'full',
    notes: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    // Get all sales
    const salesSnapshot = await getDocs(collection(db, 'sales'))
    const salesData = []
    const soldProjectsSet = new Set()
    
    salesSnapshot.forEach((doc) => {
      const data = { id: doc.id, ...doc.data() }
      salesData.push(data)
      if (data.status === 'sold') {
        soldProjectsSet.add(data.project)
      }
    })
    setSales(salesData)
    setSoldProjects(soldProjectsSet)
    
    // Get all expenses to calculate project costs
    const expensesSnapshot = await getDocs(collection(db, 'expenses'))
    const projectTotals = {}
    const projectSet = new Set()
    
    expensesSnapshot.forEach((doc) => {
      const data = doc.data()
      if (data.project) {
        projectSet.add(data.project)
        projectTotals[data.project] = (projectTotals[data.project] || 0) + (data.amount || 0)
      }
    })
    
    setProjects(Array.from(projectSet))
    setProjectExpenses(projectTotals)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (soldProjects.has(sale.project)) {
      alert('This property has already been sold!')
      return
    }
    
    try {
      const saleData = {
        ...sale,
        salePrice: parseFloat(sale.salePrice) || 0,
        cost: projectExpenses[sale.project] || 0,
        profit: (parseFloat(sale.salePrice) || 0) - (projectExpenses[sale.project] || 0),
        status: 'sold',
        createdAt: new Date().toISOString()
      }
      
      await addDoc(collection(db, 'sales'), saleData)
      
      // Mark project as sold in a separate collection for quick lookup
      await addDoc(collection(db, 'sold_projects'), {
        project: sale.project,
        soldDate: sale.saleDate,
        saleId: saleData.id,
        createdAt: new Date().toISOString()
      })
      
      alert(`✅ ${sale.project} marked as SOLD!\n\nNo further expenses can be added to this property.`)
      
      setShowForm(false)
      setSale({
        project: '',
        salePrice: '',
        buyer: '',
        saleDate: new Date().toISOString().split('T')[0],
        paymentStatus: 'full',
        notes: ''
      })
      fetchData()
    } catch (error) {
      alert('Error saving sale: ' + error.message)
    }
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
              <h1 className="text-3xl font-bold">Sales & Profit Tracking</h1>
              <p className="text-gray-400 text-sm mt-1">Track property sales and calculate profits</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Record Sale
          </button>
        </div>

        {/* Add Sale Form */}
        {showForm && (
          <div className="bg-gray-900 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Record Property Sale</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Project *</label>
                  <select
                    value={sale.project}
                    onChange={(e) => setSale({...sale, project: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                    required
                  >
                    <option value="">Select Project</option>
                    {projects.filter(p => !soldProjects.has(p)).map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  {sale.project && projectExpenses[sale.project] && (
                    <p className="text-xs text-gray-400 mt-1">
                      Cost: ₦{(projectExpenses[sale.project] / 1000000).toFixed(2)}M
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Sale Price (₦) *</label>
                  <input
                    type="number"
                    value={sale.salePrice}
                    onChange={(e) => setSale({...sale, salePrice: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                    required
                  />
                  {sale.project && sale.salePrice && (
                    <p className="text-xs mt-1">
                      <span className={parseFloat(sale.salePrice) > (projectExpenses[sale.project] || 0) ? 'text-green-400' : 'text-red-400'}>
                        Profit: ₦{((parseFloat(sale.salePrice) - (projectExpenses[sale.project] || 0)) / 1000000).toFixed(2)}M
                      </span>
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Buyer *</label>
                  <input
                    type="text"
                    value={sale.buyer}
                    onChange={(e) => setSale({...sale, buyer: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Sale Date *</label>
                  <input
                    type="date"
                    value={sale.saleDate}
                    onChange={(e) => setSale({...sale, saleDate: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>
              
              <button
                type="submit"
                className="w-full md:w-auto px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                Mark as Sold & Lock Property
              </button>
            </form>
          </div>
        )}

        {/* Projects Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6">
            <p className="text-sm opacity-90">Active Properties</p>
            <p className="text-3xl font-bold">{projects.length - soldProjects.size}</p>
            <p className="text-sm opacity-90 mt-1">Can receive expenses</p>
          </div>
          
          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6">
            <p className="text-sm opacity-90">Sold Properties</p>
            <p className="text-3xl font-bold">{soldProjects.size}</p>
            <p className="text-sm opacity-90 mt-1">Locked from expenses</p>
          </div>
          
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6">
            <p className="text-sm opacity-90">Total Profit</p>
            <p className="text-3xl font-bold">
              ₦{(sales.reduce((sum, s) => sum + (s.profit || 0), 0) / 1000000).toFixed(2)}M
            </p>
            <p className="text-sm opacity-90 mt-1">All sales</p>
          </div>
        </div>

        {/* Sales History */}
        <div className="bg-gray-900 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Sales History</h2>
          {sales.length === 0 ? (
            <p className="text-gray-400">No sales recorded yet</p>
          ) : (
            <div className="space-y-4">
              {sales.map((sale) => (
                <div key={sale.id} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{sale.project}</h3>
                        <span className="px-2 py-1 bg-green-900/50 text-green-400 text-xs rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          SOLD
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">Buyer: {sale.buyer}</p>
                      <p className="text-sm text-gray-400">Date: {new Date(sale.saleDate).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Sale Price</p>
                      <p className="text-xl font-bold">₦{(sale.salePrice / 1000000).toFixed(2)}M</p>
                      <p className="text-sm mt-1">
                        <span className={sale.profit > 0 ? 'text-green-400' : 'text-red-400'}>
                          Profit: ₦{(sale.profit / 1000000).toFixed(2)}M
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Warning for Sold Properties */}
        {soldProjects.size > 0 && (
          <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div>
                <p className="text-yellow-400 font-semibold">Sold Properties Notice</p>
                <p className="text-sm text-gray-300 mt-1">
                  The following properties are SOLD and locked: {Array.from(soldProjects).join(', ')}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  No expenses can be added to these properties via web or Telegram bot.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
