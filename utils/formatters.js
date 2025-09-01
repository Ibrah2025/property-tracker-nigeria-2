export const formatCurrency = (amount) => {
  if (!amount || isNaN(amount)) return '₦0.00'
  
  const absAmount = Math.abs(amount)
  
  if (absAmount >= 1e9) {
    return `₦${(amount / 1e9).toFixed(2)}B`
  } else if (absAmount >= 1e6) {
    return `₦${(amount / 1e6).toFixed(2)}M`
  } else if (absAmount >= 1e3) {
    return `₦${(amount / 1e3).toFixed(1)}K`
  }
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export const calculateProgress = (spent, budget) => {
  if (!budget || budget === 0) return 0
  const progress = (spent / budget) * 100
  return Math.min(Math.max(progress, 0), 100) // Clamp between 0-100
}

export const getProgressColor = (progress) => {
  if (progress >= 90) return { bg: 'bg-red-500', text: 'text-red-400', glow: 'shadow-red-500/50' }
  if (progress >= 75) return { bg: 'bg-orange-500', text: 'text-orange-400', glow: 'shadow-orange-500/50' }
  if (progress >= 50) return { bg: 'bg-yellow-500', text: 'text-yellow-400', glow: 'shadow-yellow-500/50' }
  return { bg: 'bg-emerald-500', text: 'text-emerald-400', glow: 'shadow-emerald-500/50' }
}

export const validateExpense = (expense) => {
  const cleaned = {
    ...expense,
    amount: parseFloat(expense.amount) || 0,
    vendor: expense.vendor || 'Unnamed Vendor',
    description: expense.description || expense.category || 'General Expense',
    category: expense.category || 'Other',
    project: expense.project || 'Unassigned',
    date: expense.date || expense.createdAt || new Date().toISOString()
  }
  
  // Remove invalid data
  if (cleaned.amount < 0 || cleaned.amount > 1e10) {
    cleaned.amount = 0
  }
  
  return cleaned
}
