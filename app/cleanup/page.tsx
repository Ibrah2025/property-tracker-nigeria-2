'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export default function CleanupPage() {
  const router = useRouter()
  const [status, setStatus] = useState('Ready to clean database')

  const cleanupDatabase = async () => {
    setStatus('Cleaning in progress... Check Firebase Console')
    // Manual cleanup needed in Firebase
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push('/')}
          className="mb-4 p-2 hover:bg-gray-800 rounded-lg"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold mb-4">Database Cleanup</h1>
        <div className="bg-gray-900 rounded-xl p-6">
          <p className="mb-4">To clean old project data:</p>
          <ol className="list-decimal list-inside space-y-2 mb-6">
            <li>Go to Firebase Console</li>
            <li>Open Firestore Database</li>
            <li>Click expenses collection</li>
            <li>Delete documents with wrong project names</li>
          </ol>
          
            href="https://console.firebase.google.com/project/property-manager-ng/firestore"
            target="_blank"
            className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Open Firebase Console
          </a>
          <p className="mt-4 text-sm text-gray-400">{status}</p>
        </div>
      </div>
    </div>
  )
}
