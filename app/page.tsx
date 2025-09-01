"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, TrendingUp, Building2, Search, BarChart3, Users, FileText, 
  DollarSign, ChevronDown, ChevronUp, MessageCircle, Camera, Bell, 
  Settings, RefreshCw, Sparkles, Sun, Moon
} from 'lucide-react'
import ExpenseCard from '@/components/ExpenseCard'
import ProjectCard from '@/components/ProjectCard'
import { db } from '@/lib/firebase'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { PROJECTS, normalizeProjectName } from '@/lib/projects'
import { formatCurrency, validateExpense } from '@/utils/formatters'

const formatProgress = (spent, budget) => {
  if (!budget || budget === 0) return 0
  const progress = (spent / budget) * 100
  
  if (progress === 0) return 0
  if (progress === 100) return 100
  if (progress > 100) return Math.round(progress)
  if (progress < 1) return parseFloat(progress.toFixed(1))
  if (progress % 1 === 0) return Math.round(progress)
  return parseFloat(progress.toFixed(1))
}

const getProgressColor = (progress) => {
  if (progress >= 90) return { bg: 'from-red-500 to-red-600', text: 'text-red-400', glow: 'shadow-red-500/50' }
  if (progress >= 75) return { bg: 'from-orange-500 to-orange-600', text: 'text-orange-400', glow: 'shadow-orange-500/50' }
  if (progress >= 50) return { bg: 'from-yellow-500 to-yellow-600', text: 'text-yellow-400', glow: 'shadow-yellow-500/50' }
  return { bg: 'from-blue-500 to-blue-600', text: 'text-blue-400', glow: 'shadow-blue-500/50' }
}

