import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { apiClient } from '@/services/apiClient'
import { quizService } from '@/services/quizService'

// Task 2.2: Accept moduleName prop directly — no secondary module fetch needed
// Task 4.1: Add userId and onComplete props
export default function VoiceQuizScreen({ moduleId, moduleName, flashcard, userId, onBack, onComplete }) {
  const [error, setError] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [status, setStatus] = useState('idle')
  const [messages, setMessages] = useState([])
  // Task 5.1: disconnect dialog state and userEndedRef
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false)
  const conversationRef = useRef(null)
  const startedRef = useRef(false)
  // Task 4.2: track created quiz session ID
  const sessionIdRef = useRef(null)
  // Task 5.1: track whether user intentionally ended the session
  const userEndedRef = useRef(false)

  const startVoiceSession = useCallback(async () => {
    if (!flashcard || startedRef.current) return

    // Task 3.1: Guard against empty content
    if (!flashcard?.content?.trim()) {
      setError('This flashcard has no content to quiz on.')
      setIsConnecting(false)
      startedRef.current = false
      return
    }

    startedRef.current = true
    setIsConnecting(true)
    setError(null)

    try {
      const { Conversation } = await import('@elevenlabs/client')

      // Task 3.3: Pass moduleName from props instead of module?.name
      const tokenResult = await apiClient.post('/api/quiz/speech-token', {
        content: flashcard.content,
        moduleName: moduleName || 'Quiz'
      })

      if (!tokenResult.success) throw new Error(tokenResult.error || 'Failed to get speech token')

      const { signedUrl } = tokenResult

      await navigator.mediaDevices.getUserMedia({ audio: true })

      const conversation = await Conversation.startSession({
        signedUrl,
        connectionType: 'websocket',
        overrides: {
          agent: {
            // Task 3.2: Updated prompt with trimmed content
            prompt: `You are a friendly quiz tutor. Quiz the student on the following flashcard content. Ask questions about it, evaluate their answers, and give helpful feedback.\n\nFlashcard content:\n${flashcard.content.trim()}`,
          },
        },
        onConnect: async () => {
          setIsConnected(true)
          setIsConnecting(false)
          setStatus('connected')
          // Task 4.4: Create quiz session on connect (non-fatal)
          try {
            const result = await quizService.startSession(userId, moduleId, 'voice', 1)
            if (result.success && result.sessionId) {
              sessionIdRef.current = result.sessionId
            }
          } catch (err) {
            console.warn('Failed to create quiz session (non-fatal):', err)
          }
        },
        // Task 5.2: Only show disconnect dialog if user didn't intentionally end
        onDisconnect: () => {
          setIsConnected(false)
          setStatus('disconnected')
          if (!userEndedRef.current) {
            setShowDisconnectDialog(true)
          }
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
  }, [flashcard, moduleName, moduleId, userId])

  // Task 4.5: Helper to finalize session (end + get summary + navigate)
  const finalizeSession = useCallback(async () => {
    if (sessionIdRef.current) {
      try {
        await quizService.endSession(sessionIdRef.current)
        const summaryResult = await quizService.getSessionSummary(sessionIdRef.current)
        if (summaryResult.success && onComplete) {
          onComplete(summaryResult.summary || summaryResult)
          return
        }
      } catch (err) {
        console.warn('Failed to end session cleanly:', err)
      }
    }
    onBack()
  }, [onComplete, onBack])

  const endVoiceSession = useCallback(async () => {
    // Task 5.3: Mark as user-initiated before ending
    userEndedRef.current = true
    if (conversationRef.current) {
      try {
        await conversationRef.current.endSession()
      } catch (_) {
        // Already closed — safe to ignore
      }
      conversationRef.current = null
    }
    startedRef.current = false
    await finalizeSession()
  }, [finalizeSession])

  // Task 5.4: Reconnect after unexpected disconnect
  const handleReconnect = useCallback(() => {
    setShowDisconnectDialog(false)
    startedRef.current = false
    startVoiceSession()
  }, [startVoiceSession])

  // Task 5.5: End session after unexpected disconnect (conversation already closed)
  const handleEndAfterDisconnect = useCallback(async () => {
    setShowDisconnectDialog(false)
    startedRef.current = false
    // Don't call conversationRef.current.endSession() — already disconnected
    await finalizeSession()
  }, [finalizeSession])

  // Task 2.4: Trigger on flashcard alone (removed module dependency).
  // Use a mounted guard so React StrictMode's double-invoke of effects
  // (which runs cleanup then re-runs the effect) doesn't fire two sessions
  // or try to close a socket that was already torn down.
  useEffect(() => {
    let cancelled = false
    if (flashcard && !startedRef.current) {
      // Small defer so that if StrictMode immediately runs cleanup first,
      // the cancelled flag is set before startVoiceSession does any async work.
      const id = setTimeout(() => {
        if (!cancelled) startVoiceSession()
      }, 0)
      return () => {
        cancelled = true
        clearTimeout(id)
      }
    }
  }, [flashcard, startVoiceSession])

  useEffect(() => {
    return () => {
      // Guard: only call endSession if the WebSocket is still open.
      // conversationRef.current.endSession() throws if the socket is already
      // CLOSING/CLOSED (e.g. after a StrictMode cleanup or Civic auth re-render).
      const conv = conversationRef.current
      if (conv) {
        conversationRef.current = null
        startedRef.current = false
        try {
          conv.endSession()
        } catch (_) {
          // Already closed — safe to ignore
        }
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
            {/* Task 2.3: Use moduleName prop directly */}
            <p className="text-sm text-text-secondary">{moduleName || 'Module'}</p>
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

      {/* Task 5.6: Disconnect dialog overlay */}
      {showDisconnectDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-sm w-full">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="w-16 h-16 rounded-full bg-warning-light flex items-center justify-center mx-auto mb-4 text-3xl">⚡</div>
              <h3 className="text-xl font-bold text-text-primary mb-2">Disconnected</h3>
              <p className="text-text-secondary mb-6">Your voice session was interrupted. What would you like to do?</p>
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={handleEndAfterDisconnect}>End Session</Button>
                <Button className="flex-1" onClick={handleReconnect}>Reconnect</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
