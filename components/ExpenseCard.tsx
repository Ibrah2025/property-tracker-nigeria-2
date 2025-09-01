'use client'
import { useState } from 'react'
import { Trash2, Edit, Check, X, Clock } from 'lucide-react'

export default function ExpenseCard({ expense, onUpdate, onDelete }: any) {
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState(expense)
  
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('en-NG'),
      time: date.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
    }
  }
  
  const { date, time } = formatDateTime(expense.createdAt)
  
  const handleSave = async () => {
    // Normalize common vendor misspellings
    const vendorMap = {
      'dagote': 'Dangote',
      'muster eletronics': 'Master Electronics'
    }
    const normalized = vendorMap[editData.vendor?.toLowerCase()] || editData.vendor
    await onUpdate(expense.id, { ...editData, vendor: normalized })
    setIsEditing(false)
  }
  
  const handleDelete = async () => {
    if (confirm('Delete this expense?')) {
      await onDelete(expense.id)
    }
  }
  
  if (isEditing) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg mb-3">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <input
            type="number"
            value={editData.amount}
            onChange={(e) => setEditData({...editData, amount: Number(e.target.value)})}
            className="bg-gray-700 text-white p-2 rounded"
            placeholder="Amount"
          />
          <input
            value={editData.vendor}
            onChange={(e) => setEditData({...editData, vendor: e.target.value})}
            className="bg-gray-700 text-white p-2 rounded"
            placeholder="Vendor"
          />
          <input
            value={editData.category}
            onChange={(e) => setEditData({...editData, category: e.target.value})}
            className="bg-gray-700 text-white p-2 rounded"
            placeholder="Category"
          />
          <input
            value={editData.project}
            onChange={(e) => setEditData({...editData, project: e.target.value})}
            className="bg-gray-700 text-white p-2 rounded"
            placeholder="Project"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} className="bg-green-600 p-2 rounded flex-1">
            <Check className="w-4 h-4 inline" /> Save
          </button>
          <button onClick={() => setIsEditing(false)} className="bg-gray-600 p-2 rounded flex-1">
            <X className="w-4 h-4 inline" /> Cancel
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="bg-gray-800 p-4 rounded-lg mb-3 flex justify-between items-center">
      <div className="flex-1">
        <div className="text-lg font-bold text-yellow-400">
          N{expense.amount?.toLocaleString()}
        </div>
        <div className="text-sm text-gray-400">
          {expense.vendor} • {expense.category}
        </div>
        <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
          <Clock className="w-3 h-3" />
          {date} at {time}
        </div>
        {expense.source && (
          <div className="text-xs text-blue-400 mt-1">
            via {expense.source}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setIsEditing(true)}
          className="bg-blue-600 p-2 rounded hover:bg-blue-700"
        >
          <Edit className="w-4 h-4" />
        </button>
        <button
          onClick={handleDelete}
          className="bg-red-600 p-2 rounded hover:bg-red-700"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
