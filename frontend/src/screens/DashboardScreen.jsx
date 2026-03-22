import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import useAuth from '@/hooks/useAuth'
import { moduleService } from '@/services/moduleService'

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
      className="p-5 rounded-2xl border border-border bg-white cursor-pointer transition-all hover:border-primary hover:bg-primary-lighter hover:shadow-md"
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

  const totalCards = modules.reduce((sum, m) => sum + (m.flashcardCount || 0), 0)
  const totalScore = modules.reduce((sum, m) => sum + (m.aggregateKnowledgeScore || 0) * (m.flashcardCount || 0), 0)
  const overallAvg = totalCards > 0 ? Math.round(totalScore / totalCards) : 0
  const scoreColor = overallAvg >= 70 ? 'bg-success' : overallAvg >= 40 ? 'bg-warning' : 'bg-error'

  return (
    <div className="min-h-screen bg-white">
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
      </main>
    </div>
  )
}
