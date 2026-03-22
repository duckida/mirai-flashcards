import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Progress } from '@/components/ui/progress'
import { voiceService } from '@/services/voiceService'
import { quizService } from '@/services/quizService'

const STATUS = {
  IDLE: 'idle',
  REQUESTING_MIC: 'requesting_mic',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ENDED: 'ended',
  ERROR: 'error',
}

const MODE = {
  AGENT_SPEAKING: 'speaking',
  AGENT_LISTENING: 'listening',
}

export default function VoiceQuizScreen({ moduleId, flashcard, moduleName, onBack }) {
  const [status, setStatus] = useState(STATUS.IDLE)
  const [mode, setMode] = useState(null)
  const [transcript, setTranscript] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [error, setError] = useState(null)
  const [isMuted, setIsMuted] = useState(false)
  const [summary, setSummary] = useState(null)
  const [canSendFeedback, setCanSendFeedback] = useState(false)
  const [feedbackGiven, setFeedbackGiven] = useState(false)
  const conversationRef = useRef(null)
  const lastAgentMessageRef = useRef(null)

  const addTranscript = useCallback((role, text) => {
    setTranscript(prev => [...prev, { role, text, time: new Date().toLocaleTimeString() }])
  }, [])

  useEffect(() => {
    return () => {
      if (conversationRef.current) {
        conversationRef.current.endSession()
        conversationRef.current = null
      }
    }
  }, [])

  const handleOnMessage = useCallback((message) => {
    if (message.type === 'user-message' && message.text) {
      addTranscript('user', message.text)
    }
    if (message.type === 'agent-message' && message.text) {
      addTranscript('agent', message.text)
      lastAgentMessageRef.current = message.text
      setFeedbackGiven(false)
    }
  }, [addTranscript])

  const handleOnModeChange = useCallback((newMode) => {
    setMode(newMode)
  }, [])

  const handleOnCanSendFeedbackChange = useCallback((canSend) => {
    setCanSendFeedback(canSend)
  }, [])

  const buildAgentContext = () => {
    const parts = []
    if (moduleName) {
      parts.push(`The user is being quizzed on the topic: "${moduleName}".`)
    }
    if (flashcard?.content) {
      parts.push(`The flashcard content to quiz on is:\n"${flashcard.content}"`)
    }
    parts.push(
      'Ask the user a question based on the flashcard content above.',
      'Wait for their verbal answer, then evaluate it.',
      'Give encouraging feedback and either move to the next question or repeat if they need help.',
      'Keep responses short and conversational.'
    )
    return parts.join(' ')
  }

  const startVoiceQuiz = useCallback(async () => {
    setError(null)
    setTranscript([])
    setSummary(null)

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      setStatus(STATUS.REQUESTING_MIC)
    } catch (err) {
      setError('Microphone access denied. Please allow microphone access and try again.')
      setStatus(STATUS.ERROR)
      return
    }

    try {
      const { Conversation } = await import('@elevenlabs/client')
      setStatus(STATUS.CONNECTING)

      const signedUrl = await voiceService.getSignedUrl()

      const conversation = await Conversation.startSession({
        signedUrl,
        connectionType: 'websocket',
        onConnect: () => {
          setStatus(STATUS.CONNECTED)
        },
        onDisconnect: () => {
          setStatus(STATUS.ENDED)
        },
        onMessage: handleOnMessage,
        onError: (err) => {
          console.error('Conversation error:', err)
          setError(`Voice agent error: ${err?.message || err}`)
          setStatus(STATUS.ERROR)
        },
        onStatusChange: (newStatus) => {
          if (newStatus === 'disconnected') {
            setStatus(STATUS.ENDED)
          }
        },
        onModeChange: handleOnModeChange,
        onCanSendFeedbackChange: handleOnCanSendFeedbackChange,
      })

      conversationRef.current = conversation

      const id = conversation.getId()
      setSessionId(id)

      conversation.sendContextualUpdate(buildAgentContext())
      
      // Trigger agent to start the conversation
      conversation.sendUserMessage('Hello, please start the quiz.')
    } catch (err) {
      console.error('Failed to start voice conversation:', err)
      setError(`Failed to start voice quiz: ${err.message}`)
      setStatus(STATUS.ERROR)
    }
  }, [handleOnMessage, handleOnModeChange, handleOnCanSendFeedbackChange])

  const endSession = useCallback(async () => {
    if (conversationRef.current) {
      conversationRef.current.endSession()
      conversationRef.current = null
    }
    setStatus(STATUS.ENDED)

    if (sessionId) {
      try {
        const result = await quizService.endSession(sessionId)
        setSummary(result)
      } catch (err) {
        console.error('Failed to end session:', err)
      }
    }
  }, [sessionId])

  const handleSendFeedback = useCallback(async (isPositive) => {
    if (conversationRef.current && !feedbackGiven) {
      conversationRef.current.sendFeedback(isPositive)
      setFeedbackGiven(true)
    }
  }, [feedbackGiven])

  const handleToggleMute = useCallback(() => {
    if (conversationRef.current) {
      const newMuted = !isMuted
      conversationRef.current.setMicMuted(newMuted)
      setIsMuted(newMuted)
    }
  }, [isMuted])

  const isActive = status === STATUS.CONNECTED || status === STATUS.CONNECTING

  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary-lighter flex items-center justify-center text-xl">
            🎤
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">Voice Quiz</h1>
            <p className="text-sm text-text-secondary">{moduleName || 'Voice Practice'}</p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={onBack}>Back</Button>
      </header>

      <main className="p-4 max-w-2xl mx-auto">
        {error && (
          <Card className="mb-4 bg-error-light border-error">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2">
                <span>⚠️</span>
                <div>
                  <p className="text-error font-semibold">Error</p>
                  <p className="text-error text-sm mt-1">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {summary && (
          <Card className="mb-4 bg-success-light border-success">
            <CardHeader>
              <CardTitle className="text-success">Quiz Complete!</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-text-primary">{summary.totalQuestions}</div>
                  <div className="text-xs text-text-secondary">Questions</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-success">{summary.correct}</div>
                  <div className="text-xs text-text-secondary">Correct</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-error">{summary.incorrect}</div>
                  <div className="text-xs text-text-secondary">Incorrect</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-text-secondary">Accuracy</span>
                  <span className="font-semibold">{summary.accuracy}%</span>
                </div>
                <Progress value={summary.accuracy} indicatorClassName="bg-success" />
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {status === STATUS.CONNECTED ? (
                mode === MODE.AGENT_SPEAKING ? '🔊 Agent Speaking' : '🎙️ Listening...'
              ) : status === STATUS.CONNECTING ? (
                '⏳ Connecting...'
              ) : status === STATUS.ENDED ? (
                '✅ Session Ended'
              ) : (
                '🎤 Voice Agent'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {status === STATUS.IDLE && (
              <div className="flex flex-col items-center gap-4 py-6">
                {flashcard?.sourceImageUrl && (
                  <div className="w-full rounded-xl overflow-hidden bg-bg-muted">
                    <img 
                      src={flashcard.sourceImageUrl} 
                      alt="Flashcard" 
                      className="w-full max-w-md mx-auto"
                    />
                  </div>
                )}
                <p className="text-text-secondary text-center">
                  Practice with a voice agent. The agent will quiz you based on the flashcard image.
                </p>
                <Button size="lg" onClick={startVoiceQuiz}>
                  🎤 Start Voice Quiz
                </Button>
              </div>
            )}

            {(status === STATUS.REQUESTING_MIC || status === STATUS.CONNECTING) && (
              <div className="flex flex-col items-center gap-4 py-6">
                <Spinner size="lg" />
                <p className="text-text-secondary">
                  {status === STATUS.REQUESTING_MIC ? 'Requesting microphone access...' : 'Connecting to voice agent...'}
                </p>
              </div>
            )}

            {isActive && (
              <div className="flex flex-col items-center gap-6 py-6">
                <style>{`
                  @keyframes pulse-ring {
                    0% { transform: scale(0.95); opacity: 0.7; }
                    50% { transform: scale(1.05); opacity: 0.4; }
                    100% { transform: scale(0.95); opacity: 0.7; }
                  }
                  @keyframes pulse-dot {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                  }
                `}</style>
                
                <div className="relative">
                  <div 
                    className={`absolute inset-0 rounded-full ${mode === MODE.AGENT_SPEAKING ? 'bg-primary' : 'bg-success'}`}
                    style={{ 
                      animation: 'pulse-ring 2s ease-in-out infinite',
                      opacity: 0.3 
                    }}
                  />
                  <div 
                    className={`relative w-32 h-32 rounded-full flex items-center justify-center ${
                      mode === MODE.AGENT_SPEAKING 
                        ? 'bg-primary' 
                        : 'bg-success'
                    }`}
                    style={{ animation: 'pulse-dot 2s ease-in-out infinite' }}
                  >
                    <span className="text-5xl">
                      {mode === MODE.AGENT_SPEAKING ? '🔊' : '🎙️'}
                    </span>
                  </div>
                </div>

                <p className="text-lg font-semibold text-text-primary">
                  {mode === MODE.AGENT_SPEAKING ? 'Agent is speaking...' : 'Listening...'}
                </p>

                <div className="flex items-center gap-3 w-full max-w-xs">
                  <Button
                    variant={isMuted ? 'destructive' : 'secondary'}
                    onClick={handleToggleMute}
                    className="flex-1"
                  >
                    {isMuted ? '🔇 Unmute' : '🎙️ Mute'}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={endSession}
                    className="flex-1"
                  >
                    End
                  </Button>
                </div>

                {canSendFeedback && !feedbackGiven && lastAgentMessageRef.current && (
                  <div className="flex gap-2 w-full max-w-xs">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleSendFeedback(true)}
                    >
                      👍 Good
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleSendFeedback(false)}
                    >
                      👎 Poor
                    </Button>
                  </div>
                )}
              </div>
            )}

            {status === STATUS.ERROR && (
              <div className="flex flex-col items-center gap-4 py-6">
                <p className="text-error text-center">{error}</p>
                <Button onClick={() => setStatus(STATUS.IDLE)}>Try Again</Button>
              </div>
            )}

            {status === STATUS.ENDED && !summary && (
              <div className="flex flex-col items-center gap-4 py-6">
                <p className="text-text-secondary text-center">Session ended.</p>
                <Button onClick={startVoiceQuiz}>Start New Session</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
