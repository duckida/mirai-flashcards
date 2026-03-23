import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'
import useAuth from '@/hooks/useAuth'
import { moduleService } from '@/services/moduleService'
import { flashcardService } from '@/services/flashcardService'

const SCREENS = {
  DASHBOARD: 'dashboard',
  UPLOAD_IMAGE: 'upload_image',
  MODULE_DETAIL: 'module_detail',
  SETTINGS: 'settings',
}

function ModuleCard({ module, onPress }) {
  const score = module.aggregateKnowledgeScore || 0
  const variant = score >= 70 ? 'success' : score >= 40 ? 'warning' : 'error'
  const color = score >= 70 ? 'bg-success' : score >= 40 ? 'bg-warning' : 'bg-error'

  return (
    <div
      className="p-5 rounded-2xl border border-border bg-bg cursor-pointer transition-all hover:border-primary hover:bg-primary-lighter hover:shadow-md"
      onClick={() => onPress(module)}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg"
            style={{ backgroundColor: module.color || '#9333EA' }}
          >
            {(module.name || 'M').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-text-primary">{module.name}</div>
            <div className="text-sm text-text-secondary">
              {module.flashcardCount || 0} card{(module.flashcardCount || 0) !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <Badge variant={variant}>{score}%</Badge>
      </div>
      <Progress value={score} indicatorClassName={color} />
    </div>
  )
}

export default function DashboardScreen({ onNavigate }) {
  const { user, logout } = useAuth()
  const [modules, setModules] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [allFlashcards, setAllFlashcards] = useState([])
  const [isSearching, setIsSearching] = useState(false)

  const fetchModules = useCallback(async () => {
    if (!user?.id) {
      setError('User not authenticated. Please sign in again.')
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const result = await moduleService.getModules(user.id)
      if (result.success) setModules(result.modules || [])
      else throw new Error(result.error || 'Failed to load modules')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchModules()
  }, [fetchModules])

  useEffect(() => {
    if (!user?.id || modules.length === 0) return
    let cancelled = false
    const loadFlashcards = async () => {
      setIsSearching(true)
      try {
        const cards = await flashcardService.getAllUserFlashcards(user.id)
        if (!cancelled) setAllFlashcards(cards)
      } catch {
        // silently fail — search just won't have data
      } finally {
        if (!cancelled) setIsSearching(false)
      }
    }
    loadFlashcards()
    return () => { cancelled = true }
  }, [user?.id, modules])

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    return allFlashcards.filter((card) =>
      (card.content || '').toLowerCase().includes(q)
    )
  }, [allFlashcards, searchQuery])

  const totalCards = modules.reduce((sum, m) => sum + (m.flashcardCount || 0), 0)
  const totalScore = modules.reduce((sum, m) => sum + (m.aggregateKnowledgeScore || 0) * (m.flashcardCount || 0), 0)
  const overallAvg = totalCards > 0 ? Math.round(totalScore / totalCards) : 0
  const scoreColor = overallAvg >= 70 ? 'bg-success' : overallAvg >= 40 ? 'bg-warning' : 'bg-error'

  return (
    <div className="min-h-screen bg-bg">
      <header className="flex items-center justify-between p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary-lighter flex items-center justify-center text-xl">
            📚
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">Dashboard</h1>
            <p className="text-sm text-text-secondary">Welcome back, {user?.name || 'User'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => onNavigate?.(SCREENS.SETTINGS)}>
            ⚙️ Settings
          </Button>
          <Button variant="destructive" size="sm" onClick={logout}>
            Sign Out
          </Button>
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto">
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-error-light border border-error mb-4">
            <span>⚠️</span>
            <span className="text-error font-medium flex-1">{error}</span>
            <Button variant="secondary" size="sm" onClick={fetchModules}>Retry</Button>
          </div>
        )}

        <div className="relative mb-4">
          <Input
            type="text"
            placeholder="Search all flashcards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {searchQuery.trim() ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🔍 Search Results
                <span className="text-sm font-normal text-text-secondary">
                  ({searchResults.length} {searchResults.length === 1 ? 'card' : 'cards'} found)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isSearching ? (
                <div className="flex flex-col items-center gap-3 py-10">
                  <Spinner size="lg" />
                  <span className="text-text-secondary">Searching...</span>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-10 text-center bg-bg-muted rounded-2xl">
                  <div className="text-4xl mb-3">🔍</div>
                  <p className="text-lg font-semibold text-text-secondary mb-1">No results found</p>
                  <p className="text-text-muted">Try a different search term</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {searchResults.map((card) => (
                    <div
                      key={card.id}
                      className="p-4 rounded-2xl border border-border bg-bg cursor-pointer transition-all hover:border-primary hover:bg-primary-lighter hover:shadow-md"
                      onClick={() => onNavigate?.(SCREENS.MODULE_DETAIL, card.moduleId)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                          style={{ backgroundColor: card.moduleColor }}
                        >
                          {(card.moduleName || 'M').charAt(0).toUpperCase()}
                        </div>
                        <Badge variant="secondary" className="text-xs">{card.moduleName || 'Unknown'}</Badge>
                        <div className="flex-1" />
                        <Badge variant={
                          (card.knowledgeScore || 0) >= 70 ? 'success' : (card.knowledgeScore || 0) >= 40 ? 'warning' : 'error'
                        }>
                          {card.knowledgeScore || 0}%
                        </Badge>
                      </div>
                      {card.sourceImageUrl ? (
                        <div className="rounded-xl overflow-hidden bg-bg-muted">
                          <img
                            src={card.sourceImageUrl}
                            alt="Flashcard"
                            className="w-full max-h-48 object-cover"
                          />
                        </div>
                      ) : (
                        <p className="text-sm text-text-primary line-clamp-2">{card.content}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {modules.length > 0 && (
              <Card className="mb-4 bg-primary-lighter border-primary">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">📊 Knowledge Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-3xl font-extrabold text-text-primary">{totalCards}</div>
                      <div className="text-sm text-text-secondary font-medium">Total Cards</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-extrabold text-primary">{overallAvg}%</div>
                      <div className="text-sm text-text-secondary font-medium">Avg Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-extrabold text-primary">{modules.length}</div>
                      <div className="text-sm text-text-secondary font-medium">Modules</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Overall Progress</span>
                      <span className="font-semibold">{overallAvg}%</span>
                    </div>
                    <Progress value={overallAvg} indicatorClassName={scoreColor} />
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="mb-4">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">📁 My Modules</CardTitle>
                <Button onClick={() => onNavigate?.(SCREENS.UPLOAD_IMAGE)}>+ Upload Image</Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex flex-col items-center gap-3 py-10">
                    <Spinner size="lg" />
                    <span className="text-text-secondary">Loading modules...</span>
                  </div>
                ) : modules.length === 0 ? (
                  <div className="py-10 text-center bg-bg-muted rounded-2xl">
                    <div className="text-4xl mb-3">📄</div>
                    <p className="text-lg font-semibold text-text-secondary mb-1">No modules yet</p>
                    <p className="text-text-muted">Upload an image to create your first module</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {modules.map((mod) => (
                      <ModuleCard key={mod.id} module={mod} onPress={(m) => onNavigate?.(SCREENS.MODULE_DETAIL, m.id)} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">⚡ Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3 flex-wrap">
                  {modules.length > 0 ? (
                    <>
                      <Button className="flex-1 min-w-[150px]" onClick={() => onNavigate?.(SCREENS.VOICE_QUIZ, modules[0].id)}>
                        🎤 Start Voice Quiz
                      </Button>
                      <Button className="flex-1 min-w-[150px]" onClick={() => onNavigate?.(SCREENS.UPLOAD_IMAGE)}>
                        📷 Upload Image
                      </Button>
                    </>
                  ) : (
                    <Button className="flex-1" onClick={() => onNavigate?.(SCREENS.UPLOAD_IMAGE)}>
                      🚀 Upload Your First Image
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
