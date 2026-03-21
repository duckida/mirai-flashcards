import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { apiClient } from '@/services/apiClient'
import { moduleService } from '@/services/moduleService'

export default function VoiceQuizScreen({ moduleId, flashcard, onBack }) {
  const [module, setModule] = useState(null)
  const [error, setError] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [status, setStatus] = useState('idle')
  const [messages, setMessages] = useState([])
  const conversationRef = useRef(null)
  const startedRef = useRef(false)

  useEffect(() => {
    if (!moduleId) return
    moduleService.getModuleFlashcards(moduleId).then((r) => {
      if (r.success) setModule(r.module)
    })
  }, [moduleId])

  const startVoiceSession = useCallback(async () => {
    if (!flashcard || startedRef.current) return

    startedRef.current = true
    setIsConnecting(true)
    setError(null)

    try {
      const { Conversation } = await import('@elevenlabs/client')

      const tokenResult = await apiClient.post('/api/quiz/speech-token', {
        content: flashcard.content,
        moduleName: module?.name || 'Quiz'
      })

      if (!tokenResult.success) throw new Error(tokenResult.error || 'Failed to get speech token')

      const { signedUrl } = tokenResult

      await navigator.mediaDevices.getUserMedia({ audio: true })

      const conversation = await Conversation.startSession({
        signedUrl,
        connectionType: 'websocket',
        overrides: {
          agent: {
            prompt: `You are a quiz tutor. Quiz the student on this flashcard: ${flashcard.content}. Ask questions, evaluate answers, and give feedback.`,
          },
        },
        onConnect: () => {
          setIsConnected(true)
          setIsConnecting(false)
          setStatus('connected')
        },
        onDisconnect: () => {
          setIsConnected(false)
          setStatus('disconnected')
          onBack()
        },
        onMessage: (message) => {
          setMessages(prev => [...prev, message])
        },
        onError: (err) => {
          console.error('Voice error:', err)
          setError(err.message || 'Voice connection error')
          setIsConnecting(false)
          startedRef.current = false
        },
        onStatusChange: (newStatus) => setStatus(newStatus),
      })

      conversationRef.current = conversation
    } catch (err) {
      setError(err.message || 'Failed to start voice session')
      setIsConnecting(false)
      startedRef.current = false
    }
  }, [flashcard, module, onBack])

  const endVoiceSession = useCallback(async () => {
    if (conversationRef.current) {
      await conversationRef.current.endSession()
      conversationRef.current = null
    }
    startedRef.current = false
    onBack()
  }, [onBack])

  useEffect(() => {
    if (module && flashcard && !startedRef.current) {
      startVoiceSession()
    }
  }, [module, flashcard, startVoiceSession])

  useEffect(() => {
    return () => {
      if (conversationRef.current) {
        conversationRef.current.endSession()
        conversationRef.current = null
      }
    }
  }, [])

  if (!flashcard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 rounded-full bg-error-light flex items-center justify-center mx-auto mb-4 text-3xl">⚠️</div>
            <h3 className="text-xl font-bold text-error mb-2">Voice Error</h3>
            <p className="text-text-secondary mb-4">{error}</p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={onBack}>← Return</Button>
              <Button className="flex-1" onClick={() => { setError(null); startedRef.current = false; startVoiceSession() }}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="flex items-center justify-between p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary-lighter flex items-center justify-center text-xl">🎤</div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Voice Quiz</h1>
            <p className="text-sm text-text-secondary">{module?.name || 'Module'}</p>
          </div>
        </div>
        <Button variant="destructive" size="sm" onClick={endVoiceSession} disabled={!isConnected}>
          End
        </Button>
      </header>

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full flex flex-col items-center justify-center">
        <Card className="w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="flex flex-col items-center gap-6">
              <div className={`w-32 h-32 rounded-full flex items-center justify-center text-6xl transition-all ${
                isConnected
                  ? status === 'speaking' ? 'bg-primary animate-pulse' : 'bg-success'
                  : isConnecting ? 'bg-warning animate-pulse' : 'bg-border'
              }`}>
                {isConnecting ? '⏳' : isConnected ? (status === 'speaking' ? '🎙️' : '👂') : '🎤'}
              </div>

              <div>
                <h2 className="text-2xl font-bold text-text-primary mb-2">
                  {isConnecting ? 'Connecting...' : isConnected ? 'Voice Quiz Active' : 'Ready'}
                </h2>
                <p className="text-text-secondary">
                  {isConnecting
                    ? 'Allow microphone access...'
                    : 'Speak with the AI agent about this flashcard'
                  }
                </p>
              </div>

              {isConnected && (
                <Button variant="destructive" size="lg" onClick={endVoiceSession}>
                  End Quiz
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {messages.length > 0 && (
          <Card className="w-full mt-4">
            <CardContent className="pt-4 pb-4">
              <h3 className="text-sm font-semibold text-text-secondary mb-2">Conversation</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {messages.map((msg, i) => (
                  <div key={i} className={`text-sm ${msg.source === 'user' ? 'text-primary' : 'text-text-secondary'}`}>
                    <span className="font-semibold">{msg.source === 'user' ? 'You: ' : 'Agent: '}</span>
                    {msg.message}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
