const React = require('react')
const { useState, useCallback } = React
const { TamaguiProvider, YStack, Spinner, Text } = require('@tamagui/core')
const tamaguiConfig = require('../tamagui.config').default
const AuthScreen = require('./screens/AuthScreen')
const DashboardScreen = require('./screens/DashboardScreen')
const UploadImageScreen = require('./screens/UploadImageScreen')
const ModuleDetailScreen = require('./screens/ModuleDetailScreen')
const ImageQuizScreen = require('./screens/ImageQuizScreen')
const VoiceQuizScreen = require('./screens/VoiceQuizScreen')
const useAuth = require('./hooks/useAuth')

const SCREENS = {
  DASHBOARD: 'dashboard',
  UPLOAD_IMAGE: 'upload_image',
  MODULE_DETAIL: 'module_detail',
  VOICE_QUIZ: 'voice_quiz',
  IMAGE_QUIZ: 'image_quiz',
}

function AppContent() {
  const { isLoading, isAuthenticated } = useAuth()
  const [currentScreen, setCurrentScreen] = useState(SCREENS.DASHBOARD)
  const [selectedModuleId, setSelectedModuleId] = useState(null)

  const navigateTo = useCallback((screen, moduleId) => {
    setCurrentScreen(screen)
    if (moduleId) {
      setSelectedModuleId(moduleId)
    }
  }, [])

  const goBack = useCallback(() => {
    setCurrentScreen(SCREENS.DASHBOARD)
    setSelectedModuleId(null)
  }, [])

  if (isLoading) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" padding="$4" backgroundColor="$background">
        <Spinner size="large" color="$primary" />
        <Text marginTop="$4" color="$textSecondary">
          Loading...
        </Text>
      </YStack>
    )
  }

  if (!isAuthenticated) {
    return <AuthScreen />
  }

  if (currentScreen === SCREENS.UPLOAD_IMAGE) {
    return (
      <UploadImageScreen
        onBack={goBack}
        onSuccess={goBack}
      />
    )
  }

  if (currentScreen === SCREENS.VOICE_QUIZ && selectedModuleId) {
    return (
      <VoiceQuizScreen
        moduleId={selectedModuleId}
        onBack={goBack}
        onNavigate={navigateTo}
        screens={SCREENS}
      />
    )
  }

  if (currentScreen === SCREENS.IMAGE_QUIZ && selectedModuleId) {
    return (
      <ImageQuizScreen
        moduleId={selectedModuleId}
        onBack={goBack}
        onNavigate={navigateTo}
        screens={SCREENS}
      />
    )
  }

  if (currentScreen === SCREENS.MODULE_DETAIL && selectedModuleId) {
    return (
      <ModuleDetailScreen
        moduleId={selectedModuleId}
        onBack={goBack}
        onNavigate={navigateTo}
        screens={SCREENS}
      />
    )
  }

  return (
    <DashboardScreen
      onNavigate={navigateTo}
      screens={SCREENS}
    />
  )
}

export default function App() {
  return (
    <TamaguiProvider config={tamaguiConfig}>
      <AppContent />
    </TamaguiProvider>
  )
}
