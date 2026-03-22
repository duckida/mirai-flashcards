import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'
import { apiClient } from '@/services/apiClient'
import { moduleService } from '@/services/moduleService'
import QuizResultsScreen from './QuizResultsScreen'

export default function ImageQuizScreen({ moduleId, flashcard, onBack }) {
  const [module, setModule] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [userAnswer, setUserAnswer] = useState('')
  const [isAnswered, setIsAnswered] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const isSingleCard = !!flashcard

  useEffect(() => {
    if (!moduleId) return
    moduleService.getModuleFlashcards(moduleId).then((r) => {
      if (r.success) { 
        setModule(r.module)
      }
    }).catch(console.error).finally(() => {
      setIsLoading(false)
    })
  }, [moduleId])

  const handleSubmit = useCallback(async () => {
    if (!flashcard || !userAnswer.trim()) {
      setError('Please provide an answer')
      return
    }

    setError(null)
    setIsLoading(true)

    try {
      const result = await apiClient.post('/api/quiz/score-flashcard', {
        flashcardId: flashcard.id,
        userAnswer: userAnswer.trim(),
        correctAnswer: flashcard.answer
      })

      if (result.success) {
        setFeedback(result)
        setIsAnswered(true)
      } else {
        setError(result.error || 'Failed to score answer')
      }
    } catch (err) {
      setError(err.message || 'Failed to submit answer')
    } finally {
      setIsLoading(false)
    }
  }, [flashcard, userAnswer])

  const handleNext = useCallback(() => {
    onBack()
  }, [onBack])

  if (isLoading && !flashcard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error && !isAnswered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 rounded-full bg-error-light flex items-center justify-center mx-auto mb-4 text-3xl">⚠️</div>
            <h3 className="text-xl font-bold text-error mb-2">Error</h3>
            <p className="text-text-secondary mb-4">{error}</p>
            <Button className="w-full" onClick={onBack}>Return</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="flex items-center justify-between p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary-lighter flex items-center justify-center text-xl">📝</div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Text Quiz</h1>
            <p className="text-sm text-text-secondary">{module?.name || 'Module'}</p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={onBack}>← Back</Button>
      </header>

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <Card className={isAnswered ? (feedback?.isCorrect ? 'border-2 border-success' : 'border-2 border-error') : ''}>
          <CardContent className="pt-6 pb-6 space-y-4">
            {!isSingleCard ? (
              <Badge variant="secondary">Multiple Choice Quiz</Badge>
            ) : (
              <Badge variant="default">Text Quiz</Badge>
            )}

            <div className="p-4 bg-primary-lighter rounded-xl">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-5 h-5 rounded-md bg-primary flex items-center justify-center text-white font-bold text-xs">Q</div>
                <span className="text-xs text-primary font-semibold uppercase tracking-wide">Question</span>
              </div>
              <p className="text-lg font-bold text-text-primary">{flashcard?.question || 'Loading...'}</p>
            </div>

            {!isAnswered && (
              <Input
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Type your answer..."
                disabled={isLoading}
              />
            )}

            {isAnswered && (
              <>
                <div className={`p-4 rounded-xl ${feedback?.isCorrect ? 'bg-success-light border-2 border-success' : 'bg-error-light border-2 border-error'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{feedback?.isCorrect ? '✅' : '❌'}</span>
                    <span className={`font-bold text-lg ${feedback?.isCorrect ? 'text-success' : 'text-error'}`}>
                      {feedback?.isCorrect ? 'Correct!' : 'Incorrect'}
                    </span>
                  </div>
                  {!feedback?.isCorrect && (
                    <div className="p-2 bg-white rounded-lg">
                      <p className="text-sm text-text-muted">Correct answer:</p>
                      <p className="text-text-primary font-semibold">{flashcard?.answer}</p>
                    </div>
                  )}
                  {feedback?.scoreChange !== undefined && (
                    <p className={`text-sm font-semibold mt-2 ${feedback.scoreChange >= 0 ? 'text-success' : 'text-error'}`}>
                      {feedback.scoreChange >= 0 ? '+' : ''}{feedback.scoreChange} points
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>

      <div className="p-4 border-t border-border max-w-2xl mx-auto w-full">
        {!isAnswered ? (
          <Button 
            className="w-full" 
            size="lg" 
            disabled={!userAnswer.trim() || isLoading} 
            onClick={handleSubmit}
          >
            {isLoading ? '⏳ Checking...' : '✓ Check Answer'}
          </Button>
        ) : (
          <Button className="w-full" size="lg" onClick={handleNext}>
            → Done
          </Button>
        )}
      </div>
    </div>
  )
}
