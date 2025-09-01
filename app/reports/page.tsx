'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Download, Calendar, TrendingUp, FileText, BarChart, FileSpreadsheet } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/firebase'
import { collection, getDocs } from 'firebase/firestore'

export default function ReportsPage() {
  const router = useRouter()
  const [expenses, setExpenses] = useState([])
  const [projects, setProjects] = useState([])
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [selectedProject, setSelectedProject] = useState('all')
  const [reportData, setReportData] = useState(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    // Load XLSX library from CDN
    const script = document.createElement('script')
    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js'
    document.head.appendChild(script)
    
    fetchData()
  }, [])

  useEffect(() => {
    generateReport()
  }, [expenses, dateRange, selectedProject])

  const fetchData = async () => {
    const expensesSnapshot = await getDocs(collection(db, 'expenses'))
    const expensesData = []
    const projectSet = new Set()
    
    expensesSnapshot.forEach((doc) => {
      const data = { id: doc.id, ...doc.data() }
      expensesData.push(data)
      if (data.project) projectSet.add(data.project)
    })
    
    setExpenses(expensesData)
    setProjects(Array.from(projectSet))
  }

  const generateReport = () => {
    const filtered = expenses.filter(exp => {
      const expDate = new Date(exp.createdAt)
      const inDateRange = expDate >= new Date(dateRange.start) && expDate <= new Date(dateRange.end)
      const inProject = selectedProject === 'all' || exp.project === selectedProject
      return inDateRange && inProject
    })

    const byCategory = {}
    const byVendor = {}
    const byMonth = {}
    let total = 0

    filtered.forEach(exp => {
      total += exp.amount || 0
      
      const cat = exp.category || 'Other'
      byCategory[cat] = (byCategory[cat] || 0) + exp.amount
      
      const vendor = exp.vendor || 'Unknown'
      byVendor[vendor] = (byVendor[vendor] || 0) + exp.amount
      
      const month = new Date(exp.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
      byMonth[month] = (byMonth[month] || 0) + exp.amount
    })

    setReportData({
      total,
      count: filtered.length,
      byCategory: Object.entries(byCategory).sort((a, b) => b[1] - a[1]),
      byVendor: Object.entries(byVendor).sort((a, b) => b[1] - a[1]),
      byMonth: Object.entries(byMonth),
      expenses: filtered
    })
  }

  const exportToExcel = () => {
    setDownloading(true)
    
    try {
      if (typeof window.XLSX === 'undefined') {
        alert('Excel library is loading. Please try again in a moment.')
        setDownloading(false)
        return
      }
      
      const XLSX = window.XLSX
      const wb = XLSX.utils.book_new()
      
      // Use filtered data based on selected project and date range
      const dataToExport = reportData?.expenses || []
      
      // Summary Sheet
      const summaryData = [
        ['PROPERTY TRACKER NIGERIA - EXPENSE REPORT'],
        [''],
        ['Report Date:', new Date().toLocaleDateString()],
        ['Project:', selectedProject === 'all' ? 'All Projects' : selectedProject],
        ['Period:', `${dateRange.start} to ${dateRange.end}`],
        [''],
        ['SUMMARY STATISTICS'],
        ['Total Amount:', `₦${reportData?.total?.toLocaleString() || 0}`],
        ['Total Transactions:', reportData?.count || 0],
        ['Average per Transaction:', `₦${reportData?.count ? Math.round(reportData.total / reportData.count).toLocaleString() : 0}`],
      ]
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
      // Set column widths for summary
      summarySheet['!cols'] = [
        { width: 25 },
        { width: 30 }
      ]
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary')
      
      // Detailed Expenses Sheet (without ID and Millions columns)
      const expensesData = dataToExport.map(exp => ({
        'Date': new Date(exp.createdAt).toLocaleDateString(),
        'Amount (₦)': exp.amount || 0,
        'Vendor/Contractor': exp.vendor || 'Not Specified',
        'Category': exp.category || 'Other',
        'Project': exp.project || 'Unassigned',
        'Source': exp.source || 'Web',
        'Added By': exp.telegramUser || 'System',
        'Description': exp.originalText || exp.description || ''
      }))
      
      const expensesSheet = XLSX.utils.json_to_sheet(expensesData)
      
      // Set professional column widths
      expensesSheet['!cols'] = [
        { width: 12 },  // Date
        { width: 15 },  // Amount
        { width: 25 },  // Vendor
        { width: 15 },  // Category
        { width: 20 },  // Project
        { width: 10 },  // Source
        { width: 15 },  // Added By
        { width: 40 }   // Description
      ]
      
      // Format header row (bold would require more complex styling)
      XLSX.utils.book_append_sheet(wb, expensesSheet, 'Expenses')
      
      // Category Summary Sheet
      if (reportData?.byCategory && reportData.byCategory.length > 0) {
        const categoryData = reportData.byCategory.map(([cat, amount]) => ({
          'Category': cat,
          'Total Amount (₦)': amount,
          'Percentage': ((amount / reportData.total) * 100).toFixed(1) + '%',
          'Transaction Count': dataToExport.filter(e => (e.category || 'Other') === cat).length
        }))
        
        const categorySheet = XLSX.utils.json_to_sheet(categoryData)
        categorySheet['!cols'] = [
          { width: 20 },
          { width: 18 },
          { width: 12 },
          { width: 18 }
        ]
        XLSX.utils.book_append_sheet(wb, categorySheet, 'By Category')
      }
      
      // Vendor Summary Sheet
      if (reportData?.byVendor && reportData.byVendor.length > 0) {
        const vendorData = reportData.byVendor.slice(0, 20).map(([vendor, amount]) => ({
          'Vendor': vendor,
          'Total Amount (₦)': amount,
          'Percentage': ((amount / reportData.total) * 100).toFixed(1) + '%',
          'Transaction Count': dataToExport.filter(e => (e.vendor || 'Unknown') === vendor).length
        }))
        
        const vendorSheet = XLSX.utils.json_to_sheet(vendorData)
        vendorSheet['!cols'] = [
          { width: 30 },
          { width: 18 },
          { width: 12 },
          { width: 18 }
        ]
        XLSX.utils.book_append_sheet(wb, vendorSheet, 'By Vendor')
      }
      
      // Monthly Breakdown Sheet
      if (reportData?.byMonth && reportData.byMonth.length > 0) {
        const monthlyData = reportData.byMonth.map(([month, amount]) => ({
          'Month': month,
          'Total Amount (₦)': amount,
          'Percentage': ((amount / reportData.total) * 100).toFixed(1) + '%'
        }))
        
        const monthlySheet = XLSX.utils.json_to_sheet(monthlyData)
        monthlySheet['!cols'] = [
          { width: 15 },
          { width: 18 },
          { width: 12 }
        ]
        XLSX.utils.book_append_sheet(wb, monthlySheet, 'Monthly')
      }
      
      // Generate filename based on selection
      const projectName = selectedProject === 'all' ? 'AllProjects' : selectedProject.replace(/\s+/g, '_')
      const filename = `PropertyTracker_${projectName}_${new Date().toISOString().split('T')[0]}.xlsx`
      
      XLSX.writeFile(wb, filename)
      
    } catch (error) {
      console.error('Export error:', error)
      alert('Error exporting to Excel. Please try the CSV option.')
    } finally {
      setDownloading(false)
    }
  }

  const exportToCSV = () => {
    const dataToExport = reportData?.expenses || []
    
    const headers = ['Date', 'Amount (Naira)', 'Vendor', 'Category', 'Project', 'Source', 'Added By', 'Description']
    
    const rows = dataToExport.map(exp => [
      new Date(exp.createdAt).toLocaleDateString(),
      exp.amount || 0,
      exp.vendor || 'Not Specified',
      exp.category || 'Other',
      exp.project || 'Unassigned',
      exp.source || 'Web',
      exp.telegramUser || 'System',
      `"${(exp.originalText || exp.description || '').replace(/"/g, '""')}"`
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    
    const projectName = selectedProject === 'all' ? 'AllProjects' : selectedProject.replace(/\s+/g, '_')
    a.download = `PropertyTracker_${projectName}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const formatMoney = (amount) => {
    return `N${(amount / 1000000).toFixed(2)}M`
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
              <h1 className="text-3xl font-bold">Financial Reports</h1>
              <p className="text-gray-400 text-sm mt-1">Generate detailed expense analytics</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <Download className="w-5 h-5" />
              Download CSV
            </button>
            <button
              onClick={exportToExcel}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 rounded-lg transition-colors"
            >
              <FileSpreadsheet className="w-5 h-5" />
              {downloading ? 'Generating...' : 'Download Excel'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-900 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            Report Parameters
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Project</label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All Projects</option>
                {projects.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {reportData && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm opacity-90">Total Spent</p>
                  <TrendingUp className="w-5 h-5" />
                </div>
                <p className="text-3xl font-bold">{formatMoney(reportData.total)}</p>
                <p className="text-sm opacity-90 mt-1">
                  {selectedProject === 'all' ? 'All projects' : selectedProject}
                </p>
              </div>

              <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm opacity-90">Transactions</p>
                  <FileText className="w-5 h-5" />
                </div>
                <p className="text-3xl font-bold">{reportData.count}</p>
                <p className="text-sm opacity-90 mt-1">In selected period</p>
              </div>

              <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm opacity-90">Daily Average</p>
                  <BarChart className="w-5 h-5" />
                </div>
                <p className="text-3xl font-bold">
                  {formatMoney(reportData.total / Math.max(1, Math.ceil((new Date(dateRange.end) - new Date(dateRange.start)) / (1000 * 60 * 60 * 24))))}
                </p>
                <p className="text-sm opacity-90 mt-1">Per day</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
