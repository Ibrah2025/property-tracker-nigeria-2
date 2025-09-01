// Add duplicate detection
async function checkDuplicate(amount: number, phoneNumber: string) {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  
  const q = query(
    collection(db, 'expenses'),
    where('amount', '==', amount),
    where('whatsappNumber', '==', phoneNumber),
    where('createdAt', '>=', fiveMinutesAgo)
  )
  
  const snapshot = await getDocs(q)
  return !snapshot.empty
}

// Add amount validation
function validateAmount(amount: number): { valid: boolean, warning?: string } {
  if (amount < 100) {
    return { valid: false, warning: 'Amount too small (min ?100)' }
  }
  if (amount > 100000000) {
    return { valid: false, warning: 'Amount too large (max ?100M)' }
  }
  if (amount > 10000000) {
    return { valid: true, warning: '?? Large amount - please verify' }
  }
  return { valid: true }
}
