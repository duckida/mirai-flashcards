import { useState, useCallback, Suspense, lazy } from 'react'
import { Loader } from 'lucide-react'
import { CivicAuthProvider, useUser } from '@civic/auth/react'
import AuthScreen from './screens/AuthScreen'

const DashboardScreen = lazy(() => import('./screens/DashboardScreen'))
const UploadImageScreen = lazy(() => import('./screens/UploadImageScreen'))
const ModuleDetailScreen = lazy(() => import('./screens/ModuleDetailScreen'))
const ImageQuizScreen = lazy(() => import('./screens/ImageQuizScreen'))
const MultipleChoiceQuizScreen = lazy(() => import('./screens/MultipleChoiceQuizScreen'))
const QuizResultsScreen = lazy(() => import('./screens/QuizResultsScreen'))
const SettingsScreen = lazy(() => import('./screens/SettingsScreen'))
const VoiceQuizScreen = lazy(() => import('./screens/VoiceQuizScreen'))

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

function ScreenFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Loader className="w-6 h-6 animate-spin text-text-muted" />
    </div>
  )
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
      return <Suspense fallback={<ScreenFallback />}><UploadImageScreen onBack={goBack} onSuccess={goBack} /></Suspense>
    case SCREENS.SETTINGS:
      return <Suspense fallback={<ScreenFallback />}><SettingsScreen onBack={goBack} /></Suspense>
    case SCREENS.MODULE_DETAIL:
      return <Suspense fallback={<ScreenFallback />}><ModuleDetailScreen moduleId={selectedModuleId} onBack={goBack} onNavigate={navigateTo} /></Suspense>
    case SCREENS.IMAGE_QUIZ:
      return <Suspense fallback={<ScreenFallback />}><ImageQuizScreen moduleId={selectedModuleId} onBack={goBack} onNavigate={navigateTo} /></Suspense>
    case SCREENS.TEXT_QUIZ:
      return (
        <Suspense fallback={<ScreenFallback />}>
          <MultipleChoiceQuizScreen
            moduleId={selectedModuleId}
            moduleName={selectedModuleName}
            flashcard={selectedFlashcard}
            onBack={goToModule}
            onComplete={(summary) => navigateTo(SCREENS.QUIZ_RESULTS, selectedModuleId, null, selectedModuleName, summary)}
            onNavigate={navigateTo}
          />
        </Suspense>
      )
    case SCREENS.VOICE_QUIZ:
      return (
        <Suspense fallback={<ScreenFallback />}>
          <VoiceQuizScreen
            moduleId={selectedModuleId}
            flashcard={selectedFlashcard}
            moduleName={selectedModuleName}
            onBack={goToModule}
            onNavigate={navigateTo}
          />
        </Suspense>
      )
    case SCREENS.QUIZ_RESULTS:
      return (
        <Suspense fallback={<ScreenFallback />}>
          <QuizResultsScreen
            summary={quizSummary}
            moduleId={selectedModuleId}
            moduleName={selectedModuleName}
            onNavigate={navigateTo}
            onReviewWeak={goToModule}
          />
        </Suspense>
      )
    default:
      return <Suspense fallback={<ScreenFallback />}><DashboardScreen onNavigate={navigateTo} /></Suspense>
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
