/**
 * Presentation Modal Component
 *
 * Displays Canva presentation generation status with success/error states.
 * Provides links to view or edit the presentation in Canva.
 * Used in ModuleDetailScreen and QuizResultsScreen.
 */

const React = require('react');
const { useState, useCallback } = React;
const { YStack, XStack, Text, Button, Card } = require('tamagui');

function PresentationModal({
  isVisible,
  onClose,
  isGenerating,
  presentationResult,
  presentationError,
  moduleName,
  onRetry,
}) {
  if (!isVisible) return null;

  return (
    <Card
      elevate
      padding="$4"
      backgroundColor="$cardBackground"
      borderColor={presentationError ? '$error' : '$success'}
      borderWidth={2}
      role="dialog"
      aria-label={presentationError ? 'Presentation generation failed' : 'Presentation ready'}
    >
      <YStack gap="$3">
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize="$4" fontWeight="bold" color={presentationError ? '$error' : '$success'}>
            {presentationError ? 'Generation Failed' : isGenerating ? 'Generating...' : 'Presentation Ready!'}
          </Text>
        </XStack>

        {isGenerating ? (
          <YStack gap="$2" alignItems="center" paddingVertical="$3">
            <Text fontSize="$3" color="$textSecondary">
              Generating your Canva presentation for "{moduleName}"...
            </Text>
          </YStack>
        ) : presentationError ? (
          <YStack gap="$2">
            <Text fontSize="$3" color="$textPrimary">
              {presentationError}
            </Text>
            {onRetry && (
              <Button size="$3" theme="purple" onPress={onRetry}>
                Retry
              </Button>
            )}
          </YStack>
        ) : (
          <YStack gap="$2">
            <Text fontSize="$3" color="$textPrimary">
              Your Canva presentation for "{moduleName}" is ready.
            </Text>
            {presentationResult?.editUrl && (
              <Button
                size="$3"
                theme="purple"
                onPress={() => window.open(presentationResult.editUrl, '_blank')}
                aria-label="Open presentation in Canva for editing"
              >
                Open in Canva
              </Button>
            )}
            {presentationResult?.viewUrl && (
              <Button
                size="$3"
                variant="outlined"
                onPress={() => window.open(presentationResult.viewUrl, '_blank')}
                aria-label="View presentation"
              >
                View Presentation
              </Button>
            )}
          </YStack>
        )}

        <Button size="$2" variant="outlined" onPress={onClose} aria-label="Close dialog">
          Close
        </Button>
      </YStack>
    </Card>
  );
}

module.exports = PresentationModal;
