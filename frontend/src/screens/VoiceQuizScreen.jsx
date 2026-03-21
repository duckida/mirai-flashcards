import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { apiClient } from '@/services/apiClient'
import { quizService } from '@/services/quizService'

function StatusIcon({ status }) {
  switch (status) {
    case 'connecting':
      return (
        <div className="w-20 h-20 rounded-full bg-warning-light flex items-center justify-center animate-pulse">
          <span className="text-3xl">⏳</span>
        </div>
      )
    case 'connected':
      return (
        <div className="w-20 h-20 rounded-full bg-success-light flex items-center justify-center">
          <span className="text-3xl">🎙️</span>
        </div>
      )
    case 'disconnected':
      return (
        <div className="w-20 h-20 rounded-full bg-error-light flex items-center justify-center">
          <span className="text-3xl">📵</span>
        </div>
      )
    default:
      return (
        <div className="w-20 h-20 rounded-full bg-bg-muted flex items-center justify-center">
          <span className="text-3xl">🎤</span>
        </div>
      )
  }
}

function StatusLabel({ status }) {
  switch (status) {
    case 'connecting':
      return <span className="text-warning font-semibold text-lg">Connecting...</span>
    case 'connected':
      return <span className="text-success font-semibold text-lg">Connected</span>
    case 'disconnected':
      return <span className="text-error font-semibold text-lg">Disconnected</span>
    default:
      return <span className="text-text-secondary font-semibold text-lg">Ready to connect</span>
  }
}

