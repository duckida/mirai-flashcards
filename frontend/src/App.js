const React = require('react')
const { useState, useCallback } = React
const { TamaguiProvider, YStack, Spinner, Text } = require('@tamagui/core')
const tamaguiConfig = require('../tamagui.config').default
const AuthScreen = require('./screens/AuthScreen')
const DashboardScreen = require('./screens/DashboardScreen')
const UploadImageScreen = require('./screens/UploadImageScreen')
const useAuth = require('./hooks/useAuth')

const SCREENS = {
  DASHBOARD: 'dashboard',
  UPLOAD_IMAGE: 'upload_image',
}

function AppContent() {
  const { isLoading, isAuthenticated } = useAuth()
  const [currentScreen, setCurrentScreen] = useState(SCREENS.DASHBOARD)

  const navigateTo = useCallback((screen) => {
    setCurrentScreen(screen)
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
        onBack={() => navigateTo(SCREENS.DASHBOARD)}
        onSuccess={() => navigateTo(SCREENS.DASHBOARD)}
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
