'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Edit2, Trash2, Building, DollarSign } from 'lucide-react'

export default function ProjectsManagement() {
  const [projects, setProjects] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    budget: '',
    status: 'planning'
  })

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      const data = await response.json()
      if (data.success) {
        setProjects(data.projects)
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const projectData = {
      ...formData,
      budget: parseFloat(formData.budget)
    }
    
    try {
      if (editingProject) {
        const response = await fetch('/api/projects', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingProject.id, ...projectData })
        })
        
        if (response.ok) {
          fetchProjects()
          setEditingProject(null)
        }
      } else {
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projectData)
        })
        
        if (response.ok) {
          fetchProjects()
          setShowAddForm(false)
        }
      }
      
      setFormData({ name: '', location: '', budget: '', status: 'planning' })
    } catch (error) {
      console.error('Error saving:', error)
    }
  }

  const handleDelete = async (id) => {
    if (confirm('Delete this project?')) {
      try {
        const response = await fetch(`/api/projects?id=${id}`, {
          method: 'DELETE'
        })
        
        if (response.ok) {
          fetchProjects()
        }
      } catch (error) {
        console.error('Error deleting:', error)
      }
    }
  }

  const startEdit = (project) => {
    setEditingProject(project)
    setFormData({
      name: project.name,
      location: project.location,
      budget: project.budget.toString(),
      status: project.status
    })
    setShowAddForm(true)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-400 hover:text-white">
              <ArrowLeft size={24} />
            </Link>
            <h1 className="text-3xl font-bold">Manage Projects</h1>
          </div>
          <button
            onClick={() => {
              setShowAddForm(!showAddForm)
              setEditingProject(null)
              setFormData({ name: '', location: '', budget: '', status: 'planning' })
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700"
          >
            <Plus size={20} />
            Add New Project
          </button>
        </div>

        {showAddForm && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">
              {editingProject ? 'Edit Project' : 'Add New Project'}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Project Name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg"
                required
              />
              <input
                type="text"
                placeholder="Location"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg"
                required
              />
              <input
                type="number"
                placeholder="Budget (in Naira)"
                value={formData.budget}
                onChange={(e) => setFormData({...formData, budget: e.target.value})}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg"
                required
              />
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg"
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="on-hold">On Hold</option>
              </select>
              <button
                type="submit"
                className="col-span-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingProject ? 'Update Project' : 'Create Project'}
              </button>
            </form>
          </div>
        )}

        <div className="grid gap-4">
          {projects.map((project) => (
            <div key={project.id} className="bg-gray-800 border border-gray-700 rounded-lg p-6 flex justify-between items-center">
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2">{project.name}</h3>
                <div className="flex items-center gap-6 text-gray-400">
                  <span className="flex items-center gap-2">
                    <Building size={16} />
                    {project.location}
                  </span>
                  <span className="flex items-center gap-2">
                    <DollarSign size={16} />
                    ₦{(project.budget / 1000000).toFixed(1)}M Budget
                  </span>
                  <span className="text-yellow-400">
                    ₦{(project.totalExpenses / 1000000).toFixed(1)}M Spent
                  </span>
                  <span className={`px-2 py-1 rounded text-sm ${
                    project.status === 'active' ? 'bg-green-600' :
                    project.status === 'completed' ? 'bg-blue-600' :
                    project.status === 'on-hold' ? 'bg-yellow-600' :
                    'bg-gray-600'
                  }`}>
                    {project.status}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(project)}
                  className="p-2 bg-blue-600 rounded hover:bg-blue-700"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDelete(project.id)}
                  className="p-2 bg-red-600 rounded hover:bg-red-700"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