function TranscriptMessage({ message }) {
  const isAgent = message.role === 'agent'
  return (
    <div className={`flex ${isAgent ? 'justify-start' : 'justify-end'} mb-3`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isAgent
            ? 'bg-bg-muted text-text-primary rounded-bl-sm'
            : 'bg-primary text-white rounded-br-sm'
        }`}
      >
        <div className={`text-xs font-semibold mb-1 ${isAgent ? 'text-text-muted' : 'text-white/70'}`}>
          {isAgent ? 'Agent' : 'You'}
        </div>
        <div className="text-sm">{message.text}</div>
      </div>
    </div>
  )
}

function ReconnectDialog({ onReconnect, onEndSession }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-sm w-full">
        <CardContent className="pt-6 pb-6">
          <div className="text-center">
            <div className="text-3xl mb-3">⚠️</div>
            <h3 className="text-xl font-bold text-text-primary mb-2">Connection Lost</h3>
            <p className="text-text-secondary mb-6">
              Your connection to the voice agent was interrupted. Would you like to reconnect or end your session?
            </p>
            <div className="flex gap-3">
              <Button className="flex-1" onClick={onReconnect}>
                Reconnect
              </Button>
              <Button variant="secondary" className="flex-1" onClick={onEndSession}>
                End Session
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ErrorScreen({ error, onRetry, onReturn }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8">
          <div className="text-center">
            <div className="text-3xl mb-3">❌</div>
            <h3 className="text-xl font-bold text-error mb-2">Connection Error</h3>
            <p className="text-text-secondary mb-6">{error}</p>
            <div className="flex gap-3">
              {onRetry && (
                <Button className="flex-1" onClick={onRetry}>
                  Retry
                </Button>
              )}
              <Button variant="secondary" className="flex-1" onClick={onReturn}>
                Return
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function VoiceQuizScreen({ moduleId, moduleName, flashcard, userId, onBack, onComplete }) {
  const [status, setStatus] = useState('idle')
  const [transcript, setTranscript] = useState([])
  const [error, setError] = useState(null)
  const [showReconnectDialog, setShowReconnectDialog] = useState(false)

  const mountedRef = useRef(true)
  const conversationRef = useRef(null)
  const sessionIdRef = useRef(null)
  const intentionalEndRef = useRef(false)
  const wasConnectedRef = useRef(false)

  const addMessage = useCallback((role, text) => {
    if (!mountedRef.current) return
    setTranscript((prev) => [...prev, { role, text }])
  }, [])

  const finalizeSession = useCallback(async () => {
    const sessionId = sessionIdRef.current
    if (!sessionId) return null
    try {
      await quizService.endSession(sessionId)
      const summaryResult = await quizService.getSessionSummary(sessionId)
      return summaryResult?.summary || null
    } catch (err) {
      console.error('Error finalizing session:', err)
      return null
    }
  }, [])

  const handleEndSession = useCallback(async () => {
    intentionalEndRef.current = true
    setShowReconnectDialog(false)

    if (conversationRef.current) {
      try {
        await conversationRef.current.endSession()
      } catch (err) {
        console.error('Error ending ElevenLabs session:', err)
      }
    }

    const summary = await finalizeSession()
    if (mountedRef.current) {
      onComplete?.(summary)
    }
  }, [finalizeSession, onComplete])

  const handleReconnect = useCallback(() => {
    setShowReconnectDialog(false)
    window.location.reload()
  }, [])

  const startVoiceSession = useCallback(async () => {
    if (!flashcard?.content?.trim()) {
      setError('This flashcard has no content to quiz on.')
      return
    }

    setStatus('connecting')
    setError(null)

    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      micStream.getTracks().forEach((t) => t.stop())
    } catch {
      if (mountedRef.current) {
        setError('Microphone permission is required for voice quizzes. Please allow microphone access and try again.')
        setStatus('idle')
      }
      return
    }

    try {
      const tokenResult = await apiClient.post('/api/quiz/speech-token', {
        content: flashcard.content,
        moduleName: moduleName || 'General',
      })

      if (!mountedRef.current) return

      const { signedUrl } = tokenResult

      const sessionResult = await quizService.startSession(userId, moduleId, 'voice')
      if (mountedRef.current && sessionResult?.session?.id) {
        sessionIdRef.current = sessionResult.session.id
      }

      if (!mountedRef.current) return

      const { Conversation } = await import('@elevenlabs/client')

      const conversation = await Conversation.startSession({
        signedUrl,
        connectionType: 'websocket',
        overrides: {
          agent: {
            prompt: {
              prompt: `You are a helpful quiz assistant for the "${moduleName || 'General'}" module. Quiz the user on this flashcard content: "${flashcard.content}". Read the question, wait for their response, and provide encouraging feedback. Keep responses concise.`,
            },
            firstMessage: `Hello! Let's study the "${moduleName || 'General'}" module. Here's your first question based on the flashcard: ${flashcard.content}`,
          },
        },
        onConnect: () => {
          if (!mountedRef.current) return
          wasConnectedRef.current = true
          setStatus('connected')
        },
        onDisconnect: () => {
          if (!mountedRef.current) return
          if (wasConnectedRef.current && !intentionalEndRef.current) {
            setShowReconnectDialog(true)
          }
          setStatus('disconnected')
        },
        onMessage: (message) => {
          if (!mountedRef.current) return
          if (message.source === 'user') {
            addMessage('user', message.message)
          } else {
            addMessage('agent', message.message)
          }
        },
        onError: (err) => {
          console.error('ElevenLabs error:', err)
          if (!mountedRef.current) return
          setError('An error occurred with the voice connection. Please try again.')
          setStatus('disconnected')
        },
        onStatusChange: (newStatus) => {
          if (!mountedRef.current) return
          if (newStatus === 'connecting') setStatus('connecting')
          else if (newStatus === 'connected') setStatus('connected')
          else if (newStatus === 'disconnected') {
            if (wasConnectedRef.current && !intentionalEndRef.current) {
              setShowReconnectDialog(true)
            }
            setStatus('disconnected')
          }
        },
      })

      if (!mountedRef.current) {
        try {
          await conversation.endSession()
        } catch {
          // component unmounted during connection
        }
        return
      }

      conversationRef.current = conversation
    } catch (err) {
      if (!mountedRef.current) return
      console.error('Failed to start voice session:', err)
      setError(err.message || 'Failed to connect to the voice agent. Please try again.')
      setStatus('idle')
    }
  }, [flashcard, moduleName, userId, moduleId, addMessage])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      conversationRef.current = null
      sessionIdRef.current = null
      intentionalEndRef.current = false
      wasConnectedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (flashcard?.content?.trim()) {
      startVoiceSession()
    } else {
      setError('This flashcard has no content to quiz on.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flashcard?.id])

  if (error && status === 'idle') {
    return <ErrorScreen error={error} onRetry={flashcard?.content?.trim() ? startVoiceSession : null} onReturn={onBack} />
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="flex items-center justify-between p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary-lighter flex items-center justify-center text-xl">🎤</div>
          <div>
            <h1 className="text-xl font-extrabold text-text-primary">Voice Quiz</h1>
            <p className="text-sm text-text-secondary">{moduleName || 'Module'}</p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={onBack}>
          ← Back
        </Button>
      </header>

      <main className="flex-1 flex flex-col p-4 max-w-2xl mx-auto w-full">
        <Card className="mb-4">
          <CardContent className="pt-6 pb-6">
            <div className="flex flex-col items-center gap-4">
              <StatusIcon status={status} />
              <StatusLabel status={status} />
              {status === 'connected' && (
                <p className="text-text-muted text-sm">Speak your answer to the agent</p>
              )}
            </div>
          </CardContent>
        </Card>

        {flashcard?.content && (
          <Card className="mb-4 border-primary/30">
            <CardContent className="pt-4 pb-4">
              <div className="text-xs font-semibold text-text-muted mb-1">Current Flashcard</div>
              <p className="text-sm text-text-primary">{flashcard.content}</p>
            </CardContent>
          </Card>
        )}

        <div className="flex-1 overflow-y-auto mb-4 min-h-[200px]">
          {transcript.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-text-muted text-sm">
                {status === 'connected' ? 'Waiting for conversation...' : 'Conversation will appear here'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {transcript.map((msg, i) => (
                <TranscriptMessage key={i} message={msg} />
              ))}
            </div>
          )}
        </div>

        {error && status !== 'idle' && (
          <Card className="mb-4 border-error/30 bg-error-light/50">
            <CardContent className="pt-3 pb-3">
              <p className="text-error text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          {status === 'connected' && (
            <Button variant="destructive" className="flex-1" size="lg" onClick={handleEndSession}>
              End
            </Button>
          )}
          {(status === 'disconnected' || status === 'idle') && !error && (
            <Button variant="secondary" className="flex-1" size="lg" onClick={onBack}>
              Return
            </Button>
          )}
        </div>
      </main>

      {showReconnectDialog && (
        <ReconnectDialog onReconnect={handleReconnect} onEndSession={handleEndSession} />
      )}
    </div>
  )
}
