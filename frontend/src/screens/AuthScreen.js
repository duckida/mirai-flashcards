/**
 * Authentication Screen
 *
 * Displays the login screen with Civic.ai authentication.
 * Shows loading state during OAuth flow and error messaging for failures.
 */

const React = require('react');
const { YStack, XStack, Text, Button, Spinner, Card } = require('@tamagui/core');
const useAuth = require('../hooks/useAuth');

function AuthScreen() {
  const { isLoading, error, login } = useAuth();

  return (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      padding="$6"
      backgroundColor="$background"
    >
      <Card
        elevate
        size="$6"
        bordered
        padding="$8"
        maxWidth={420}
        width="100%"
        borderColor="$borderColor"
        backgroundColor="$cardBackground"
      >
        <YStack alignItems="center" gap="$6">
          <YStack alignItems="center" gap="$3">
            <Text fontSize="$10" fontWeight="bold" color="$primary">
              AI Flashcard Quizzer
            </Text>
            <Text fontSize="$4" color="$textSecondary" textAlign="center">
              Digitize your notes and learn with AI-powered quizzes
            </Text>
          </YStack>

          <YStack
            width={80}
            height={80}
            borderRadius="$6"
            backgroundColor="$purple2"
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize="$10" color="$primary">
              📚
            </Text>
          </YStack>

          <YStack gap="$4" width="100%">
            {error && (
              <Card
                backgroundColor="$errorBackground"
                borderColor="$error"
                borderWidth={1}
                padding="$3"
                borderRadius="$3"
              >
                <Text color="$error" fontSize="$3" textAlign="center">
                  {error}
                </Text>
              </Card>
            )}

            {isLoading ? (
              <YStack alignItems="center" gap="$3" padding="$4">
                <Spinner size="large" color="$primary" />
                <Text fontSize="$3" color="$textSecondary">
                  Connecting to Civic.ai...
                </Text>
              </YStack>
            ) : (
              <Button
                theme="purple"
                size="$5"
                onPress={login}
                borderRadius="$4"
                fontWeight="bold"
              >
                Sign in with Civic
              </Button>
            )}
          </YStack>

          <Text fontSize="$2" color="$textTertiary" textAlign="center">
            Secure authentication powered by Civic.ai
          </Text>
        </YStack>
      </Card>
    </YStack>
  );
}

module.exports = AuthScreen;
