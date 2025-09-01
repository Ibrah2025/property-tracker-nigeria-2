"use client"
import { motion } from 'framer-motion'
import { Building2, TrendingUp, AlertCircle, ArrowRight, Clock, MapPin } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/utils/formatters'

export default function ProjectCard({ project }) {
  const router = useRouter()
  
  // Calculate progress with proper bounds
  const calculateProgress = () => {
    if (!project.budget || project.budget === 0) return 0
    const rawProgress = (project.spent / project.budget) * 100
    // Clamp between 0 and 999 (to handle over-budget scenarios)
    return Math.min(Math.max(rawProgress, 0), 999)
  }
  
  const progress = calculateProgress()
  
  // Format progress for display - always show max 1 decimal place
  const formatProgress = (value) => {
    if (value === 0) return "0"
    if (value === 100) return "100"
    if (value > 100) return value.toFixed(0) // No decimals for over-budget
    return value.toFixed(1) // One decimal for normal progress
  }
  
  const getProgressColor = () => {
    if (progress >= 90) return {
      bg: 'from-red-500 to-red-600',
      text: 'text-red-400',
      glow: 'shadow-red-500/50',
      bar: 'bg-red-500'
    }
    if (progress >= 75) return {
      bg: 'from-orange-500 to-orange-600',
      text: 'text-orange-400',
      glow: 'shadow-orange-500/50',
      bar: 'bg-orange-500'
    }
    if (progress >= 50) return {
      bg: 'from-yellow-500 to-yellow-600',
      text: 'text-yellow-400',
      glow: 'shadow-yellow-500/50',
      bar: 'bg-yellow-500'
    }
    return {
      bg: 'from-blue-500 to-blue-600',
      text: 'text-blue-400',
      glow: 'shadow-blue-500/50',
      bar: 'bg-blue-500'
    }
  }
  
  const colors = getProgressColor()
  
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -5 }}
      whileTap={{ scale: 0.98 }}
      className="relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 hover:border-blue-500/50 transition-all cursor-pointer group overflow-hidden"
      onClick={() => router.push(`/project/${project.name.toLowerCase().replace(/\s+/g, '-')}`)}
    >
      {/* Animated Background Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg} opacity-5 group-hover:opacity-10 transition-opacity`} />
      
      {/* Header */}
      <div className="relative flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 bg-gradient-to-br ${colors.bg} bg-opacity-20 rounded-xl`}>
            <Building2 className={`w-5 h-5 ${colors.text}`} />
          </div>
          <div>
            <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors">
              {project.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <MapPin className="w-3 h-3 text-gray-500" />
              <p className="text-xs text-gray-500">{project.location || 'Abuja'}</p>
            </div>
          </div>
        </div>
        <motion.div
          animate={{ rotate: progress >= 75 ? [0, 10, -10, 0] : 0 }}
          transition={{ duration: 2, repeat: progress >= 75 ? Infinity : 0 }}
        >
          {progress >= 75 ? (
            <AlertCircle className={`w-5 h-5 ${colors.text}`} />
          ) : (
            <TrendingUp className={`w-5 h-5 ${colors.text}`} />
          )}
        </motion.div>
      </div>
      
      {/* Financial Info */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">Budget</p>
            <p className="text-sm font-bold text-white">{formatCurrency(project.budget)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Spent</p>
            <p className={`text-sm font-bold ${project.spent > project.budget ? 'text-red-400' : 'text-white'}`}>
              {formatCurrency(project.spent)}
            </p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs text-gray-500">Progress</p>
            <p className={`text-xs font-bold ${colors.text}`}>
              {formatProgress(progress)}%
            </p>
          </div>
          <div className="relative w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, progress)}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`absolute h-full ${colors.bar} rounded-full ${colors.glow} shadow-lg`}
            />
            {progress > 100 && (
              <div className="absolute right-0 top-0 h-full w-2 bg-red-500 animate-pulse" />
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-700/50">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {project.expenses?.length || 0} transactions
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors transform group-hover:translate-x-1" />
        </div>
      </div>
      
      {/* Status Badge */}
      {progress > 100 && (
        <div className="absolute top-2 right-2 px-2 py-1 bg-red-500/20 border border-red-500/50 rounded-full">
          <p className="text-xs font-bold text-red-400">Over Budget</p>
        </div>
      )}
    </motion.div>
  )
}
