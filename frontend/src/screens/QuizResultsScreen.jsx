import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

function ScoreChangeItem({ flashcardId, result, flashcards }) {
  const flashcard = flashcards?.find((fc) => fc.id === flashcardId)
  const isPositive = result.scoreChange > 0
  const cardPreview = flashcard?.content?.substring(0, 80) || `Card ${flashcardId?.substring(0, 8)}...`

  return (
    <Card className="mb-2">
      <CardContent className="pt-4 pb-4">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-lg">{result.isCorrect ? '✅' : '❌'}</span>
            <span className="text-text-primary text-sm truncate flex-1">
              {cardPreview}
            </span>
          </div>
          <Badge variant={result.isCorrect ? 'success' : 'error'}>
            {result.isCorrect ? 'Correct' : 'Incorrect'}
          </Badge>
        </div>
        {!result.isCorrect && result.correctAnswer && (
          <div className="p-2 bg-success-light rounded-lg mt-2">
            <span className="text-xs text-text-muted">Answer: </span>
            <span className="text-sm text-text-primary break-words">{result.correctAnswer}</span>
          </div>
        )}
        <div className="flex justify-end mt-2">
          <span className={`text-sm font-semibold ${isPositive ? 'text-success' : 'text-error'}`}>
            {isPositive ? '+' : ''}{result.scoreChange} points
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export default function QuizResultsScreen({ summary, flashcards, moduleId, moduleName, onNavigate, onReviewWeak }) {
  const [showDetails, setShowDetails] = useState(false)

  if (!summary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="text-center">
          <p className="text-text-secondary mb-4">No quiz results available.</p>
          <Button onClick={() => onNavigate?.('module_detail', moduleId)}>Return to Module</Button>
        </div>
      </div>
    )
  }

  const accuracy = summary.accuracy || 0
  const progressColor = accuracy >= 70 ? 'bg-success' : accuracy >= 40 ? 'bg-warning' : 'bg-error'
  const duration = summary.duration || 0
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <header className="flex items-center justify-between p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-success-light flex items-center justify-center text-xl">🏆</div>
          <div>
            <h1 className="text-2xl font-extrabold text-text-primary">Quiz Complete!</h1>
            <p className="text-sm text-text-secondary">Session Summary</p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => onNavigate?.('module_detail', moduleId)}>← Back</Button>
      </header>

      <main className="p-4 max-w-2xl mx-auto space-y-4">
        <Card className="border-2" style={{ borderColor: accuracy >= 70 ? '#10B981' : accuracy >= 40 ? '#F59E0B' : '#EF4444' }}>
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center gap-4">
              <div className={`w-32 h-32 rounded-full flex items-center justify-center shadow-lg ${accuracy >= 70 ? 'bg-success' : accuracy >= 40 ? 'bg-warning' : 'bg-error'}`}>
                <span className="text-4xl font-extrabold text-white">{accuracy}%</span>
              </div>
              <span className="text-sm text-text-muted font-medium">Accuracy</span>

              <div className="grid grid-cols-3 gap-4 w-full">
                <div className="text-center">
                  <div className="text-2xl font-bold text-text-primary">{summary.answered}</div>
                  <div className="text-xs text-text-secondary">Answered</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-success">{summary.correct}</div>
                  <div className="text-xs text-text-secondary">Correct</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-error">{summary.incorrect}</div>
                  <div className="text-xs text-text-secondary">Incorrect</div>
                </div>
              </div>

              <div className="w-full space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-success">{summary.correct} correct</span>
                  <span className="text-error">{summary.incorrect} incorrect</span>
                </div>
                <Progress value={summary.answered > 0 ? (summary.correct / summary.answered) * 100 : 0} indicatorClassName={progressColor} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">📊 Score Changes</CardTitle>
            <Badge variant={summary.totalScoreChange >= 0 ? 'success' : 'error'}>
              {summary.totalScoreChange >= 0 ? '+' : ''}{summary.totalScoreChange} total
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Module Score: {summary.moduleAggregateScore || 0}%</span>
                <span className="text-text-secondary">Duration: {minutes}m {seconds}s</span>
              </div>
              <Progress value={summary.moduleAggregateScore || 0} indicatorClassName={progressColor} />
            </div>
          </CardContent>
        </Card>

        <Button variant="secondary" className="w-full" onClick={() => setShowDetails(!showDetails)}>
          {showDetails ? '🙈 Hide Details' : '👁️ Show Detailed Results'}
        </Button>

        {showDetails && summary.responses && (
          <div>
            <h3 className="text-lg font-bold text-text-primary mb-3">Question Details</h3>
            {summary.responses.map((response, i) => (
              <ScoreChangeItem key={response.flashcardId || i} flashcardId={response.flashcardId} result={response} flashcards={flashcards} />
            ))}
          </div>
        )}

        <div className="flex gap-3 flex-wrap">
          <Button className="flex-1 min-w-[120px]" size="lg" onClick={() => onNavigate?.('module_detail', moduleId)}>
            📚 Return to Module
          </Button>
          {summary.incorrect > 0 && (
            <Button variant="outline" className="flex-1 min-w-[120px]" size="lg" onClick={onReviewWeak}>
              🔄 Review Weak Cards
            </Button>
          )}
        </div>
      </main>
    </div>
  )
}
