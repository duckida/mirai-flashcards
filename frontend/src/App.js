const React = require('react')
const { TamaguiProvider, YStack, Spinner, Text } = require('@tamagui/core')
const tamaguiConfig = require('../tamagui.config').default
const AuthScreen = require('./screens/AuthScreen')
const DashboardScreen = require('./screens/DashboardScreen')
const useAuth = require('./hooks/useAuth')

function AppContent() {
  const { isLoading, isAuthenticated } = useAuth()

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

  return <DashboardScreen />
}

export default function App() {
  return (
    <TamaguiProvider config={tamaguiConfig}>
      <AppContent />
    </TamaguiProvider>
  )
}
