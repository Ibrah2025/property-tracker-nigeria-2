'use client'

export default function CleanupPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Database Cleanup</h1>
        <p className="text-gray-400 mb-8">
          Manage and clean your Firebase database
        </p>
        
          href="https://console.firebase.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
        >
          Open Firebase Console
        </a>
      </div>
    </div>
  )
}
