export const PROJECTS = [
  { 
    name: "Maitama Heights",
    budget: 850000000,
    location: "Maitama District",
    type: "Luxury Villas"
  },
  { 
    name: "Asokoro Residences",
    budget: 1250000000,
    location: "Asokoro",
    type: "Premium Apartments"
  },
  { 
    name: "Katampe Hills Estate",
    budget: 2450000000,
    location: "Katampe Extension",
    type: "Gated Community"
  },
  { 
    name: "Wuse II Towers",
    budget: 1850000000,
    location: "Wuse II",
    type: "Mixed Use Complex"
  },
  { 
    name: "Jabi Lakeside",
    budget: 950000000,
    location: "Jabi",
    type: "Waterfront Condos"
  },
  { 
    name: "Garki Site",
    budget: 750000000,
    location: "Garki",
    type: "Office Complex"
  }
]

export function normalizeProjectName(name) {
  if (!name) return null
  const normalized = name.toLowerCase().trim()
  
  const mappings = {
    'maitama': 'Maitama Heights',
    'maitama heights': 'Maitama Heights',
    'asokoro': 'Asokoro Residences',
    'asokoro residences': 'Asokoro Residences',
    'katampe': 'Katampe Hills Estate',
    'katampe hills': 'Katampe Hills Estate',
    'wuse': 'Wuse II Towers',
    'wuse ii': 'Wuse II Towers',
    'wuse 2': 'Wuse II Towers',
    'jabi': 'Jabi Lakeside',
    'jabi lakeside': 'Jabi Lakeside',
    'garki': 'Garki Site',
    'garki site': 'Garki Site'
  }
  
  return mappings[normalized] || null
}
