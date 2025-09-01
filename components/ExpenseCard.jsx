"use client"
import { motion } from 'framer-motion'
import { Trash2, Edit2, MapPin, Calendar, Building2, User, Tag, FileText } from 'lucide-react'
import { formatCurrency } from '@/utils/formatters'

export default function ExpenseCard({ expense, onDelete, onEdit }) {
  const getCategoryIcon = (category) => {
    const icons = {
      'labour': User,
      'cement': Building2,
      'blocks': Building2,
      'transport': MapPin,
      'materials': Tag,
      'other': FileText
    }
    const Icon = icons[category?.toLowerCase()] || FileText
    return <Icon className="w-4 h-4" />
  }

  const getCategoryColor = (category) => {
    const colors = {
      'labour': 'from-blue-400 to-blue-600',
      'cement': 'from-gray-400 to-gray-600',
      'blocks': 'from-orange-400 to-orange-600',
      'transport': 'from-green-400 to-green-600',
      'materials': 'from-purple-400 to-purple-600',
      'other': 'from-pink-400 to-pink-600'
    }
    return colors[category?.toLowerCase()] || 'from-gray-400 to-gray-600'
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className="relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl p-5 border border-gray-700/50 hover:border-blue-500/50 transition-all group"
    >
      {/* Category Badge */}
      <div className={`absolute top-3 right-3 p-2 bg-gradient-to-br ${getCategoryColor(expense.category)} rounded-xl opacity-20 group-hover:opacity-30 transition-opacity`} />
      
      <div className="relative">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 bg-gradient-to-br ${getCategoryColor(expense.category)} rounded-lg`}>
                {getCategoryIcon(expense.category)}
              </div>
              <span className="text-sm font-medium text-gray-400">{expense.project}</span>
            </div>
            <h3 className="text-white font-bold text-lg mb-1">
              {expense.vendor || "Unknown Vendor"}
            </h3>
            <p className="text-gray-400 text-sm">
              {expense.description || expense.category || "No description"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              {formatCurrency(expense.amount)}
            </p>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-700/50">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(expense.date || expense.createdAt).toLocaleDateString('en-NG')}
            </span>
            {expense.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {expense.location}
              </span>
            )}
          </div>
          
          <div className="flex gap-1">
            {onEdit && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onEdit(expense)}
                className="p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4 text-blue-400" />
              </motion.button>
            )}
            {onDelete && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onDelete(expense.id)}
                className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
