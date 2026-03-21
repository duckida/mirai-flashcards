import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'
import useAuth from '@/hooks/useAuth'
import useQuiz from '@/hooks/useQuiz'
import { moduleService } from '@/services/moduleService'
import QuizResultsScreen from './QuizResultsScreen'

export default function ImageQuizScreen({ moduleId, onBack, onNavigate }) {
  const { user } = useAuth()
  const {
    session, currentQuestion, isLoading, error, feedback, summary, isComplete, progress,
    startQuiz, submitAnswer, nextQuestion, endQuiz, reset, setError,
  } = useQuiz()

  const [module, setModule] = useState(null)
  const [flashcards, setFlashcards] = useState([])
  const [userAnswer, setUserAnswer] = useState('')
  const [selectedOption, setSelectedOption] = useState(null)
  const [isAnswered, setIsAnswered] = useState(false)

  useEffect(() => {
    if (!moduleId) return
    moduleService.getModuleFlashcards(moduleId).then((r) => {
      if (r.success) { setModule(r.module); setFlashcards(r.flashcards || []) }
    }).catch(console.error)
  }, [moduleId])

  useEffect(() => {
    if (user?.id && moduleId && !session && !isLoading) startQuiz(user.id, moduleId, 'image', 10)
  }, [user, moduleId, session, isLoading, startQuiz])

  useEffect(() => {
    if (currentQuestion) { setUserAnswer(''); setSelectedOption(null); setIsAnswered(false) }
  }, [currentQuestion?.id])

  const handleSubmit = useCallback(async () => {
    if (!currentQuestion) return
    const answer = currentQuestion.type === 'multiple_choice' ? selectedOption : userAnswer
    if (!answer || !answer.trim()) { setError('Please provide an answer'); return }
    const result = await submitAnswer(answer)
    if (result) setIsAnswered(true)
  }, [currentQuestion, selectedOption, userAnswer, submitAnswer, setError])

  const handleReviewWeak = useCallback(() => {
    reset()
    onNavigate?.('module_detail', moduleId, { reviewWeak: true })
  }, [reset, onNavigate, moduleId])

  if (isComplete || summary) {
    return (
      <QuizResultsScreen
        summary={summary}
        flashcards={flashcards}
        moduleId={moduleId}
        moduleName={module?.name}
        onNavigate={onNavigate}
        onReviewWeak={handleReviewWeak}
      />
    )
  }

  if (isLoading && !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-text-secondary">Loading quiz...</p>
        </div>
      </div>
    )
  }

  if (error && !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 rounded-full bg-error-light flex items-center justify-center mx-auto mb-4 text-3xl">⚠️</div>
            <h3 className="text-xl font-bold text-error mb-2">Quiz Error</h3>
            <p className="text-text-secondary mb-4">{error}</p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => onNavigate?.('module_detail', moduleId)}>← Return</Button>
              <Button className="flex-1" onClick={() => { setError(null); startQuiz(user.id, moduleId, 'image', 10) }}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="text-center">
          <p className="text-text-secondary mb-4">No question available.</p>
          <Button onClick={() => onNavigate?.('module_detail', moduleId)}>Return to Module</Button>
        </div>
      </div>
    )
  }

  const canSubmit = currentQuestion.type === 'multiple_choice' ? selectedOption !== null : userAnswer.trim() !== ''
  const questionType = currentQuestion.type === 'multiple_choice' ? '🔘 Multiple Choice' : currentQuestion.type === 'fill_in_blank' ? '📝 Fill in the Blank' : '💭 Free Recall'

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="flex items-center justify-between p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary-lighter flex items-center justify-center text-xl">🖼️</div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Image Quiz</h1>
            <p className="text-sm text-text-secondary">{module?.name || 'Module'}</p>
          </div>
        </div>
        <Button variant="destructive" size="sm" onClick={endQuiz}>End Quiz</Button>
      </header>

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <Card className="mb-4">
          <CardContent className="pt-4 pb-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-text-secondary font-medium flex items-center gap-2">
                <span>📊</span> Question {progress.current} of {progress.total}
              </span>
              <Badge variant="default">{progress.percentage}%</Badge>
            </div>
            <Progress value={progress.percentage} />
          </CardContent>
        </Card>

        <div className="flex gap-4 justify-center mb-6">
          <div className="flex items-center gap-2 px-4 py-2 bg-success-light rounded-xl">
            <span className="text-success font-bold text-lg">{progress.correct}</span>
            <span className="text-sm text-text-secondary">correct</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-error-light rounded-xl">
            <span className="text-error font-bold text-lg">{progress.incorrect}</span>
            <span className="text-sm text-text-secondary">incorrect</span>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-error-light border border-error mb-4">
            <span>⚠️</span>
            <span className="text-error font-medium flex-1">{error}</span>
            <Button variant="secondary" size="sm" onClick={() => setError(null)}>Dismiss</Button>
          </div>
        )}

        <Card className={isAnswered ? (feedback?.isCorrect ? 'border-2 border-success' : 'border-2 border-error') : ''}>
          <CardContent className="pt-6 pb-6 space-y-4">
            <Badge variant="secondary">{questionType}</Badge>

            {currentQuestion.imageUrl !== undefined && (
              <div className="rounded-xl overflow-hidden bg-bg-muted flex items-center justify-center min-h-[200px]">
                {currentQuestion.imageUrl ? (
                  <img src={currentQuestion.imageUrl} alt="Quiz" className="max-h-[300px] object-contain" />
                ) : (
                  <div className="text-center p-8">
                    <div className="text-4xl mb-2">🖼️</div>
                    <p className="text-sm text-text-muted">No image available</p>
                  </div>
                )}
              </div>
            )}

            <div className="p-4 bg-primary-lighter rounded-xl">
              <p className="text-lg font-bold text-text-primary">{currentQuestion.question}</p>
            </div>

            {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
              <div className="space-y-2">
                {currentQuestion.options.map((option, i) => {
                  const isSelected = selectedOption === option
                  const isCorrect = option === currentQuestion.correctAnswer
                  let borderClass = 'border-border'
                  let bgClass = 'bg-white'

                  if (isAnswered) {
                    if (isCorrect) { borderClass = 'border-success border-2'; bgClass = 'bg-success-light' }
                    else if (isSelected && !isCorrect) { borderClass = 'border-error border-2'; bgClass = 'bg-error-light' }
                  } else if (isSelected) {
                    borderClass = 'border-primary border-2'; bgClass = 'bg-primary-lighter'
                  }

                  return (
                    <div
                      key={i}
                      className={`p-4 rounded-xl border ${borderClass} ${bgClass} cursor-pointer transition-all ${!isAnswered ? 'hover:border-primary' : ''}`}
                      onClick={() => !isAnswered && setSelectedOption(option)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm ${isSelected ? 'border-primary bg-primary text-white' : 'border-border text-text-secondary'}`}>
                          {String.fromCharCode(65 + i)}
                        </div>
                        <span className="flex-1 text-text-primary">{option}</span>
                        {isAnswered && isCorrect && <span className="text-success">✓</span>}
                        {isAnswered && isSelected && !isCorrect && <span className="text-error">✗</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {currentQuestion.type !== 'multiple_choice' && !isAnswered && (
              <Input
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Type your answer..."
              />
            )}

            {feedback && (
              <div className={`p-4 rounded-xl ${feedback.isCorrect ? 'bg-success-light border-2 border-success' : 'bg-error-light border-2 border-error'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{feedback.isCorrect ? '✅' : '❌'}</span>
                  <span className={`font-bold text-lg ${feedback.isCorrect ? 'text-success' : 'text-error'}`}>
                    {feedback.isCorrect ? 'Correct!' : 'Incorrect'}
                  </span>
                </div>
                <p className="text-text-primary mb-2">{feedback.feedback}</p>
                {!feedback.isCorrect && (
                  <p className="text-sm text-text-secondary">
                    The correct answer is: <strong className="text-text-primary">{feedback.correctAnswer}</strong>
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <div className="p-4 border-t border-border max-w-2xl mx-auto w-full">
        {!isAnswered ? (
          <Button className="w-full" size="lg" disabled={!canSubmit || isLoading} onClick={handleSubmit}>
            {isLoading ? '⏳ Submitting...' : '✓ Submit Answer'}
          </Button>
        ) : (
          <Button className="w-full" size="lg" disabled={isLoading} onClick={() => nextQuestion()}>
            {isLoading ? '⏳ Loading...' : '→ Next Question'}
          </Button>
        )}
      </div>
    </div>
  )
}
