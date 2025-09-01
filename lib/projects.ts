export const PROJECTS = [
  { id: 'maitama-heights', name: 'Maitama Heights', budget: 15000000 },
  { id: 'garki-site', name: 'Garki Site', budget: 12000000 },
  { id: 'katampe-hills', name: 'Katampe Hills Estate', budget: 20000000 },
  { id: 'asokoro-residences', name: 'Asokoro Residences', budget: 18000000 },
  { id: 'jabi-lakeside', name: 'Jabi Lakeside', budget: 25000000 },
  { id: 'wuse-towers', name: 'Wuse II Towers', budget: 30000000 }
]

export function normalizeProjectName(name) {
  if (!name) return null
  
  const normalized = name.toLowerCase().trim()
  
  // Map all variations to standard names
  const nameMap = {
    'maitama': 'Maitama Heights',
    'maitama heights': 'Maitama Heights',
    'garki': 'Garki Site',
    'garki1': 'Garki Site',
    'garki site': 'Garki Site',
    'jabi': 'Jabi Lakeside',
    'jabi lakeside': 'Jabi Lakeside',
    'katampe': 'Katampe Hills Estate',
    'katampe hills': 'Katampe Hills Estate',
    'katampe hills estate': 'Katampe Hills Estate',
    'asokoro': 'Asokoro Residences',
    'asokoro residences': 'Asokoro Residences',
    'asokoro boulevard': 'Asokoro Residences',
    'wuse': 'Wuse II Towers',
    'wuse ii': 'Wuse II Towers',
    'wuse ii towers': 'Wuse II Towers',
    'wuse 2': 'Wuse II Towers',
    'test': null,
    'test complex': null,
    'demonstration site': null
  }
  
  return nameMap[normalized] || name
}
