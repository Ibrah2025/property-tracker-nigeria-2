'use client'

import { Building2, TrendingUp } from 'lucide-react'

export default function ProjectCard({ project }) {
  const progressColor = 
    project.progress >= 80 ? 'bg-red-500' : 
    project.progress >= 60 ? 'bg-yellow-500' : 
    'bg-blue-500'
  
  const statusColor = 
    project.progress >= 80 ? 'text-red-400' : 
    project.progress >= 60 ? 'text-yellow-400' : 
    'text-blue-400'

  return (
    <div className="bg-gray-900 rounded-xl p-6 hover:bg-gray-850 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold">{project.name}</h3>
        </div>
        <TrendingUp className={`w-5 h-5 ${statusColor}`} />
      </div>
      
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">Budget</span>
            <span>N{(project.budget / 1000000).toFixed(1)}M</span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">Spent</span>
            <span className={project.spent > project.budget ? 'text-red-400' : ''}>
              N{(project.spent / 1000000).toFixed(1)}M
            </span>
          </div>
        </div>
        
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">Progress</span>
            <span className={statusColor}>{project.progress}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div 
              className={`${progressColor} h-2 rounded-full transition-all`}
              style={{ width: `${Math.min(100, project.progress)}%` }}
            />
          </div>
        </div>
        
        <div className="pt-2 text-xs text-gray-500">
          {project.expenses.length} transactions
        </div>
      </div>
    </div>
  )
}
