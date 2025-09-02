'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function HomePage() {
  const [projects, setProjects] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [showAddProject, setShowAddProject] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [editingProject, setEditingProject] = useState(null)
  
  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    project: '',
    vendor: '',
    category: '',
    description: ''
  })
  
  const [projectForm, setProjectForm] = useState({
    name: '',
    budget: '',
    location: '',
    contractor: '',
    status: 'active'
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const projectsSnapshot = await getDocs(collection(db, 'projects'))
      const projectsData = projectsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      if (projectsData.length === 0) {
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
        
        const newSnapshot = await getDocs(collection(db, 'projects'))
        setProjects(newSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
      } else {
        setProjects(projectsData)
      }
      
      const expensesSnapshot = await getDocs(
        query(collection(db, 'expenses'), orderBy('createdAt', 'desc'), limit(100))
      )
      setExpenses(expensesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })))
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatMoney = (amount) => {
    if (!amount) return 'N0'
    if (amount >= 1000000) return `N${(amount/1000000).toFixed(2)} Million`
    return `N${Math.round(amount/1000).toLocaleString()}k`
  }

  const handleAddExpense = async () => {
    try {
      await addDoc(collection(db, 'expenses'), {
        ...expenseForm,
        amount: parseFloat(expenseForm.amount),
        createdAt: new Date().toISOString()
      })
      setShowAddExpense(false)
      setExpenseForm({ amount: '', project: '', vendor: '', category: '', description: '' })
      fetchData()
    } catch (error) {
      console.error('Error adding expense:', error)
    }
  }

  const handleUpdateExpense = async () => {
    try {
      await updateDoc(doc(db, 'expenses', editingExpense.id), editingExpense)
      setEditingExpense(null)
      fetchData()
    } catch (error) {
      console.error('Error updating expense:', error)
    }
  }

  const handleDeleteExpense = async (id) => {
    if (confirm('Delete this expense?')) {
      try {
        await deleteDoc(doc(db, 'expenses', id))
        fetchData()
      } catch (error) {
        console.error('Error deleting expense:', error)
      }
    }
  }

  const handleAddProject = async () => {
    try {
      await addDoc(collection(db, 'projects'), {
        ...projectForm,
        budget: parseFloat(projectForm.budget),
        createdAt: new Date().toISOString()
      })
      setShowAddProject(false)
      setProjectForm({ name: '', budget: '', location: '', contractor: '', status: 'active' })
      fetchData()
    } catch (error) {
      console.error('Error adding project:', error)
    }
  }

  const handleUpdateProject = async () => {
    try {
      await updateDoc(doc(db, 'projects', editingProject.id), editingProject)
      setEditingProject(null)
      fetchData()
    } catch (error) {
      console.error('Error updating project:', error)
    }
  }

  const handleDeleteProject = async (id) => {
    if (confirm('Delete this project? This cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'projects', id))
        fetchData()
      } catch (error) {
        console.error('Error deleting project:', error)
      }
    }
  }

  const exportToExcel = async () => {
    const XLSX = await import('xlsx')
    
    const expenseData = expenses.map(e => ({
      Date: new Date(e.createdAt).toLocaleDateString(),
      Amount: e.amount,
      Project: e.project,
      Vendor: e.vendor,
      Category: e.category,
      Description: e.description
    }))
    
    const projectData = projects.map(p => {
      const spent = expenses.filter(e => e.project === p.name).reduce((sum, e) => sum + (e.amount || 0), 0)
      return {
        Name: p.name,
        Budget: p.budget,
        Spent: spent,
        Remaining: p.budget - spent,
        Status: p.status,
        Location: p.location
      }
    })
    
    const wb = XLSX.utils.book_new()
    const wsExpenses = XLSX.utils.json_to_sheet(expenseData)
    const wsProjects = XLSX.utils.json_to_sheet(projectData)
    
    XLSX.utils.book_append_sheet(wb, wsExpenses, 'Expenses')
    XLSX.utils.book_append_sheet(wb, wsProjects, 'Projects')
    
    XLSX.writeFile(wb, `PropertyTracker_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const totalSpent = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)
  const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white text-2xl">Loading Property Tracker...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Property Tracker</h1>
            <button onClick={exportToExcel} className="px-4 py-2 bg-green-600 rounded">
              Export Excel
            </button>
          </div>
          <div className="flex space-x-8 mt-4">
            {['dashboard', 'expenses', 'projects'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2 border-b-2 ${activeTab === tab ? 'border-blue-500' : 'border-transparent'} capitalize`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4">
        {activeTab === 'dashboard' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-blue-600 rounded-lg p-6">
                <h3 className="text-sm opacity-80">Total Spent</h3>
                <p className="text-2xl font-bold">{formatMoney(totalSpent)}</p>
              </div>
              <div className="bg-green-600 rounded-lg p-6">
                <h3 className="text-sm opacity-80">Projects</h3>
                <p className="text-2xl font-bold">{projects.length}</p>
              </div>
              <div className="bg-purple-600 rounded-lg p-6">
                <h3 className="text-sm opacity-80">Total Budget</h3>
                <p className="text-2xl font-bold">{formatMoney(totalBudget)}</p>
              </div>
              <div className="bg-orange-600 rounded-lg p-6">
                <h3 className="text-sm opacity-80">Budget Used</h3>
                <p className="text-2xl font-bold">{((totalSpent/totalBudget)*100).toFixed(1)}%</p>
              </div>
            </div>

            <h2 className="text-xl font-bold mb-4">Projects Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {projects.map(project => {
                const spent = expenses.filter(e => e.project === project.name).reduce((sum, e) => sum + (e.amount || 0), 0)
                const progress = (spent / project.budget) * 100
                
                return (
                  <div key={project.id} className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                    <h3 className="font-semibold mb-2">{project.name}</h3>
                    <p className="text-sm text-gray-400">Budget: {formatMoney(project.budget)}</p>
                    <p className="text-sm text-gray-400">Spent: {formatMoney(spent)}</p>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Progress</span>
                        <span>{progress.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded h-2">
                        <div 
                          className={`h-2 rounded ${progress >= 90 ? 'bg-red-500' : progress >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <h2 className="text-xl font-bold mb-4">Recent Expenses</h2>
            <div className="bg-gray-900 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Amount</th>
                    <th className="px-4 py-2 text-left">Project</th>
                    <th className="px-4 py-2 text-left">Vendor</th>
                    <th className="px-4 py-2 text-left">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.slice(0, 10).map(expense => (
                    <tr key={expense.id} className="border-t border-gray-800">
                      <td className="px-4 py-2">{new Date(expense.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-2 text-green-400">{formatMoney(expense.amount)}</td>
                      <td className="px-4 py-2">{expense.project}</td>
                      <td className="px-4 py-2">{expense.vendor}</td>
                      <td className="px-4 py-2">{expense.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div>
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">All Expenses</h2>
              <button onClick={() => setShowAddExpense(true)} className="px-4 py-2 bg-blue-600 rounded">
                Add Expense
              </button>
            </div>
            
            <div className="bg-gray-900 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Amount</th>
                    <th className="px-4 py-2 text-left">Project</th>
                    <th className="px-4 py-2 text-left">Vendor</th>
                    <th className="px-4 py-2 text-left">Category</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(expense => (
                    <tr key={expense.id} className="border-t border-gray-800">
                      <td className="px-4 py-2">{new Date(expense.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-2 text-green-400">{formatMoney(expense.amount)}</td>
                      <td className="px-4 py-2">{expense.project}</td>
                      <td className="px-4 py-2">{expense.vendor}</td>
                      <td className="px-4 py-2">{expense.category}</td>
                      <td className="px-4 py-2">
                        <button onClick={() => setEditingExpense(expense)} className="text-blue-400 mr-2">Edit</button>
                        <button onClick={() => handleDeleteExpense(expense.id)} className="text-red-400">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'projects' && (
          <div>
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">All Projects</h2>
              <button onClick={() => setShowAddProject(true)} className="px-4 py-2 bg-blue-600 rounded">
                Add Project
              </button>
            </div>
            
            {projects.map(project => {
              const spent = expenses.filter(e => e.project === project.name).reduce((sum, e) => sum + (e.amount || 0), 0)
              const progress = (spent / project.budget) * 100
              
              return (
                <div key={project.id} className="bg-gray-900 rounded-lg p-6 mb-4 border border-gray-800">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-semibold">{project.name}</h3>
                    <div>
                      <button onClick={() => setEditingProject(project)} className="text-blue-400 mr-2">Edit</button>
                      <button onClick={() => handleDeleteProject(project.id)} className="text-red-400">Delete</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-gray-400">Budget</p>
                      <p className="text-xl">{formatMoney(project.budget)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Spent</p>
                      <p className="text-xl">{formatMoney(spent)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Location</p>
                      <p>{project.location}</p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-800 rounded h-2">
                    <div 
                      className={`h-2 rounded ${progress >= 90 ? 'bg-red-500' : progress >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-400 mt-2">{progress.toFixed(1)}% of budget used</p>
                </div>
              )
            })}
          </div>
        )}

        {showAddExpense && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-semibold mb-4">Add Expense</h3>
              <input
                type="number"
                placeholder="Amount"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                className="w-full p-2 mb-3 bg-gray-800 rounded"
              />
              <select
                value={expenseForm.project}
                onChange={(e) => setExpenseForm({...expenseForm, project: e.target.value})}
                className="w-full p-2 mb-3 bg-gray-800 rounded"
              >
                <option value="">Select Project</option>
                {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
              <input
                type="text"
                placeholder="Vendor"
                value={expenseForm.vendor}
                onChange={(e) => setExpenseForm({...expenseForm, vendor: e.target.value})}
                className="w-full p-2 mb-3 bg-gray-800 rounded"
              />
              <input
                type="text"
                placeholder="Category"
                value={expenseForm.category}
                onChange={(e) => setExpenseForm({...expenseForm, category: e.target.value})}
                className="w-full p-2 mb-3 bg-gray-800 rounded"
              />
              <textarea
                placeholder="Description"
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                className="w-full p-2 mb-3 bg-gray-800 rounded"
              />
              <div className="flex justify-end space-x-2">
                <button onClick={() => setShowAddExpense(false)} className="px-4 py-2 bg-gray-700 rounded">Cancel</button>
                <button onClick={handleAddExpense} className="px-4 py-2 bg-blue-600 rounded">Add</button>
              </div>
            </div>
          </div>
        )}

        {showAddProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-semibold mb-4">Add Project</h3>
              <input
                type="text"
                placeholder="Project Name"
                value={projectForm.name}
                onChange={(e) => setProjectForm({...projectForm, name: e.target.value})}
                className="w-full p-2 mb-3 bg-gray-800 rounded"
              />
              <input
                type="number"
                placeholder="Budget"
                value={projectForm.budget}
                onChange={(e) => setProjectForm({...projectForm, budget: e.target.value})}
                className="w-full p-2 mb-3 bg-gray-800 rounded"
              />
              <input
                type="text"
                placeholder="Location"
                value={projectForm.location}
                onChange={(e) => setProjectForm({...projectForm, location: e.target.value})}
                className="w-full p-2 mb-3 bg-gray-800 rounded"
              />
              <input
                type="text"
                placeholder="Contractor"
                value={projectForm.contractor}
                onChange={(e) => setProjectForm({...projectForm, contractor: e.target.value})}
                className="w-full p-2 mb-3 bg-gray-800 rounded"
              />
              <div className="flex justify-end space-x-2">
                <button onClick={() => setShowAddProject(false)} className="px-4 py-2 bg-gray-700 rounded">Cancel</button>
                <button onClick={handleAddProject} className="px-4 py-2 bg-blue-600 rounded">Add</button>
              </div>
            </div>
          </div>
        )}

        {editingExpense && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-semibold mb-4">Edit Expense</h3>
              <input
                type="number"
                value={editingExpense.amount}
                onChange={(e) => setEditingExpense({...editingExpense, amount: parseFloat(e.target.value)})}
                className="w-full p-2 mb-3 bg-gray-800 rounded"
              />
              <select
                value={editingExpense.project}
                onChange={(e) => setEditingExpense({...editingExpense, project: e.target.value})}
                className="w-full p-2 mb-3 bg-gray-800 rounded"
              >
                {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
              <input
                type="text"
                value={editingExpense.vendor}
                onChange={(e) => setEditingExpense({...editingExpense, vendor: e.target.value})}
                className="w-full p-2 mb-3 bg-gray-800 rounded"
              />
              <div className="flex justify-end space-x-2">
                <button onClick={() => setEditingExpense(null)} className="px-4 py-2 bg-gray-700 rounded">Cancel</button>
                <button onClick={handleUpdateExpense} className="px-4 py-2 bg-blue-600 rounded">Update</button>
              </div>
            </div>
          </div>
        )}

        {editingProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-semibold mb-4">Edit Project</h3>
              <input
                type="text"
                value={editingProject.name}
                onChange={(e) => setEditingProject({...editingProject, name: e.target.value})}
                className="w-full p-2 mb-3 bg-gray-800 rounded"
              />
              <input
                type="number"
                value={editingProject.budget}
                onChange={(e) => setEditingProject({...editingProject, budget: parseFloat(e.target.value)})}
                className="w-full p-2 mb-3 bg-gray-800 rounded"
              />
              <input
                type="text"
                value={editingProject.location}
                onChange={(e) => setEditingProject({...editingProject, location: e.target.value})}
                className="w-full p-2 mb-3 bg-gray-800 rounded"
              />
              <div className="flex justify-end space-x-2">
                <button onClick={() => setEditingProject(null)} className="px-4 py-2 bg-gray-700 rounded">Cancel</button>
                <button onClick={handleUpdateProject} className="px-4 py-2 bg-blue-600 rounded">Update</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
