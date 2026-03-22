import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'

import { moduleService } from '@/services/moduleService'

function FlashcardCard({ flashcard, onVoiceQuiz, onTextQuiz }) {
  const score = flashcard.knowledgeScore || 0
  const variant = score >= 70 ? 'success' : score >= 40 ? 'warning' : 'error'
  const color = score >= 70 ? 'bg-success' : score >= 40 ? 'bg-warning' : 'bg-error'

  return (
    <Card className="mb-3 transition-all">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge variant={variant}>{score}%</Badge>
            <span className="text-xs text-text-muted">Knowledge Score</span>
          </div>
        </div>

        {flashcard.sourceImageUrl && (
          <div className="rounded-xl overflow-hidden bg-bg-muted">
            <img 
              src={flashcard.sourceImageUrl} 
              alt="Flashcard" 
              className="w-full max-w-md mx-auto"
            />
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

        <div className="flex gap-2 mt-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => onVoiceQuiz?.(flashcard)}
          >
            🎤 Voice Quiz
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => onTextQuiz?.(flashcard)}
          >
            📝 Text Quiz
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ModuleDetailScreen({ moduleId, onBack, onNavigate }) {
  const [module, setModule] = useState(null)
  const [flashcards, setFlashcards] = useState([])
  const [isLoading, setIsLoading] = useState(true)

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
                onVoiceQuiz={(card) => onNavigate?.('voice_quiz', moduleId, card, module?.name)}
                onTextQuiz={(card) => onNavigate?.('text_quiz', moduleId, card, module?.name)}
              />
            ))
          )}
        </div>
      </main>
    </div>
  )
}
