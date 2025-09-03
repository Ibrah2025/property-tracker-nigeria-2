// lib/offlineQueue.ts
export interface QueuedOperation {
  id: string
  type: 'expense' | 'project' | 'vendor'
  operation: 'add' | 'update' | 'delete'
  data: any
  timestamp: number
  retries: number
}

class OfflineQueue {
  private queue: QueuedOperation[] = []
  private processing = false
  private readonly MAX_RETRIES = 3
  private readonly STORAGE_KEY = 'property_tracker_offline_queue'

  constructor() {
    // Load queue from localStorage
    this.loadQueue()
    
    // Check connection and process queue
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.processQueue())
      setInterval(() => this.processQueue(), 30000) // Try every 30 seconds
    }
  }

  private loadQueue() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        this.queue = JSON.parse(stored)
      }
    }
  }

  private saveQueue() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue))
    }
  }

  add(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retries'>) {
    const item: QueuedOperation = {
      ...operation,
      id: `${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
      retries: 0
    }
    
    this.queue.push(item)
    this.saveQueue()
    
    // Try to process immediately
    this.processQueue()
    
    return item.id
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) return
    if (!navigator.onLine) return
    
    this.processing = true
    const failed: QueuedOperation[] = []
    
    for (const operation of this.queue) {
      try {
        await this.executeOperation(operation)
        // Success - remove from queue
      } catch (error) {
        operation.retries++
        if (operation.retries < this.MAX_RETRIES) {
          failed.push(operation)
        }
        console.error('Failed to sync operation:', error)
      }
    }
    
    this.queue = failed
    this.saveQueue()
    this.processing = false
    
    // Notify UI
    if (typeof window !== 'undefined' && failed.length === 0 && this.queue.length === 0) {
      window.dispatchEvent(new CustomEvent('queue-synced'))
    }
  }

  private async executeOperation(op: QueuedOperation) {
    const { db } = await import('./firebase')
    const { collection, addDoc, updateDoc, deleteDoc, doc } = await import('firebase/firestore')
    
    switch (op.type) {
      case 'expense':
        if (op.operation === 'add') {
          await addDoc(collection(db, 'expenses'), op.data)
        } else if (op.operation === 'update') {
          await updateDoc(doc(db, 'expenses', op.data.id), op.data)
        } else if (op.operation === 'delete') {
          await deleteDoc(doc(db, 'expenses', op.data.id))
        }
        break
        
      case 'project':
        if (op.operation === 'add') {
          await addDoc(collection(db, 'projects'), op.data)
        } else if (op.operation === 'update') {
          await updateDoc(doc(db, 'projects', op.data.id), op.data)
        } else if (op.operation === 'delete') {
          await deleteDoc(doc(db, 'projects', op.data.id))
        }
        break
        
      case 'vendor':
        if (op.operation === 'add') {
          await addDoc(collection(db, 'vendors'), op.data)
        }
        break
    }
  }

  getQueueStatus() {
    return {
      count: this.queue.length,
      items: this.queue,
      isOnline: navigator.onLine
    }
  }

  clearQueue() {
    this.queue = []
    this.saveQueue()
  }
}

export const offlineQueue = typeof window !== 'undefined' ? new OfflineQueue() : null