export default function HomePage() {
  const router = useRouter()
  const [expenses, setExpenses] = useState([])
  const [totalSpent, setTotalSpent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [projectsData, setProjectsData] = useState([])
  const [darkMode, setDarkMode] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dateRange, setDateRange] = useState('all')
  
  const [showProjects, setShowProjects] = useState(true)
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [showRecentExpenses, setShowRecentExpenses] = useState(false)

  const quickLinks = [
    { name: 'Add Expense', icon: Plus, href: '/add-expense', gradient: 'from-emerald-400 to-emerald-600' },
    { name: 'Analytics', icon: BarChart3, href: '/analytics', gradient: 'from-blue-400 to-blue-600' },
    { name: 'Projects', icon: Building2, href: '/projects', gradient: 'from-purple-400 to-purple-600' },
    { name: 'Sales', icon: DollarSign, href: '/sales', gradient: 'from-yellow-400 to-yellow-600' },
    { name: 'WhatsApp', icon: MessageCircle, href: '/whatsapp', gradient: 'from-green-400 to-green-600' },
    { name: 'AI Progress', icon: Camera, href: '/progress', gradient: 'from-indigo-400 to-indigo-600' },
    { name: 'Vendors', icon: Users, href: '/vendors', gradient: 'from-orange-400 to-orange-600' },
    { name: 'Search', icon: Search, href: '/search', gradient: 'from-pink-400 to-pink-600' },
    { name: 'Reports', icon: FileText, href: '/reports', gradient: 'from-teal-400 to-teal-600' }
  ]

  useEffect(() => {
    fetchData()
  }, [dateRange])

  const fetchData = async () => {
    setLoading(true)
    try {
      const q = query(collection(db, 'expenses'), orderBy('createdAt', 'desc'))
      const expensesSnapshot = await getDocs(q)
      const expensesData = []
      let total = 0
      
      const projectMap = {}
      PROJECTS.forEach(project => {
        projectMap[project.name] = {
          ...project,
          spent: 0,
          expenses: [],
          progress: 0
        }
      })
      
      expensesSnapshot.forEach((doc) => {
        const rawData = { id: doc.id, ...doc.data() }
        const data = validateExpense(rawData)
        const normalizedProject = normalizeProjectName(data.project)
        
        if (normalizedProject && projectMap[normalizedProject]) {
          data.project = normalizedProject
          expensesData.push(data)
          total += data.amount
          
          projectMap[normalizedProject].spent += data.amount
          projectMap[normalizedProject].expenses.push(data)
        }
      })
      
      const projects = Object.values(projectMap).map(project => ({
        ...project,
        progress: formatProgress(project.spent, project.budget),
        progressColor: getProgressColor(formatProgress(project.spent, project.budget))
      }))
      
      projects.sort((a, b) => b.expenses.length - a.expenses.length)
      
      setProjectsData(projects)
      setExpenses(expensesData.slice(0, 10))
      setTotalSpent(total)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setTimeout(() => setRefreshing(false), 500)
  }

  const activeProjects = projectsData.filter(p => p.spent > 0).length
  const totalBudget = PROJECTS.reduce((sum, p) => sum + p.budget, 0)
  const budgetUtilization = totalBudget > 0 ? formatProgress(totalSpent, totalBudget) : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
          <p className="text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black text-white">
      <div className="p-4 pb-24 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8 pt-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Property Tracker
              </h1>
              <p className="text-gray-400 mt-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Premium Construction Management
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-3 bg-gray-800/50 backdrop-blur-xl rounded-xl hover:bg-gray-700/50 transition-all"
              >
                {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-700" />}
              </button>
              <button
                onClick={handleRefresh}
                className="p-3 bg-gray-800/50 backdrop-blur-xl rounded-xl hover:bg-gray-700/50 transition-all"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button className="p-3 bg-gray-800/50 backdrop-blur-xl rounded-xl hover:bg-gray-700/50 transition-all relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              </button>
            </div>
          </div>

          {/* Date Range Filters */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {['all', 'today', 'week', 'month', 'quarter'].map(range => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-xl font-medium capitalize transition-all ${
                  dateRange === range 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' 
                    : 'bg-gray-800/50 backdrop-blur-xl hover:bg-gray-700/50'
                }`}
              >
                {range === 'all' ? 'All Time' : range}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 p-6 shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <p className="text-blue-100 text-sm font-medium">Total Spent</p>
                <TrendingUp className="w-5 h-5 text-blue-200" />
              </div>
              <p className="text-3xl font-black text-white">{formatCurrency(totalSpent)}</p>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 bg-blue-400/30 rounded-full h-2">
                  <div 
                    className="bg-white rounded-full h-2 transition-all duration-500"
                    style={{ width: `${Math.min(100, budgetUtilization)}%` }}
                  />
                </div>
                <span className="text-xs text-blue-100">{budgetUtilization}%</span>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <p className="text-emerald-100 text-sm font-medium">Active Projects</p>
                <Building2 className="w-5 h-5 text-emerald-200" />
              </div>
              <p className="text-3xl font-black text-white">{activeProjects}</p>
              <p className="text-emerald-100 text-xs mt-2">of {PROJECTS.length} total</p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 p-6 shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <p className="text-purple-100 text-sm font-medium">Total Budget</p>
                <DollarSign className="w-5 h-5 text-purple-200" />
              </div>
              <p className="text-3xl font-black text-white">{formatCurrency(totalBudget)}</p>
              <p className="text-purple-100 text-xs mt-2">All projects combined</p>
            </div>
          </div>
        </div>

        {/* Project Progress Section */}
        <div className="mb-6">
          <button
            onClick={() => setShowProjects(!showProjects)}
            className="w-full flex justify-between items-center bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-xl hover:from-gray-700/50 hover:to-gray-800/50 rounded-2xl p-5 transition-all border border-gray-700/50"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-xl">
                <Building2 className="w-6 h-6 text-blue-400" />
              </div>
              <div className="text-left">
                <h2 className="text-xl font-bold text-white">Project Progress</h2>
                <p className="text-xs text-gray-400 mt-1">Track development status</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-blue-500/20 rounded-full text-sm text-blue-400 font-medium">
                {projectsData.length} projects
              </span>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showProjects ? 'rotate-180' : ''}`} />
            </div>
          </button>
          
          {showProjects && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projectsData.map((project) => (
                <ProjectCard key={project.name} project={project} />
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions Section */}
        <div className="mb-6">
          <button
            onClick={() => setShowQuickActions(!showQuickActions)}
            className="w-full flex justify-between items-center bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-xl hover:from-gray-700/50 hover:to-gray-800/50 rounded-2xl p-5 transition-all border border-gray-700/50"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-xl">
                <TrendingUp className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="text-left">
                <h2 className="text-xl font-bold text-white">Quick Actions</h2>
                <p className="text-xs text-gray-400 mt-1">Frequently used features</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-emerald-500/20 rounded-full text-sm text-emerald-400 font-medium">
                {quickLinks.length} actions
              </span>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showQuickActions ? 'rotate-180' : ''}`} />
            </div>
          </button>
          
          {showQuickActions && (
            <div className="mt-4 grid grid-cols-3 md:grid-cols-5 gap-3">
              {quickLinks.map((link) => (
                <button
                  key={link.name}
                  onClick={() => router.push(link.href)}
                  className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${link.gradient} shadow-lg hover:scale-105 transition-transform`}
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <link.icon className="w-6 h-6 text-white" />
                    <span className="text-xs font-bold text-white">{link.name}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Recent Expenses Section */}
        <div className="mb-6">
          <button
            onClick={() => setShowRecentExpenses(!showRecentExpenses)}
            className="w-full flex justify-between items-center bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-xl hover:from-gray-700/50 hover:to-gray-800/50 rounded-2xl p-5 transition-all border border-gray-700/50"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-xl">
                <DollarSign className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="text-left">
                <h2 className="text-xl font-bold text-white">Recent Expenses</h2>
                <p className="text-xs text-gray-400 mt-1">Latest transactions</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-yellow-500/20 rounded-full text-sm text-yellow-400 font-medium">
                {expenses.length} recent
              </span>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showRecentExpenses ? 'rotate-180' : ''}`} />
            </div>
          </button>
          
          {showRecentExpenses && (
            <div className="mt-4">
              {expenses.length === 0 ? (
                <div className="bg-gradient-to-r from-gray-800/30 to-gray-900/30 backdrop-blur-xl rounded-2xl p-12 text-center border border-gray-700/50">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full flex items-center justify-center">
                    <FileText className="w-10 h-10 text-gray-500" />
                  </div>
                  <p className="text-gray-400 text-lg font-medium mb-2">No expenses yet</p>
                  <p className="text-sm text-gray-500">Start tracking by adding your first expense</p>
                  <button
                    onClick={() => router.push('/add-expense')}
                    className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl font-medium hover:scale-105 transition-transform"
                  >
                    Add First Expense
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {expenses.map((expense) => (
                    <ExpenseCard key={expense.id} expense={expense} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-2xl border-t border-gray-800/50">
        <div className="flex justify-around py-2">
          {[
            { icon: Building2, label: 'Dashboard', path: '/', active: true },
            { icon: DollarSign, label: 'Expenses', path: '/expenses' },
            { icon: Users, label: 'Vendors', path: '/vendors' },
            { icon: BarChart3, label: 'Analytics', path: '/analytics' },
            { icon: Settings, label: 'Settings', path: '/settings' }
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => router.push(item.path)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                item.active 
                  ? 'text-blue-400' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => router.push('/add-expense')}
        className="fixed bottom-24 right-4 w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform group"
      >
        <Plus className="w-6 h-6 text-white" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full opacity-0 group-hover:opacity-100 blur-xl transition-opacity" />
      </button>
    </div>
  )
}
