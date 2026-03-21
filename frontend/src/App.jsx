import { useState, useCallback } from 'react'
import { CivicAuthProvider, useUser } from '@civic/auth/react'
import AuthScreen from './screens/AuthScreen'
import DashboardScreen from './screens/DashboardScreen'
import UploadImageScreen from './screens/UploadImageScreen'
import ModuleDetailScreen from './screens/ModuleDetailScreen'
import VoiceQuizScreen from './screens/VoiceQuizScreen'
import ImageQuizScreen from './screens/ImageQuizScreen'
import QuizResultsScreen from './screens/QuizResultsScreen'
import SettingsScreen from './screens/SettingsScreen'

const SCREENS = {
  DASHBOARD: 'dashboard',
  UPLOAD_IMAGE: 'upload_image',
  MODULE_DETAIL: 'module_detail',
  VOICE_QUIZ: 'voice_quiz',
  IMAGE_QUIZ: 'image_quiz',
  TEXT_QUIZ: 'text_quiz',
  SETTINGS: 'settings',
  QUIZ_RESULTS: 'quiz_results',
}

function AppContent() {
  const { user, isLoading } = useUser()
  const [currentScreen, setCurrentScreen] = useState(SCREENS.DASHBOARD)
  const [selectedModuleId, setSelectedModuleId] = useState(null)
  const [selectedFlashcard, setSelectedFlashcard] = useState(null)
  // Task 2.5: Track module name so VoiceQuizScreen gets it without a secondary fetch
  const [selectedModuleName, setSelectedModuleName] = useState(null)
  // Task 4.6: Track quiz summary for results screen
  const [quizSummary, setQuizSummary] = useState(null)

  // Task 2.7: Updated signature to accept moduleName (and summary for quiz results)
  const navigateTo = useCallback((screen, moduleId, flashcard = null, moduleName = null, summary = null) => {
    setCurrentScreen(screen)
    if (moduleId) setSelectedModuleId(moduleId)
    setSelectedFlashcard(flashcard)
    if (moduleName !== null) setSelectedModuleName(moduleName)
    if (summary !== null) setQuizSummary(summary)
  }, [])

  const goBack = useCallback(() => {
    setCurrentScreen(SCREENS.DASHBOARD)
    setSelectedModuleId(null)
    setSelectedFlashcard(null)
    setSelectedModuleName(null)
    setQuizSummary(null)
  }, [])

  const goToModule = useCallback(() => {
    setCurrentScreen(SCREENS.MODULE_DETAIL)
    setSelectedFlashcard(null)
    setQuizSummary(null)
  }, [])

  // Only show the global loading screen on first load (no user yet).
  // If we already have a user and Civic does a background token refresh,
  // isLoading briefly flips true — don't unmount the active screen (especially
  // VoiceQuizScreen which holds a live WebSocket).
  if (isLoading && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
        <div className="w-12 h-12 border-[3px] border-border border-t-primary rounded-full animate-spin" />
        <p className="text-text-secondary">Loading...</p>
      </div>
    )
  }

  if (!user) return <AuthScreen />

  switch (currentScreen) {
    case SCREENS.UPLOAD_IMAGE:
      return <UploadImageScreen onBack={goBack} onSuccess={goBack} />
    case SCREENS.SETTINGS:
      return <SettingsScreen onBack={goBack} />
    case SCREENS.MODULE_DETAIL:
      return <ModuleDetailScreen moduleId={selectedModuleId} onBack={goBack} onNavigate={navigateTo} />
    case SCREENS.VOICE_QUIZ:
      return (
        <VoiceQuizScreen
          moduleId={selectedModuleId}
          moduleName={selectedModuleName}
          flashcard={selectedFlashcard}
          userId={user?.id}
          onBack={goToModule}
          onComplete={(summary) => navigateTo(SCREENS.QUIZ_RESULTS, selectedModuleId, null, selectedModuleName, summary)}
          onNavigate={navigateTo}
        />
      )
    case SCREENS.IMAGE_QUIZ:
      return <ImageQuizScreen moduleId={selectedModuleId} onBack={goBack} onNavigate={navigateTo} />
    case SCREENS.TEXT_QUIZ:
      return <ImageQuizScreen moduleId={selectedModuleId} flashcard={selectedFlashcard} onBack={goBack} onNavigate={navigateTo} />
    case SCREENS.QUIZ_RESULTS:
      return (
        <QuizResultsScreen
          summary={quizSummary}
          moduleId={selectedModuleId}
          moduleName={selectedModuleName}
          onNavigate={navigateTo}
          onReviewWeak={goToModule}
        />
      )
    default:
      return <DashboardScreen onNavigate={navigateTo} />
  }
}

export default function App() {
  return (
    <CivicAuthProvider
      clientId={import.meta.env.VITE_CIVIC_CLIENT_ID}
    >
      <AppContent />
    </CivicAuthProvider>
  )
}
