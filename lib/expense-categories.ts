export const expenseCategories = {
  cement: ['cement', 'dangote', 'bua', 'sokoto'],
  blocks: ['blocks', 'block', 'bricks'],
  foundation: ['foundation', 'footing', 'excavation'],
  roofing: ['roofing', 'roof', 'aluminum', 'zinc'],
  labour: ['labour', 'labor', 'workers', 'salary'],
  transport: ['transport', 'delivery', 'vehicle'],
  plumbing: ['plumbing', 'pipes', 'water'],
  electrical: ['electrical', 'wiring', 'lights'],
  other: []
}

export function getCategory(text) {
  const lowerText = text.toLowerCase()
  
  for (const [category, keywords] of Object.entries(expenseCategories)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return category
    }
  }
  
  return 'other'
}
