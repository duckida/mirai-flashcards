/**
 * Error Banner Component
 *
 * Reusable error display with optional dismiss and retry actions.
 * Used across screens for consistent error messaging.
 */

const React = require('react');
const { YStack, XStack, Text, Button, Card } = require('tamagui');

function ErrorBanner({ message, onDismiss, onRetry, style }) {
  if (!message) return null;

  return (
    <Card
      backgroundColor="$errorBackground"
      borderColor="$error"
      borderWidth={1}
      padding="$3"
      marginBottom="$3"
      role="alert"
      aria-live="assertive"
      style={style}
    >
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize="$3" color="$error" flex={1}>
          {message}
        </Text>
        <XStack gap="$2">
          {onRetry && (
            <Button
              size="$2"
              variant="outlined"
              aria-label="Retry"
              onPress={onRetry}
            >
              Retry
            </Button>
          )}
          {onDismiss && (
            <Button
              size="$2"
              variant="outlined"
              aria-label="Dismiss error"
              onPress={onDismiss}
            >
              Dismiss
            </Button>
          )}
        </XStack>
      </XStack>
    </Card>
  );
}

module.exports = ErrorBanner;
