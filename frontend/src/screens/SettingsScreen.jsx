import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, User, Gamepad2, Palette, AlertTriangle, CheckCircle, Save, LogOut, ArrowLeft } from 'lucide-react'
import useAuth from '@/hooks/useAuth'

export default function SettingsScreen({ onBack }) {
  const { user, logout, updatePreferences } = useAuth()
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState(null)
  const [error, setError] = useState(null)
  const [quizType, setQuizType] = useState(user?.preferences?.quizType || 'voice')
  const [theme, setTheme] = useState(user?.preferences?.theme || 'light')

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    setError(null)
    setSaveMessage(null)
    try {
      await updatePreferences({ quizType, theme })
      setSaveMessage('Preferences saved successfully!')
    } catch (err) {
      setError(err.message || 'Failed to save preferences')
    } finally {
      setIsSaving(false)
    }
  }, [quizType, theme, updatePreferences])

  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between p-5 ">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center">
            <Settings className="w-5 h-5 text-[#111111]" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-text-primary">Settings</h1>
            <p className="text-sm text-text-secondary">Manage your account</p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </header>

      <main className="p-4 max-w-2xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-bg-muted rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-text-muted">Name</span>
                <span className="font-semibold text-text-primary">{user?.name || 'User'}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between items-center">
                <span className="text-text-muted">Email</span>
                <span className="text-text-secondary">{user?.email || 'N/A'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gamepad2 className="w-5 h-5" />
              Quiz Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm text-text-secondary font-medium mb-3">Default Quiz Type</p>
              <div className="flex gap-2">
                {[
                  { key: 'voice', label: 'Voice' },
                  { key: 'image', label: 'Image' },
                  { key: 'mixed', label: 'Mixed' },
                ].map((opt) => (
                  <Button
                    key={opt.key}
                    variant={quizType === opt.key ? 'default' : 'secondary'}
                    className="flex-1"
                    onClick={() => setQuizType(opt.key)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              {[
                { key: 'light', label: 'Light' },
                { key: 'dark', label: 'Dark' },
              ].map((opt) => (
                <Button
                  key={opt.key}
                  variant={theme === opt.key ? 'default' : 'secondary'}
                  className="flex-1 py-4"
                  onClick={() => setTheme(opt.key)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-error-light border border-error">
            <AlertTriangle className="w-4 h-4 text-error shrink-0" />
            <span className="text-error font-medium">{error}</span>
          </div>
        )}
        {saveMessage && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-success-light border border-success">
            <CheckCircle className="w-4 h-4 text-success shrink-0" />
            <span className="text-success font-medium">{saveMessage}</span>
          </div>
        )}

        <Button className="w-full" size="lg" onClick={handleSave} disabled={isSaving}>
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </Button>

        <Button className="w-full" variant="destructive" size="lg" onClick={logout}>
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </main>
    </div>
  )
}
