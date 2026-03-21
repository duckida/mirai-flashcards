import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import useAuth from '@/hooks/useAuth'
import { moduleService } from '@/services/moduleService'

function FlashcardCard({ flashcard, isExpanded, onToggle }) {
  const score = flashcard.knowledgeScore || 0
  const variant = score >= 70 ? 'success' : score >= 40 ? 'warning' : 'error'
  const color = score >= 70 ? 'bg-success' : score >= 40 ? 'bg-warning' : 'bg-error'

  return (
    <Card className={`mb-3 transition-all ${isExpanded ? 'border-primary border-2' : ''}`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge variant={variant}>{score}%</Badge>
            <span className="text-xs text-text-muted">Knowledge Score</span>
          </div>
          <Button variant="secondary" size="sm" onClick={() => onToggle(flashcard.id)}>
            {isExpanded ? '🙈 Hide' : '👁️ Show'}
          </Button>
        </div>

        <div className="p-3 bg-bg-muted rounded-xl mb-2">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-5 h-5 rounded-md bg-primary flex items-center justify-center text-white font-bold text-xs">Q</div>
            <span className="text-xs text-text-muted font-semibold uppercase tracking-wide">Question</span>
          </div>
          <div className="text-text-primary">{flashcard.question}</div>
        </div>

        {isExpanded && (
          <div className="p-3 bg-primary-lighter rounded-xl mb-2">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-5 h-5 rounded-md bg-primary flex items-center justify-center text-white font-bold text-xs">A</div>
              <span className="text-xs text-primary font-semibold uppercase tracking-wide">Answer</span>
            </div>
            <div className="text-text-primary">{flashcard.answer}</div>
          </div>
        )}

        <Progress value={score} indicatorClassName={color} className="mt-3" />

        {flashcard.reviewCount > 0 && (
          <div className="flex gap-3 mt-3 text-xs text-text-secondary">
            <span>📊 Reviews: <strong>{flashcard.reviewCount}</strong></span>
            <span className="text-success">✓ {flashcard.correctCount || 0}</span>
            <span className="text-error">✗ {flashcard.incorrectCount || 0}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function ModuleDetailScreen({ moduleId, onBack, onNavigate }) {
  const { user } = useAuth()
  const [module, setModule] = useState(null)
  const [flashcards, setFlashcards] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedCardId, setExpandedCardId] = useState(null)

  useEffect(() => {
    if (!moduleId) return
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const result = await moduleService.getModuleFlashcards(moduleId)
        if (result.success) {
          setModule(result.module)
          setFlashcards(result.flashcards || [])
        }
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [moduleId])

  const aggregateScore = flashcards.length > 0
    ? Math.round(flashcards.reduce((sum, c) => sum + (c.knowledgeScore || 0), 0) / flashcards.length)
    : 0
  const scoreColor = aggregateScore >= 70 ? 'bg-success' : aggregateScore >= 40 ? 'bg-warning' : 'bg-error'

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between p-5 border-b border-border">
        <div className="flex items-center gap-3">
          {module?.color && (
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl"
              style={{ backgroundColor: module.color }}
            >
              {(module.name || 'M').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-extrabold text-text-primary">{module?.name || 'Module'}</h1>
            <p className="text-sm text-text-secondary">
              {flashcards.length} card{flashcards.length !== 1 ? 's' : ''} | Score: {aggregateScore}%
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={onBack}>← Back</Button>
      </header>

      <main className="p-4 max-w-2xl mx-auto">
        <Card className="mb-4 bg-primary-lighter border-primary">
          <CardContent className="pt-5 pb-5">
            <div className="flex justify-between items-center mb-3">
              <span className="text-lg font-bold text-text-primary flex items-center gap-2">
                <span>📊</span> Module Knowledge Score
              </span>
              <span className="text-2xl font-bold">{aggregateScore}%</span>
            </div>
            <Progress value={aggregateScore} indicatorClassName={scoreColor} />
          </CardContent>
        </Card>

        <div className="mb-4">
          <h2 className="text-xl font-bold text-text-primary mb-3 flex items-center gap-2">
            <span>📝</span> Flashcards ({flashcards.length})
          </h2>
          {flashcards.length === 0 ? (
            <div className="py-10 text-center bg-bg-muted rounded-2xl">
              <div className="text-3xl mb-3">📝</div>
              <p className="text-text-secondary">No flashcards in this module yet.</p>
            </div>
          ) : (
            flashcards.map((card) => (
              <FlashcardCard
                key={card.id}
                flashcard={card}
                isExpanded={expandedCardId === card.id}
                onToggle={(id) => setExpandedCardId(expandedCardId === id ? null : id)}
              />
            ))
          )}
        </div>

        <div className="flex gap-3 flex-wrap">
          <Button
            className="flex-1 min-w-[140px]"
            size="lg"
            disabled={flashcards.length === 0}
            onClick={() => onNavigate?.('voice_quiz', moduleId)}
          >
            🎤 Voice Quiz
          </Button>
          <Button
            className="flex-1 min-w-[140px]"
            size="lg"
            disabled={flashcards.length === 0}
            onClick={() => onNavigate?.('image_quiz', moduleId)}
          >
            🖼️ Image Quiz
          </Button>
        </div>
      </main>
    </div>
  )
}
