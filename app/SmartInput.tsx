"use client"
import { useState } from "react"

interface SmartInputProps {
  onParse: (data: any) => void
}

export default function SmartInput({ onParse }: SmartInputProps) {
  const [inputText, setInputText] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [apiStatus, setApiStatus] = useState("")

  const sampleMessages = [
    "I just sent 2.5 million naira to Dangote Cement for the Maitama project",
    "Paid Alhaji Musa 450k for blocks today - Katampe Hills",
    "Foundation work - 1.8M transferred to Excel Construction for Asokoro"
  ]

  const parseMessage = async (text: string) => {
    setIsParsing(true)
    setApiStatus("Calling Claude API...")
    
    try {
      // REAL API CALL
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setApiStatus("✓ Claude API Success")
        onParse(data.parsed)
      } else {
        setApiStatus("✗ API Error: " + (data.error || "Unknown error"))
        // Fallback to mock data
        const mockParsed = {
          amount: "2500000",
          vendor: "Dangote Cement",
          category: "Cement",
          project: "Maitama Heights",
          description: text
        }
        onParse(mockParsed)
      }
    } catch (error: any) {
      setApiStatus("✗ API Error: " + error.message)
      console.error('Parse error:', error)
    } finally {
      setIsParsing(false)
      setTimeout(() => setApiStatus(""), 3000)
    }
  }

  const simulateVoiceRecording = () => {
    setIsRecording(true)
    setTimeout(() => {
      setIsRecording(false)
      const randomMessage = sampleMessages[Math.floor(Math.random() * sampleMessages.length)]
      setInputText(randomMessage)
      parseMessage(randomMessage)
    }, 2000)
  }

  return (
    <div className="bg-gradient-to-r from-blue-600 to-green-600 rounded-lg p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-white">AI-Powered Input</h3>
        <span className="text-xs bg-white text-green-700 px-2 py-1 rounded-full font-semibold">
          Nigerian Context Aware
        </span>
      </div>

      {apiStatus && (
        <div className={`mb-3 p-2 rounded text-white text-sm font-semibold ${
          apiStatus.includes('✓') ? 'bg-green-500' : apiStatus.includes('✗') ? 'bg-red-500' : 'bg-yellow-500'
        }`}>
          {apiStatus}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-3">
        <button
          onClick={simulateVoiceRecording}
          disabled={isRecording || isParsing}
          className={`p-4 rounded-lg border-2 transition-all font-semibold ${
            isRecording 
              ? 'bg-red-500 text-white border-red-500 animate-pulse' 
              : 'bg-white text-gray-800 hover:bg-gray-100 border-white'
          }`}
        >
          <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <span className="text-sm">
            {isRecording ? "Recording..." : "Voice Note"}
          </span>
        </button>

        <button className="p-4 rounded-lg border-2 bg-white text-gray-800 hover:bg-gray-100 border-white transition-all font-semibold">
          <svg className="w-8 h-8 mx-auto mb-2 text-green-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.149-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
          <span className="text-sm">WhatsApp</span>
        </button>
      </div>

      <div className="mb-3">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type or paste message... Mix of English and Hausa is understood"
          className="w-full p-3 border-2 border-gray-300 rounded-lg text-sm text-gray-800 bg-white placeholder-gray-500"
          rows={3}
        />
      </div>

      <button
        onClick={() => parseMessage(inputText)}
        disabled={!inputText || isParsing}
        className={`w-full py-3 rounded-lg font-bold text-sm transition ${
          isParsing 
            ? 'bg-gray-400 text-gray-200' 
            : 'bg-white text-blue-600 hover:bg-gray-100'
        }`}
      >
        {isParsing ? "AI Processing..." : "Parse with AI"}
      </button>

      <div className="mt-3 pt-3 border-t border-white/30">
        <p className="text-sm text-white font-semibold mb-2">Sample messages (click to try):</p>
        <div className="space-y-2">
          {sampleMessages.map((msg, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInputText(msg)
                parseMessage(msg)
              }}
              className="text-xs text-left w-full p-2 bg-white/90 text-gray-800 rounded hover:bg-white transition font-medium"
            >
              "{msg}"
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
