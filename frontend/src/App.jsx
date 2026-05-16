import { useState, useCallback } from 'react'
import { Loader } from 'lucide-react'
import { CivicAuthProvider, useUser } from '@civic/auth/react'
import AuthScreen from './screens/AuthScreen'
import DashboardScreen from './screens/DashboardScreen'
import UploadImageScreen from './screens/UploadImageScreen'
import ModuleDetailScreen from './screens/ModuleDetailScreen'
import ImageQuizScreen from './screens/ImageQuizScreen'
import MultipleChoiceQuizScreen from './screens/MultipleChoiceQuizScreen'
import QuizResultsScreen from './screens/QuizResultsScreen'
import SettingsScreen from './screens/SettingsScreen'
import VoiceQuizScreen from './screens/VoiceQuizScreen'

const SCREENS = {
  DASHBOARD: 'dashboard',
  UPLOAD_IMAGE: 'upload_image',
  MODULE_DETAIL: 'module_detail',
  IMAGE_QUIZ: 'image_quiz',
  TEXT_QUIZ: 'text_quiz',
  VOICE_QUIZ: 'voice_quiz',
  SETTINGS: 'settings',
  QUIZ_RESULTS: 'quiz_results',
}

function AppContent() {
  const { user, isLoading } = useUser()
  const [currentScreen, setCurrentScreen] = useState(SCREENS.DASHBOARD)
  const [selectedModuleId, setSelectedModuleId] = useState(null)
  const [selectedFlashcard, setSelectedFlashcard] = useState(null)
  const [selectedModuleName, setSelectedModuleName] = useState(null)
  const [quizSummary, setQuizSummary] = useState(null)

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

  if (isLoading && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
        <Loader className="w-8 h-8 animate-spin text-text-muted" />
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
    case SCREENS.IMAGE_QUIZ:
      return <ImageQuizScreen moduleId={selectedModuleId} onBack={goBack} onNavigate={navigateTo} />
    case SCREENS.TEXT_QUIZ:
      return (
        <MultipleChoiceQuizScreen
          moduleId={selectedModuleId}
          moduleName={selectedModuleName}
          flashcard={selectedFlashcard}
          onBack={goToModule}
          onComplete={(summary) => navigateTo(SCREENS.QUIZ_RESULTS, selectedModuleId, null, selectedModuleName, summary)}
          onNavigate={navigateTo}
        />
      )
    case SCREENS.VOICE_QUIZ:
      return (
        <VoiceQuizScreen
          moduleId={selectedModuleId}
          flashcard={selectedFlashcard}
          moduleName={selectedModuleName}
          onBack={goToModule}
          onNavigate={navigateTo}
        />
      )
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
