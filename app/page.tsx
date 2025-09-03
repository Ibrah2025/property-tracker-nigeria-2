'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, limit, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { offlineQueue } from '@/lib/offlineQueue' 

export default function HomePage() {
  // State Management
  const [projects, setProjects] = useState([])
  const [expenses, setExpenses] = useState([])
  const [vendors, setVendors] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  // Removed auto-creation flag
  const [activeTab, setActiveTab] = useState('dashboard')
  const [timeFilter, setTimeFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProject, setSelectedProject] = useState('all')
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [showAddProject, setShowAddProject] = useState(false)
  const [showAddVendor, setShowAddVendor] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [editingProject, setEditingProject] = useState(null)
  const [editingVendor, setEditingVendor] = useState(null)
  const [viewingProject, setViewingProject] = useState(null)
  const [notifications, setNotifications] = useState([])
  
  // Form States
  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    project: '',
    vendor: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  })
  
  const [projectForm, setProjectForm] = useState({
    name: '',
    budget: '',
    location: '',
    startDate: '',
    endDate: '',
    contractor: '',
    status: 'active',
    description: ''
  })

  const [vendorForm, setVendorForm] = useState({
    name: '',
    type: '',
    contact: '',
    email: '',
    address: ''
  })

  // Load data on mount
  useEffect(() => {
    fetchAllData()
    const interval = setInterval(fetchAllData, 300000)
    return () => clearInterval(interval)
  }, [])

  // Check for budget alerts
  useEffect(() => {
    checkBudgetAlerts()
  }, [projects, expenses])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      
      // Fetch projects
      let projectsSnapshot = await getDocs(collection(db, 'projects'))
      let projectsData = projectsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      // Projects loaded from database - no default creation
      
      setProjects(projectsData)
      
      // Fetch expenses
      const expensesSnapshot = await getDocs(
        query(collection(db, 'expenses'), orderBy('createdAt', 'desc'))
      )
      const expensesData = expensesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setExpenses(expensesData)
      
      // Fetch vendors
      const vendorsSnapshot = await getDocs(collection(db, 'vendors'))
      let vendorsData = vendorsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      // Create default vendors if none exist
      if (vendorsData.length === 0) {
        const defaultVendors = [
          { name: 'Dangote', type: 'Cement Supplier', contact: '080-DANGOTE', email: 'sales@dangote.com' },
          { name: 'BUA', type: 'Cement Supplier', contact: '080-BUA', email: 'info@bua.com' },
          { name: 'Julius Berger', type: 'Contractor', contact: '080-JB', email: 'contact@juliusberger.com' },
          { name: 'Emos', type: 'Materials', contact: '080-EMOS', email: 'sales@emos.ng' },
          { name: 'Schneider', type: 'Electrical', contact: '080-SCHNEIDER', email: 'info@schneider.com' }
        ]
        
        for (const vendor of defaultVendors) {
          await addDoc(collection(db, 'vendors'), vendor)
        }
        
        vendorsSnapshot = await getDocs(collection(db, 'vendors'))
        vendorsData = vendorsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      }
      setVendors(vendorsData)
      
      // Set default categories
      const defaultCategories = [
        'Cement', 'Blocks', 'Sand', 'Labour', 'Transport', 
        'Wood', 'Roofing', 'Electrical', 'Plumbing', 'Paint', 
        'Tiles', 'Doors/Windows', 'Iron/Steel', 'Granite', 'Other'
      ]
      setCategories(defaultCategories)
      
    } catch (error) {
      console.error('Error fetching data:', error)
      showNotification('error', 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const checkBudgetAlerts = () => {
    const alerts = []
    projects.forEach(project => {
      const projectExpenses = getProjectExpenses(project.name)
      const spent = projectExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
      const percentage = (spent / project.budget) * 100
      
      if (percentage >= 90) {
        alerts.push({
          type: 'critical',
          message: `${project.name} has used ${percentage.toFixed(1)}% of budget`,
          project: project.name
        })
      } else if (percentage >= 75) {
        alerts.push({
          type: 'warning',
          message: `${project.name} approaching budget limit (${percentage.toFixed(1)}%)`,
          project: project.name
        })
      }
    })
    
    if (alerts.length > 0) {
      setNotifications(alerts)
    }
  }

  const showNotification = (type, message) => {
    const newNotif = { type, message, id: Date.now() }
    setNotifications(prev => [...prev, newNotif])
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotif.id))
    }, 5000)
  }

  // Helper Functions
  const formatMoney = (amount) => {
    if (!amount) return 'N0'
    if (amount >= 1000000) return `N${(amount/1000000).toFixed(2)} Million`
    if (amount >= 1000) return `N${Math.round(amount/1000).toLocaleString()}k`
    return `N${amount.toLocaleString()}`
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    })
  }

  const getProjectExpenses = (projectName) => {
    return expenses.filter(e => e.project === projectName)
  }

  const getFilteredExpenses = () => {
    let filtered = expenses
    
    // Time filter
    const now = new Date()
    switch(timeFilter) {
      case 'today':
        filtered = filtered.filter(e => {
          const expDate = new Date(e.createdAt || e.date)
          return expDate.toDateString() === now.toDateString()
        })
        break
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        filtered = filtered.filter(e => new Date(e.createdAt || e.date) >= weekAgo)
        break
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        filtered = filtered.filter(e => new Date(e.createdAt || e.date) >= monthAgo)
        break
      case 'quarter':
        const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        filtered = filtered.filter(e => new Date(e.createdAt || e.date) >= quarterAgo)
        break
    }
    
    // Project filter
    if (selectedProject !== 'all') {
      filtered = filtered.filter(e => e.project === selectedProject)
    }
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(e => 
        e.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.project?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    return filtered
  }

  // CRUD Operations
  const handleAddExpense = async () => {
    if (!expenseForm.amount || !expenseForm.project) {
      showNotification('error', 'Amount and Project are required')
      return
    }
    
    try {
      await addDoc(collection(db, 'expenses'), {
        ...expenseForm,
        amount: parseFloat(expenseForm.amount),
        createdAt: new Date().toISOString(),
        source: 'web'
      })
      
      setShowAddExpense(false)
      setExpenseForm({
        amount: '',
        project: '',
        vendor: '',
        category: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      })
      
      await fetchAllData()
      showNotification('success', 'Expense added successfully')
    } catch (error) {
      console.error('Error adding expense:', error)
      showNotification('error', 'Failed to add expense')
    }
  }

  const handleUpdateExpense = async () => {
    try {
      await updateDoc(doc(db, 'expenses', editingExpense.id), {
        ...editingExpense,
        updatedAt: new Date().toISOString()
      })
      
      setEditingExpense(null)
      await fetchAllData()
      showNotification('success', 'Expense updated successfully')
    } catch (error) {
      console.error('Error updating expense:', error)
      showNotification('error', 'Failed to update expense')
    }
  }

  const handleDeleteExpense = async (id) => {
    if (!confirm('Are you sure you want to delete this expense?')) return
    
    try {
      await deleteDoc(doc(db, 'expenses', id))
      await fetchAllData()
      showNotification('success', 'Expense deleted successfully')
    } catch (error) {
      console.error('Error deleting expense:', error)
      showNotification('error', 'Failed to delete expense')
    }
  }

  const handleAddProject = async () => {
    if (!projectForm.name || !projectForm.budget) {
      showNotification('error', 'Name and Budget are required')
      return
    }
    
    try {
      await addDoc(collection(db, 'projects'), {
        ...projectForm,
        budget: parseFloat(projectForm.budget),
        createdAt: new Date().toISOString()
      })
      
      setShowAddProject(false)
      setProjectForm({
        name: '',
        budget: '',
        location: '',
        startDate: '',
        endDate: '',
        contractor: '',
        status: 'active',
        description: ''
      })
      
      await fetchAllData()
      showNotification('success', 'Project added successfully')
    } catch (error) {
      console.error('Error adding project:', error)
      showNotification('error', 'Failed to add project')
    }
  }

  const handleUpdateProject = async () => {
    try {
      await updateDoc(doc(db, 'projects', editingProject.id), {
        ...editingProject,
        budget: parseFloat(editingProject.budget),
        updatedAt: new Date().toISOString()
      })
      
      setEditingProject(null)
      await fetchAllData()
      showNotification('success', 'Project updated successfully')
    } catch (error) {
      console.error('Error updating project:', error)
      showNotification('error', 'Failed to update project')
    }
  }

  const handleDeleteProject = async (id) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) return
    
    try {
      await deleteDoc(doc(db, 'projects', id))
      await fetchAllData()
      showNotification('success', 'Project deleted successfully')
    } catch (error) {
      console.error('Error deleting project:', error)
      showNotification('error', 'Failed to delete project')
    }
  }

  const handleAddVendor = async () => {
    if (!vendorForm.name) {
      showNotification('error', 'Vendor name is required')
      return
    }
    
    try {
      await addDoc(collection(db, 'vendors'), {
        ...vendorForm,
        createdAt: new Date().toISOString()
      })
      
      setShowAddVendor(false)
      setVendorForm({
        name: '',
        type: '',
        contact: '',
        email: '',
        address: ''
      })
      
      await fetchAllData()
      showNotification('success', 'Vendor added successfully')
    } catch (error) {
      console.error('Error adding vendor:', error)
      showNotification('error', 'Failed to add vendor')
    }
  }

  const handleUpdateVendor = async () => {
    try {
      await updateDoc(doc(db, 'vendors', editingVendor.id), {
        ...editingVendor,
        updatedAt: new Date().toISOString()
      })
      
      setEditingVendor(null)
      await fetchAllData()
      showNotification('success', 'Vendor updated successfully')
    } catch (error) {
      console.error('Error updating vendor:', error)
      showNotification('error', 'Failed to update vendor')
    }
  }

  const handleDeleteVendor = async (id) => {
    if (!confirm('Are you sure you want to delete this vendor?')) return
    
    try {
      await deleteDoc(doc(db, 'vendors', id))
      await fetchAllData()
      showNotification('success', 'Vendor deleted successfully')
    } catch (error) {
      console.error('Error deleting vendor:', error)
      showNotification('error', 'Failed to delete vendor')
    }
  }

  const exportToPDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      
      const doc = new jsPDF()
      
      // Title
      doc.setFontSize(20)
      doc.text('Property Tracker Report', 14, 15)
      doc.setFontSize(10)
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 25)
      
      // Summary Stats
      const stats = calculateStats()
      doc.setFontSize(12)
      doc.text('Summary Statistics', 14, 35)
      doc.setFontSize(10)
      doc.text(`Total Spent: ${formatMoney(stats.totalSpent)}`, 14, 42)
      doc.text(`Total Budget: ${formatMoney(stats.totalBudget)}`, 14, 48)
      doc.text(`Active Projects: ${stats.activeProjects}`, 14, 54)
      doc.text(`Total Expenses: ${stats.totalExpenses}`, 14, 60)
      
      // Expenses Table
      const expensesData = getFilteredExpenses().map(e => [
        e.date || new Date(e.createdAt).toLocaleDateString(),
        formatMoney(e.amount),
        e.project || 'Unassigned',
        e.vendor || 'Unknown',
        e.category || 'Other'
      ])
      
      autoTable(doc, {
        head: [['Date', 'Amount', 'Project', 'Vendor', 'Category']],
        body: expensesData,
        startY: 70,
        theme: 'grid',
        headStyles: { fillColor: [31, 41, 55] }
      })
      
      // Projects Summary - New Page
      doc.addPage()
      doc.setFontSize(16)
      doc.text('Projects Summary', 14, 15)
      
      const projectsData = projects.map(p => {
        const projectExpenses = getProjectExpenses(p.name)
        const spent = projectExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
        return [
          p.name,
          formatMoney(p.budget),
          formatMoney(spent),
          formatMoney(p.budget - spent),
          `${((spent/p.budget)*100).toFixed(1)}%`
        ]
      })
      
      autoTable(doc, {
        head: [['Project', 'Budget', 'Spent', 'Remaining', 'Progress']],
        body: projectsData,
        startY: 25,
        theme: 'grid',
        headStyles: { fillColor: [31, 41, 55] }
      })
      
      // Save PDF
      const date = new Date().toISOString().split('T')[0]
      doc.save(`PropertyTracker_${date}.pdf`)
      
      showNotification('success', 'PDF downloaded successfully')
    } catch (error) {
      console.error('Error exporting to PDF:', error)
      showNotification('error', 'Failed to export PDF')
    }
  }

  const exportComprehensivePDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      
      const doc = new jsPDF()
      let yPosition = 15
      
      // Cover Page
      doc.setFontSize(24)
      doc.text('PROPERTY TRACKER', 105, yPosition, { align: 'center' })
      yPosition += 10
      doc.setFontSize(16)
      doc.text('Construction Management Report', 105, yPosition, { align: 'center' })
      yPosition += 10
      doc.setFontSize(12)
      doc.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 105, yPosition, { align: 'center' })
      
      // Executive Summary
      yPosition += 20
      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      doc.text('EXECUTIVE SUMMARY', 14, yPosition)
      doc.setFont(undefined, 'normal')
      yPosition += 10
      
      const stats = calculateStats()
      doc.setFontSize(10)
      const summaryData = [
        [`Total Budget: ${formatMoney(stats.totalBudget)}`, `Total Spent: ${formatMoney(stats.totalSpent)}`],
        [`Budget Utilization: ${stats.budgetUsed.toFixed(1)}%`, `Budget Remaining: ${formatMoney(stats.totalBudget - stats.totalSpent)}`],
        [`Active Projects: ${stats.activeProjects}`, `Completed Projects: ${stats.completedProjects}`],
        [`Total Expenses: ${stats.totalExpenses}`, `Average Expense: ${formatMoney(stats.averageExpense)}`]
      ]
      
      summaryData.forEach(row => {
        doc.text(row[0], 14, yPosition)
        doc.text(row[1], 110, yPosition)
        yPosition += 7
      })
      
      // Projects Detailed Analysis
      doc.addPage()
      doc.setFontSize(16)
      doc.text('PROJECTS ANALYSIS', 14, 15)
      
      const projectsData = projects.map(p => {
        const projectExpenses = getProjectExpenses(p.name)
        const spent = projectExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
        return [
          p.name,
          formatMoney(p.budget),
          formatMoney(spent),
          formatMoney(p.budget - spent),
          `${((spent/p.budget)*100).toFixed(1)}%`,
          p.status || 'Active'
        ]
      })
      
      autoTable(doc, {
        head: [['Project', 'Budget', 'Spent', 'Remaining', 'Progress', 'Status']],
        body: projectsData,
        startY: 25,
        theme: 'striped',
        headStyles: { 
          fillColor: [31, 41, 55],
          fontSize: 10,
          fontStyle: 'bold'
        },
        styles: { fontSize: 9 }
      })
      
      // Expenses Detailed List
      doc.addPage()
      doc.setFontSize(16)
      doc.text('EXPENSES DETAILED REPORT', 14, 15)
      
      const expensesData = getFilteredExpenses().map(e => [
        e.date || new Date(e.createdAt).toLocaleDateString(),
        formatMoney(e.amount),
        e.project || 'Unassigned',
        e.vendor || 'Unknown',
        e.category || 'Other',
        e.description || '',
        e.source || 'Web'
      ])
      
      autoTable(doc, {
        head: [['Date', 'Amount', 'Project', 'Vendor', 'Category', 'Description', 'Source']],
        body: expensesData,
        startY: 25,
        theme: 'striped',
        headStyles: { 
          fillColor: [31, 41, 55],
          fontSize: 9,
          fontStyle: 'bold'
        },
        styles: { 
          fontSize: 8,
          cellPadding: 2
        },
        columnStyles: {
          5: { cellWidth: 40 }
        }
      })
      
      // Vendors Analysis
      doc.addPage()
      doc.setFontSize(16)
      doc.text('VENDORS ANALYSIS', 14, 15)
      
      const vendorsData = vendors.map(v => {
        const vendorExpenses = expenses.filter(e => e.vendor === v.name)
        const totalSpent = vendorExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
        return [
          v.name,
          v.type || 'General',
          v.contact || 'N/A',
          v.email || 'N/A',
          vendorExpenses.length.toString(),
          formatMoney(totalSpent)
        ]
      })
      
      autoTable(doc, {
        head: [['Vendor', 'Type', 'Contact', 'Email', 'Transactions', 'Total Spent']],
        body: vendorsData,
        startY: 25,
        theme: 'striped',
        headStyles: { 
          fillColor: [31, 41, 55],
          fontSize: 10,
          fontStyle: 'bold'
        },
        styles: { fontSize: 9 }
      })
      
      // Category Analysis
      doc.addPage()
      doc.setFontSize(16)
      doc.text('CATEGORY BREAKDOWN', 14, 15)
      
      const categoryTotals = getCategoryTotals()
      const categoryData = categoryTotals.map(([category, amount]) => [
        category,
        formatMoney(amount),
        `${((amount/stats.totalSpent)*100).toFixed(1)}%`
      ])
      
      autoTable(doc, {
        head: [['Category', 'Total Spent', 'Percentage']],
        body: categoryData,
        startY: 25,
        theme: 'striped',
        headStyles: { 
          fillColor: [31, 41, 55],
          fontSize: 10,
          fontStyle: 'bold'
        },
        styles: { fontSize: 9 }
      })
      
      // Monthly Trend
      doc.addPage()
      doc.setFontSize(16)
      doc.text('MONTHLY SPENDING TREND', 14, 15)
      
      const monthlyData = getMonthlyTrend().map(item => [
        item.month,
        formatMoney(item.amount)
      ])
      
      autoTable(doc, {
        head: [['Month', 'Amount Spent']],
        body: monthlyData,
        startY: 25,
        theme: 'striped',
        headStyles: { 
          fillColor: [31, 41, 55],
          fontSize: 10,
          fontStyle: 'bold'
        },
        styles: { fontSize: 9 }
      })
      
      // Footer on last page
      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.text(`Page ${i} of ${pageCount}`, 105, 285, { align: 'center' })
        doc.text('Property Tracker - Construction Management System', 105, 290, { align: 'center' })
      }
      
      // Save PDF
      const date = new Date().toISOString().split('T')[0]
      doc.save(`PropertyTracker_Complete_Report_${date}.pdf`)
      
      showNotification('success', 'Comprehensive PDF report downloaded successfully')
    } catch (error) {
      console.error('Error exporting comprehensive PDF:', error)
      showNotification('error', 'Failed to export PDF report')
    }
  }

  // Export Function
  const exportToExcel = async () => {
    try {
      const XLSX = await import('xlsx')
      
      // Prepare expenses data
      const expensesData = getFilteredExpenses().map(e => ({
        Date: e.date || new Date(e.createdAt).toLocaleDateString(),
        Amount: e.amount,
        Project: e.project || 'Unassigned',
        Vendor: e.vendor || 'Unknown',
        Category: e.category || 'Other',
        Description: e.description || '',
        Source: e.source || 'Web'
      }))
      
      // Prepare projects data
      const projectsData = projects.map(p => {
        const projectExpenses = getProjectExpenses(p.name)
        const spent = projectExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
        return {
          Name: p.name,
          Budget: p.budget,
          Spent: spent,
          Remaining: p.budget - spent,
          Progress: `${((spent/p.budget)*100).toFixed(1)}%`,
          Status: p.status,
          Location: p.location,
          Contractor: p.contractor || 'N/A',
          StartDate: p.startDate || 'N/A',
          EndDate: p.endDate || 'N/A'
        }
      })
      
      // Prepare vendors data
      const vendorsData = vendors.map(v => {
        const vendorExpenses = expenses.filter(e => e.vendor === v.name)
        const totalSpent = vendorExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
        return {
          Name: v.name,
          Type: v.type || 'N/A',
          Contact: v.contact || 'N/A',
          Email: v.email || 'N/A',
          TotalTransactions: vendorExpenses.length,
          TotalSpent: totalSpent
        }
      })
      
      // Create workbook
      const wb = XLSX.utils.book_new()
      
      // Add sheets with auto-width
      const wsExpenses = XLSX.utils.json_to_sheet(expensesData)
      const wsProjects = XLSX.utils.json_to_sheet(projectsData)
      const wsVendors = XLSX.utils.json_to_sheet(vendorsData)
      
      // Auto-adjust column widths for Expenses sheet
      const expenseCols = [
        { wch: 12 }, // Date
        { wch: 12 }, // Amount
        { wch: 20 }, // Project
        { wch: 15 }, // Vendor
        { wch: 12 }, // Category
        { wch: 30 }, // Description
        { wch: 10 }  // Source
      ]
      wsExpenses['!cols'] = expenseCols
      
      // Auto-adjust column widths for Projects sheet
      const projectCols = [
        { wch: 20 }, // Name
        { wch: 12 }, // Budget
        { wch: 12 }, // Spent
        { wch: 12 }, // Remaining
        { wch: 10 }, // Progress
        { wch: 10 }, // Status
        { wch: 20 }, // Location
        { wch: 20 }, // Contractor
        { wch: 12 }, // StartDate
        { wch: 12 }  // EndDate
      ]
      wsProjects['!cols'] = projectCols
      
      // Auto-adjust column widths for Vendors sheet
      const vendorCols = [
        { wch: 20 }, // Name
        { wch: 15 }, // Type
        { wch: 15 }, // Contact
        { wch: 25 }, // Email
        { wch: 15 }, // TotalTransactions
        { wch: 12 }  // TotalSpent
      ]
      wsVendors['!cols'] = vendorCols
      
      XLSX.utils.book_append_sheet(wb, wsExpenses, 'Expenses')
      XLSX.utils.book_append_sheet(wb, wsProjects, 'Projects')
      XLSX.utils.book_append_sheet(wb, wsVendors, 'Vendors')
      
      // Generate filename with date
      const date = new Date().toISOString().split('T')[0]
      XLSX.writeFile(wb, `PropertyTracker_${date}.xlsx`)
      
      showNotification('success', 'Excel file downloaded successfully')
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      showNotification('error', 'Failed to export to Excel')
    }
  }

  // Calculate Statistics
  const calculateStats = () => {
    const filtered = getFilteredExpenses()
    const totalSpent = filtered.reduce((sum, e) => sum + (e.amount || 0), 0)
    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0)
    const activeProjects = projects.filter(p => p.status === 'active').length
    const completedProjects = projects.filter(p => p.status === 'completed').length
    
    return {
      totalSpent,
      totalBudget,
      activeProjects,
      completedProjects,
      budgetUsed: totalBudget ? (totalSpent / totalBudget * 100) : 0,
      averageExpense: filtered.length ? (totalSpent / filtered.length) : 0,
      totalExpenses: filtered.length,
      totalProjects: projects.length
    }
  }

  const stats = calculateStats()

  // Get category totals for analytics
  const getCategoryTotals = () => {
    const totals = {}
    expenses.forEach(e => {
      const category = e.category || 'Other'
      totals[category] = (totals[category] || 0) + (e.amount || 0)
    })
    return Object.entries(totals).sort((a, b) => b[1] - a[1])
  }

  // Get monthly trend data
  const getMonthlyTrend = () => {
    const monthlyData = {}
    const last6Months = []
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      last6Months.push(monthKey)
      monthlyData[monthKey] = 0
    }
    
    expenses.forEach(e => {
      const date = new Date(e.createdAt || e.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (monthlyData.hasOwnProperty(monthKey)) {
        monthlyData[monthKey] += e.amount || 0
      }
    })
    
    return last6Months.map(month => ({
      month: month,
      amount: monthlyData[month]
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-4xl font-bold mb-4">Property Tracker</div>
          <div className="text-gray-400 text-lg">Loading your construction management system...</div>
          <div className="mt-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold">Property Tracker</h1>
              <span className="ml-4 text-sm text-gray-400">Premium Construction Management</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={exportToExcel}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                Export Excel
              </button>
              <button
                onClick={exportComprehensivePDF}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export PDF
              </button>
              <button
                onClick={fetchAllData}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {['dashboard', 'expenses', 'projects', 'vendors', 'analytics'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-2 border-b-2 transition-colors capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-500'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-20 right-4 z-50 space-y-2">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 rounded-lg shadow-lg ${
                notif.type === 'error' ? 'bg-red-600' :
                notif.type === 'warning' ? 'bg-yellow-600' :
                notif.type === 'critical' ? 'bg-orange-600' :
                'bg-green-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-white">{notif.message}</p>
                <button
                  onClick={() => setNotifications(notifications.filter(n => n.id !== notif.id))}
                  className="ml-4 text-white hover:text-gray-200"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 shadow-xl">
                <h3 className="text-lg opacity-90 mb-2">Total Spent</h3>
                <p className="text-3xl font-bold">{formatMoney(stats.totalSpent)}</p>
                <p className="text-sm opacity-75 mt-2">{stats.totalExpenses} expenses recorded</p>
              </div>
              <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-6 shadow-xl">
                <h3 className="text-lg opacity-90 mb-2">Active Projects</h3>
                <p className="text-3xl font-bold">{stats.activeProjects}</p>
                <p className="text-sm opacity-75 mt-2">of {stats.totalProjects} total</p>
              </div>
              <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-6 shadow-xl">
                <h3 className="text-lg opacity-90 mb-2">Total Budget</h3>
                <p className="text-3xl font-bold">{formatMoney(stats.totalBudget)}</p>
                <p className="text-sm opacity-75 mt-2">Combined budget</p>
              </div>
              <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl p-6 shadow-xl">
                <h3 className="text-lg opacity-90 mb-2">Budget Used</h3>
                <p className="text-3xl font-bold">{stats.budgetUsed.toFixed(1)}%</p>
                <p className="text-sm opacity-75 mt-2">Overall progress</p>
              </div>
            </div>

            {/* Projects Grid */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Projects</h2>
                <button
                  onClick={() => setShowAddProject(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Add Project
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {projects.map(project => {
                  const projectExpenses = getProjectExpenses(project.name)
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
                          <div className="mt-3 flex space-x-2">
                            <button
                              onClick={() => setEditingProject(project)}
                              className="text-blue-400 hover:text-blue-300 text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteProject(project.id)}
                              className="text-red-400 hover:text-red-300 text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Recent Expenses Table */}
            <div>
              <h2 className="text-2xl font-bold mb-6">Recent Expenses</h2>
              <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-800">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Date</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Amount</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Project</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Vendor</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Category</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {expenses.slice(0, 10).map(expense => (
                        <tr key={expense.id} className="hover:bg-gray-800 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {expense.date || new Date(expense.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-green-400 font-medium">{formatMoney(expense.amount)}</span>
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
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setEditingExpense(expense)}
                                className="text-blue-400 hover:text-blue-300"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteExpense(expense.id)}
                                className="text-red-400 hover:text-red-300"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Expenses Tab */}
        {activeTab === 'expenses' && (
          <div>
            {/* Filters and Actions */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <input
                  type="text"
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                />
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Projects</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="quarter">This Quarter</option>
                </select>
              </div>
              <button
                onClick={() => setShowAddExpense(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Add Expense
              </button>
            </div>

            {/* Expenses Table */}
            <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Date</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Amount</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Project</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Vendor</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Category</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Description</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Source</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {getFilteredExpenses().length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                          No expenses found. Add your first expense or adjust filters.
                        </td>
                      </tr>
                    ) : (
                      getFilteredExpenses().map(expense => (
                        <tr key={expense.id} className="hover:bg-gray-800 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {expense.date || new Date(expense.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-green-400 font-medium">{formatMoney(expense.amount)}</span>
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
                          <td className="px-6 py-4 max-w-xs truncate">{expense.description || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded text-xs ${
                              expense.source === 'telegram' ? 'bg-blue-900 text-blue-300' :
                              expense.source === 'whatsapp' ? 'bg-green-900 text-green-300' :
                              'bg-gray-800 text-gray-300'
                            }`}>
                              {expense.source || 'Web'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setEditingExpense(expense)}
                                className="text-blue-400 hover:text-blue-300"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteExpense(expense.id)}
                                className="text-red-400 hover:text-red-300"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">All Projects</h2>
              <button
                onClick={() => setShowAddProject(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Add New Project
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {projects.map(project => {
                const projectExpenses = getProjectExpenses(project.name)
                const spent = projectExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
                const progress = project.budget ? (spent / project.budget * 100) : 0
                
                return (
                  <div key={project.id} className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-2xl font-semibold mb-2">{project.name}</h3>
                        <p className="text-gray-400">{project.description}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditingProject(project)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteProject(project.id)}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <span className="text-gray-400">Budget:</span>
                        <p className="text-xl font-medium">{formatMoney(project.budget)}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Spent:</span>
                        <p className="text-xl font-medium">{formatMoney(spent)}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Remaining:</span>
                        <p className="text-xl font-medium">{formatMoney(project.budget - spent)}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Location:</span>
                        <p>{project.location}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Contractor:</span>
                        <p>{project.contractor || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Status:</span>
                        <p>
                          <span className={`px-2 py-1 rounded text-sm ${
                            project.status === 'active' ? 'bg-green-900 text-green-300' :
                            project.status === 'completed' ? 'bg-blue-900 text-blue-300' :
                            'bg-yellow-900 text-yellow-300'
                          }`}>
                            {project.status}
                          </span>
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">Start Date:</span>
                        <p>{project.startDate || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">End Date:</span>
                        <p>{project.endDate || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Transactions:</span>
                        <p>{projectExpenses.length}</p>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">Progress</span>
                        <span className="font-medium">{progress.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full transition-all duration-500 ${
                            progress >= 90 ? 'bg-red-500' : 
                            progress >= 70 ? 'bg-yellow-500' : 
                            'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Vendors Tab */}
        {activeTab === 'vendors' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Vendors</h2>
              <button 
                onClick={() => setShowAddVendor(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Add Vendor
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vendors.map(vendor => {
                const vendorExpenses = expenses.filter(e => e.vendor === vendor.name)
                const totalSpent = vendorExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
                
                return (
                  <div key={vendor.id} className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                    <h3 className="text-xl font-semibold mb-2">{vendor.name}</h3>
                    <p className="text-gray-400 mb-4">{vendor.type}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Spent:</span>
                        <span className="font-medium">{formatMoney(totalSpent)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Transactions:</span>
                        <span>{vendorExpenses.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Contact:</span>
                        <span>{vendor.contact || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Email:</span>
                        <span className="text-sm">{vendor.email || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="mt-4 flex space-x-2">
                      <button
                        onClick={() => setEditingVendor(vendor)}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteVendor(vendor.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Analytics & Reports</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Category Breakdown */}
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <h3 className="text-xl font-semibold mb-4">Expenses by Category</h3>
                <div className="space-y-3">
                  {getCategoryTotals().slice(0, 8).map(([category, amount]) => (
                    <div key={category}>
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-400">{category}</span>
                        <span className="font-medium">{formatMoney(amount)}</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded"
                          style={{ width: `${(amount / stats.totalSpent * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Monthly Trend */}
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <h3 className="text-xl font-semibold mb-4">6-Month Trend</h3>
                <div className="space-y-3">
                  {getMonthlyTrend().map(({ month, amount }) => (
                    <div key={month}>
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-400">{month}</span>
                        <span className="font-medium">{formatMoney(amount)}</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded h-2">
                        <div 
                          className="bg-green-500 h-2 rounded"
                          style={{ width: `${(amount / Math.max(...getMonthlyTrend().map(m => m.amount)) * 100) || 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Project-Level Analytics */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Individual Project Analysis</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {projects.map(project => {
                  const projectExpenses = expenses.filter(e => e.project === project.name)
                  const spent = projectExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
                  const progress = project.budget ? (spent / project.budget * 100) : 0
                  
                  const projCategories = {}
                  projectExpenses.forEach(e => {
                    projCategories[e.category || 'Other'] = (projCategories[e.category || 'Other'] || 0) + e.amount
                  })
                  
                  const topCategory = Object.entries(projCategories).sort((a, b) => b[1] - a[1])[0]
                  
                  return (
                    <div 
                      key={project.id} 
                      className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-blue-500 cursor-pointer transition-all hover:shadow-lg"
                      onClick={() => setViewingProject(project)}
                    >
                      <h4 className="text-lg font-semibold mb-4">{project.name}</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Budget</span>
                          <span>{formatMoney(project.budget)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Spent</span>
                          <span className={progress >= 90 ? 'text-red-400' : progress >= 70 ? 'text-yellow-400' : 'text-green-400'}>
                            {formatMoney(spent)} ({progress.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Top Category</span>
                          <span>{topCategory ? topCategory[0] : 'None'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Transactions</span>
                          <span>{projectExpenses.length}</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-2 mt-3">
                          <div 
                            className={`h-2 rounded-full ${
                              progress >= 90 ? 'bg-red-500' : 
                              progress >= 70 ? 'bg-yellow-500' : 
                              'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Top Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <h4 className="text-lg font-semibold mb-4">Top Vendors</h4>
                <div className="space-y-2">
                  {vendors
                    .map(v => ({
                      name: v.name,
                      total: expenses.filter(e => e.vendor === v.name).reduce((sum, e) => sum + (e.amount || 0), 0)
                    }))
                    .sort((a, b) => b.total - a.total)
                    .slice(0, 5)
                    .map(vendor => (
                      <div key={vendor.name} className="flex justify-between">
                        <span className="text-gray-400">{vendor.name}</span>
                        <span>{formatMoney(vendor.total)}</span>
                      </div>
                    ))
                  }
                </div>
              </div>
              
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <h4 className="text-lg font-semibold mb-4">Project Status</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Active Projects</span>
                    <span>{stats.activeProjects}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Completed</span>
                    <span>{stats.completedProjects}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">On Hold</span>
                    <span>{projects.filter(p => p.status === 'on-hold').length}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <h4 className="text-lg font-semibold mb-4">Financial Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Average Expense</span>
                    <span>{formatMoney(stats.averageExpense)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Budget Remaining</span>
                    <span>{formatMoney(stats.totalBudget - stats.totalSpent)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Budget Used</span>
                    <span>{stats.budgetUsed.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h3 className="text-xl font-semibold mb-4">Export Options</h3>
              <div className="flex space-x-4">
                <button
                  onClick={exportToExcel}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                >
                  Export to Excel
                </button>
                <button
                  onClick={exportToPDF}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Export to PDF
                </button>
                <button 
                  onClick={() => showNotification('info', 'Email report coming soon')}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Email Report
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Add New Expense</h3>
            <div className="space-y-4">
              <input
                type="number"
                placeholder="Amount *"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
              />
              <select
                value={expenseForm.project}
                onChange={(e) => setExpenseForm({...expenseForm, project: e.target.value})}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="">Select Project *</option>
                {projects.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Vendor"
                value={expenseForm.vendor}
                onChange={(e) => setExpenseForm({...expenseForm, vendor: e.target.value})}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
              />
              <select
                value={expenseForm.category}
                onChange={(e) => setExpenseForm({...expenseForm, category: e.target.value})}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="">Select Category</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <textarea
                placeholder="Description (optional)"
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                rows="3"
              />
              <input
                type="date"
                value={expenseForm.date}
                onChange={(e) => setExpenseForm({...expenseForm, date: e.target.value})}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setShowAddExpense(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddExpense}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Add Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {editingExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Edit Expense</h3>
            <div className="space-y-4">
              <input
                type="number"
                placeholder="Amount"
                value={editingExpense.amount}
                onChange={(e) => setEditingExpense({...editingExpense, amount: parseFloat(e.target.value)})}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
              />
              <select
                value={editingExpense.project}
                onChange={(e) => setEditingExpense({...editingExpense, project: e.target.value})}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
              >
                
  <option value="">Select Project</option>
  {projects.map(p => (
    <option key={p.id} value={p.name}>{p.name}</option>
  ))}
</select>

            <input
               type="text"
               placeholder="Vendor"
               value={editingExpense.vendor}
               onChange={(e) => setEditingExpense({...editingExpense, vendor: e.target.value})}
               className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
             />
             <select
               value={editingExpense.category}
               onChange={(e) => setEditingExpense({...editingExpense, category: e.target.value})}
               className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
             >
               <option value="">Select Category</option>
               {categories.map(c => (
                 <option key={c} value={c}>{c}</option>
               ))}
             </select>
             <textarea
               placeholder="Description"
               value={editingExpense.description || ''}
               onChange={(e) => setEditingExpense({...editingExpense, description: e.target.value})}
               className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
               rows="3"
             />
           </div>
           <div className="flex justify-end space-x-4 mt-6">
             <button
               onClick={() => setEditingExpense(null)}
               className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
             >
               Cancel
             </button>
             <button
               onClick={handleUpdateExpense}
               className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
             >
               Update Expense
             </button>
           </div>
         </div>
       </div>
     )}

     {/* Add Project Modal */}
     {showAddProject && (
       <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
         <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
           <h3 className="text-xl font-semibold mb-4">Add New Project</h3>
           <div className="space-y-4">
             <input
               type="text"
               placeholder="Project Name *"
               value={projectForm.name}
               onChange={(e) => setProjectForm({...projectForm, name: e.target.value})}
               className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
             />
             <input
               type="number"
               placeholder="Budget *"
               value={projectForm.budget}
               onChange={(e) => setProjectForm({...projectForm, budget: e.target.value})}
               className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
             />
             <input
               type="text"
               placeholder="Location"
               value={projectForm.location}
               onChange={(e) => setProjectForm({...projectForm, location: e.target.value})}
               className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
             />
             <input
               type="text"
               placeholder="Contractor"
               value={projectForm.contractor}
               onChange={(e) => setProjectForm({...projectForm, contractor: e.target.value})}
               className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
             />
             <div className="grid grid-cols-2 gap-4">
               <input
                 type="date"
                 placeholder="Start Date"
                 value={projectForm.startDate}
                 onChange={(e) => setProjectForm({...projectForm, startDate: e.target.value})}
                 className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
               />
               <input
                 type="date"
                 placeholder="End Date"
                 value={projectForm.endDate}
                 onChange={(e) => setProjectForm({...projectForm, endDate: e.target.value})}
                 className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
               />
             </div>
             <select
               value={projectForm.status}
               onChange={(e) => setProjectForm({...projectForm, status: e.target.value})}
               className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
             >
               <option value="active">Active</option>
               <option value="on-hold">On Hold</option>
               <option value="completed">Completed</option>
             </select>
             <textarea
               placeholder="Description"
               value={projectForm.description}
               onChange={(e) => setProjectForm({...projectForm, description: e.target.value})}
               className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
               rows="3"
             />
           </div>
           <div className="flex justify-end space-x-4 mt-6">
             <button
               onClick={() => setShowAddProject(false)}
               className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
             >
               Cancel
             </button>
             <button
               onClick={handleAddProject}
               className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
             >
               Add Project
             </button>
           </div>
         </div>
       </div>
     )}

     {/* Edit Project Modal */}
     {editingProject && (
       <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
         <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
           <h3 className="text-xl font-semibold mb-4">Edit Project</h3>
           <div className="space-y-4">
             <input
               type="text"
               placeholder="Project Name"
               value={editingProject.name}
               onChange={(e) => setEditingProject({...editingProject, name: e.target.value})}
               className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
             />
             <input
               type="number"
               placeholder="Budget"
               value={editingProject.budget}
               onChange={(e) => setEditingProject({...editingProject, budget: e.target.value})}
               className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
             />
             <input
               type="text"
               placeholder="Location"
               value={editingProject.location}
               onChange={(e) => setEditingProject({...editingProject, location: e.target.value})}
               className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
             />
             <input
               type="text"
               placeholder="Contractor"
               value={editingProject.contractor || ''}
               onChange={(e) => setEditingProject({...editingProject, contractor: e.target.value})}
               className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
             />
             <select
               value={editingProject.status}
               onChange={(e) => setEditingProject({...editingProject, status: e.target.value})}
               className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
             >
               <option value="active">Active</option>
               <option value="on-hold">On Hold</option>
               <option value="completed">Completed</option>
             </select>
             <textarea
               placeholder="Description"
               value={editingProject.description || ''}
               onChange={(e) => setEditingProject({...editingProject, description: e.target.value})}
               className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
               rows="3"
             />
           </div>
           <div className="flex justify-end space-x-4 mt-6">
             <button
               onClick={() => setEditingProject(null)}
               className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
             >
               Cancel
             </button>
             <button
               onClick={handleUpdateProject}
               className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
             >
               Update Project
             </button>
           </div>
         </div>
       </div>
     )}

     {/* Add Vendor Modal */}
     {showAddVendor && (
       <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
         <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md">
           <h3 className="text-xl font-semibold mb-4">Add New Vendor</h3>
           <div className="space-y-4">
             <input
               type="text"
               placeholder="Vendor Name *"
               value={vendorForm.name}
               onChange={(e) => setVendorForm({...vendorForm, name: e.target.value})}
               className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
             />
             <input
               type="text"
               placeholder="Type (e.g., Supplier, Contractor)"
               value={vendorForm.type}
               onChange={(e) => setVendorForm({...vendorForm, type: e.target.value})}
               className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
             />
             <input
               type="text"
               placeholder="Contact Number"
               value={vendorForm.contact}
               onChange={(e) => setVendorForm({...vendorForm, contact: e.target.value})}
               className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
             />
             <input
               type="email"
               placeholder="Email"
               value={vendorForm.email}
               onChange={(e) => setVendorForm({...vendorForm, email: e.target.value})}
               className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
             />
             <textarea
               placeholder="Address"
               value={vendorForm.address}
               onChange={(e) => setVendorForm({...vendorForm, address: e.target.value})}
               className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
               rows="2"
             />
           </div>
           <div className="flex justify-end space-x-4 mt-6">
             <button
               onClick={() => setShowAddVendor(false)}
               className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
             >
               Cancel
             </button>
             <button
               onClick={handleAddVendor}
               className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
             >
               Add Vendor
             </button>
           </div>
         </div>
       </div>
     )}

     {/* Edit Vendor Modal */}
     {editingVendor && (
       <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
         <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md">
           <h3 className="text-xl font-semibold mb-4">Edit Vendor</h3>
           <div className="space-y-4">
             <input
               type="text"
               value={editingVendor.name}
               onChange={(e) => setEditingVendor({...editingVendor, name: e.target.value})}
               className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
             />
             <input
               type="text"
               value={editingVendor.type || ''}
               onChange={(e) => setEditingVendor({...editingVendor, type: e.target.value})}
               className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
             />
             <input
               type="text"
               value={editingVendor.contact || ''}
               onChange={(e) => setEditingVendor({...editingVendor, contact: e.target.value})}
               className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
             />
             <input
               type="email"
               value={editingVendor.email || ''}
               onChange={(e) => setEditingVendor({...editingVendor, email: e.target.value})}
               className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
             />
           </div>
           <div className="flex justify-end space-x-4 mt-6">
             <button
               onClick={() => setEditingVendor(null)}
               className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
             >
               Cancel
             </button>
             <button
               onClick={handleUpdateVendor}
               className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
             >
               Update Vendor
             </button>
           </div>
         </div>
       </div>
     )}

     {/* Project Detail Modal */}
      {viewingProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold">{viewingProject.name} - Detailed Analysis</h2>
              <button
                onClick={() => setViewingProject(null)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            
            {(() => {
              const projectExpenses = expenses.filter(e => e.project === viewingProject.name)
              const spent = projectExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
              const remaining = viewingProject.budget - spent
              const progress = viewingProject.budget ? (spent / viewingProject.budget * 100) : 0
              
              const categoryBreakdown = {}
              const vendorBreakdown = {}
              const monthlyBreakdown = {}
              
              projectExpenses.forEach(e => {
                categoryBreakdown[e.category || 'Other'] = (categoryBreakdown[e.category || 'Other'] || 0) + e.amount
                vendorBreakdown[e.vendor || 'Unknown'] = (vendorBreakdown[e.vendor || 'Unknown'] || 0) + e.amount
                
                const month = new Date(e.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
                monthlyBreakdown[month] = (monthlyBreakdown[month] || 0) + e.amount
              })
              
              return (
                <>
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="text-gray-400 text-sm">Budget</div>
                      <div className="text-xl font-bold">{formatMoney(viewingProject.budget)}</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="text-gray-400 text-sm">Spent</div>
                      <div className="text-xl font-bold text-red-400">{formatMoney(spent)}</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="text-gray-400 text-sm">Remaining</div>
                      <div className="text-xl font-bold text-green-400">{formatMoney(remaining)}</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4">
                      <div className="text-gray-400 text-sm">Progress</div>
                      <div className="text-xl font-bold">{progress.toFixed(1)}%</div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="w-full bg-gray-800 rounded-full h-4">
                      <div 
                        className={`h-4 rounded-full ${
                          progress >= 90 ? 'bg-red-500' : 
                          progress >= 70 ? 'bg-yellow-500' : 
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Breakdowns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Category Breakdown</h3>
                      <div className="space-y-2">
                        {Object.entries(categoryBreakdown)
                          .sort((a, b) => b[1] - a[1])
                          .map(([cat, amt]) => (
                            <div key={cat} className="flex justify-between">
                              <span className="text-gray-400">{cat}</span>
                              <span>{formatMoney(amt)} ({((amt/spent)*100).toFixed(1)}%)</span>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Top Vendors</h3>
                      <div className="space-y-2">
                        {Object.entries(vendorBreakdown)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 5)
                          .map(([vendor, amt]) => (
                            <div key={vendor} className="flex justify-between">
                              <span className="text-gray-400">{vendor}</span>
                              <span>{formatMoney(amt)}</span>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  </div>
                  
                  {/* Recent Expenses */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Recent Expenses</h3>
                    <div className="bg-gray-800 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-700">
                          <tr>
                            <th className="px-4 py-2 text-left">Date</th>
                            <th className="px-4 py-2 text-left">Amount</th>
                            <th className="px-4 py-2 text-left">Vendor</th>
                            <th className="px-4 py-2 text-left">Category</th>
                          </tr>
                        </thead>
                        <tbody>
                          {projectExpenses.slice(0, 10).map((exp, idx) => (
                            <tr key={idx} className="border-t border-gray-700">
                              <td className="px-4 py-2">{formatDate(exp.createdAt)}</td>
                              <td className="px-4 py-2">{formatMoney(exp.amount)}</td>
                              <td className="px-4 py-2">{exp.vendor || 'Unknown'}</td>
                              <td className="px-4 py-2">{exp.category || 'Other'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

     {/* Quick Action Buttons */}
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
         onClick={fetchAllData}
         className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow-lg transition-all hover:scale-105"
       >
         Refresh Data
       </button>
     </div>
   </div>
 )
}
