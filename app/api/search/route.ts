import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../lib/firebase'
import { collection, getDocs } from 'firebase/firestore'

// Normalization function
function normalizeCategory(category: string): string {
  if (!category) return 'Other'
  const cat = category.toLowerCase().trim()
  
  if (cat.includes('cement')) return 'Cement'
  if (cat.includes('block') || cat.includes('brick')) return 'Blocks & Bricks'
  if (cat.includes('foundation')) return 'Foundation'
  if (cat.includes('plywood') || cat.includes('wood')) return 'Materials'
  if (cat.includes('transport')) return 'Transport'
  if (cat.includes('plumb')) return 'Plumbing'
  if (cat.includes('electric')) return 'Electrical'
  if (cat.includes('roof')) return 'Roofing'
  if (cat.includes('finish')) return 'Finishing'
  if (cat.includes('labour') || cat.includes('labor')) return 'Labour'
  if (cat === 'expense' || cat === 'expenses') return 'Other'
  if (cat === 'construction material') return 'Materials'
  
  // Keep original if it's already normalized
  const validCategories = ['Cement', 'Blocks & Bricks', 'Foundation', 'Materials', 
    'Transport', 'Plumbing', 'Electrical', 'Roofing', 'Finishing', 'Labour', 'Other']
  
  const properCase = cat.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
  
  if (validCategories.includes(properCase)) return properCase
  
  return 'Other'
}

export async function POST(req: NextRequest) {
  try {
    const filters = await req.json()
    const snapshot = await getDocs(collection(db, 'expenses'))
    let results = []
    
    snapshot.forEach(doc => {
      const data = { id: doc.id, ...doc.data() }
      
      // Normalize category for every record
      data.category = normalizeCategory(data.category)
      
      // Clean vendor
      if (data.vendor && (data.vendor.includes('same as') || data.vendor === data.description)) {
        data.vendor = 'Unknown'
      }
      
      // Fix project
      if (!data.project || data.project === 'null' || data.project === '') {
        data.project = 'Unknown Project'
      }
      
      // Skip invalid records
      if (!data.amount || data.amount <= 0) return
      
      let match = true
      
      // Apply filters
      if (filters.query && match) {
        const searchTerm = filters.query.toLowerCase()
        const searchableText = [
          data.description,
          data.vendor,
          data.project,
          data.category
        ].join(' ').toLowerCase()
        
        match = searchableText.includes(searchTerm)
      }
      
      if (match && filters.dateFrom) {
        match = new Date(data.createdAt) >= new Date(filters.dateFrom)
      }
      
      if (match && filters.dateTo) {
        match = new Date(data.createdAt) <= new Date(filters.dateTo)
      }
      
      if (match && filters.minAmount) {
        match = data.amount >= filters.minAmount
      }
      
      if (match && filters.maxAmount) {
        match = data.amount <= filters.maxAmount
      }
      
      if (match) {
        results.push(data)
      }
    })
    
    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    
    const facets = generateFacets(results)
    const analytics = generateAnalytics(results)
    
    return NextResponse.json({
      success: true,
      results,
      total: results.length,
      facets,
      analytics
    })
    
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ success: false, error: 'Search failed' }, { status: 500 })
  }
}

function generateFacets(results: any[]) {
  const facets = {
    projects: {},
    vendors: {},
    categories: {},
    sources: {}
  }
  
  results.forEach(item => {
    if (item.project && item.project !== 'Unknown Project') {
      facets.projects[item.project] = (facets.projects[item.project] || 0) + 1
    }
    if (item.vendor && item.vendor !== 'Unknown') {
      facets.vendors[item.vendor] = (facets.vendors[item.vendor] || 0) + 1
    }
    if (item.category) {
      facets.categories[item.category] = (facets.categories[item.category] || 0) + 1
    }
    const source = item.source || 'web'
    facets.sources[source] = (facets.sources[source] || 0) + 1
  })
  
  return facets
}

function generateAnalytics(results: any[]) {
  const totalAmount = results.reduce((sum, item) => sum + (item.amount || 0), 0)
  const avgAmount = results.length > 0 ? totalAmount / results.length : 0
  
  const vendorSpending = {}
  results.forEach(item => {
    if (item.vendor && item.vendor !== 'Unknown') {
      vendorSpending[item.vendor] = (vendorSpending[item.vendor] || 0) + item.amount
    }
  })
  
  const topVendor = Object.entries(vendorSpending).sort((a, b) => b[1] - a[1])[0]
  
  const projectSpending = {}
  results.forEach(item => {
    if (item.project && item.project !== 'Unknown Project') {
      projectSpending[item.project] = (projectSpending[item.project] || 0) + item.amount
    }
  })
  
  const topProject = Object.entries(projectSpending).sort((a, b) => b[1] - a[1])[0]
  
  return {
    totalAmount,
    avgAmount,
    totalCount: results.length,
    topVendor: topVendor ? { name: topVendor[0], amount: topVendor[1] } : null,
    topProject: topProject ? { name: topProject[0], amount: topProject[1] } : null
  }
}
