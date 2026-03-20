/**
 * Dashboard Screen
 *
 * Displays user modules and provides navigation to quiz features.
 * Shown after successful authentication.
 */

const React = require('react');
const { YStack, XStack, Text, Button, Card } = require('@tamagui/core');
const useAuth = require('../hooks/useAuth');

function DashboardScreen({ onNavigate, screens }) {
  const { user, logout } = useAuth();

  return (
    <YStack
      flex={1}
      padding="$4"
      backgroundColor="$background"
    >
      <XStack
        justifyContent="space-between"
        alignItems="center"
        marginBottom="$6"
        paddingBottom="$4"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
      >
        <YStack>
          <Text fontSize="$6" fontWeight="bold" color="$textPrimary">
            Dashboard
          </Text>
          <Text fontSize="$3" color="$textSecondary">
            Welcome, {user?.name || 'User'}
          </Text>
        </YStack>
        <Button
          size="$3"
          variant="outlined"
          onPress={logout}
          borderColor="$borderColor"
        >
          Sign Out
        </Button>
      </XStack>

      <Card
        elevate
        padding="$5"
        marginBottom="$4"
        backgroundColor="$cardBackground"
        borderColor="$borderColor"
      >
        <YStack gap="$3">
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize="$5" fontWeight="bold" color="$textPrimary">
              My Modules
            </Text>
            <Button
              theme="purple"
              size="$3"
              onPress={() => onNavigate && onNavigate(screens?.UPLOAD_IMAGE || 'upload_image')}
            >
              Upload Image
            </Button>
          </XStack>
          <YStack
            padding="$8"
            alignItems="center"
            justifyContent="center"
            backgroundColor="$backgroundHover"
            borderRadius="$4"
          >
            <Text fontSize="$3" color="$textTertiary">
              No modules yet. Upload an image of your notes to get started!
            </Text>
          </YStack>
        </YStack>
      </Card>

      <Card
        elevate
        padding="$5"
        backgroundColor="$cardBackground"
        borderColor="$borderColor"
      >
        <YStack gap="$3">
          <Text fontSize="$5" fontWeight="bold" color="$textPrimary">
            Quick Actions
          </Text>
          <XStack gap="$3" flexWrap="wrap">
            <Button theme="purple" size="$3" flex={1} minWidth={140}>
              Start Voice Quiz
            </Button>
            <Button theme="purple" size="$3" flex={1} minWidth={140}>
              Start Image Quiz
            </Button>
          </XStack>
        </YStack>
      </Card>
    </YStack>
  );
}

module.exports = DashboardScreen;
