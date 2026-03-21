import { useState, useCallback } from 'react'
import { CivicAuthProvider, useUser } from '@civic/auth/react'
import AuthScreen from './screens/AuthScreen'
import DashboardScreen from './screens/DashboardScreen'
import UploadImageScreen from './screens/UploadImageScreen'
import ModuleDetailScreen from './screens/ModuleDetailScreen'
import VoiceQuizScreen from './screens/VoiceQuizScreen'
import ImageQuizScreen from './screens/ImageQuizScreen'
import SettingsScreen from './screens/SettingsScreen'

const SCREENS = {
  DASHBOARD: 'dashboard',
  UPLOAD_IMAGE: 'upload_image',
  MODULE_DETAIL: 'module_detail',
  VOICE_QUIZ: 'voice_quiz',
  IMAGE_QUIZ: 'image_quiz',
  SETTINGS: 'settings',
}

function AppContent() {
  const { user, isLoading } = useUser()
  const [currentScreen, setCurrentScreen] = useState(SCREENS.DASHBOARD)
  const [selectedModuleId, setSelectedModuleId] = useState(null)

  const navigateTo = useCallback((screen, moduleId) => {
    setCurrentScreen(screen)
    if (moduleId) setSelectedModuleId(moduleId)
  }, [])

  const goBack = useCallback(() => {
    setCurrentScreen(SCREENS.DASHBOARD)
    setSelectedModuleId(null)
  }, [])

  if (isLoading) {
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
      return <VoiceQuizScreen moduleId={selectedModuleId} onBack={goBack} onNavigate={navigateTo} />
    case SCREENS.IMAGE_QUIZ:
      return <ImageQuizScreen moduleId={selectedModuleId} onBack={goBack} onNavigate={navigateTo} />
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
