// Add this improved vendor detection function
function detectVendor(text: string): string | null {
  // Known vendors
  const knownVendors = ['Dangote', 'BUA', 'Excel', 'Julius Berger', 'Sahad', 'PW']
  const found = knownVendors.find(v => text.toLowerCase().includes(v.toLowerCase()))
  if (found) return found
  
  // Remove known keywords
  let cleanText = text.toLowerCase()
  const removeWords = ['cement', 'blocks', 'sand', 'transport', 'labour', 'materials', 
                       'maitama', 'jabi', 'garki', 'katampe', 'asokoro', 'wuse',
                       'paid', 'for', 'to', 'at', 'k', 'm', 'million', 'thousand']
  
  // Remove amounts
  cleanText = cleanText.replace(/\d+\.?\d*\s*(k|m|million|thousand)?/gi, '')
  
  // Remove known words
  removeWords.forEach(word => {
    cleanText = cleanText.replace(new RegExp('\\b' + word + '\\b', 'gi'), '')
  })
  
  // Clean up extra spaces
  cleanText = cleanText.trim().replace(/\s+/g, ' ')
  
  // Check for vendor keyword
  const vendorMatch = text.match(/(?:vendor|from|to|supplier)\s+(\w+)/i)
  if (vendorMatch) return vendorMatch[1]
  
  // If there's a remaining word, likely the vendor name
  const words = cleanText.split(' ').filter(w => w.length > 2)
  if (words.length === 1) {
    // Capitalize first letter
    return words[0].charAt(0).toUpperCase() + words[0].slice(1)
  }
  
  return null
}
