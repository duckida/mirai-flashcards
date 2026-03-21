/**
 * ProgressBar Component
 *
 * Reusable progress bar with consistent styling.
 * Used in quiz sessions, module details, and dashboard overview.
 */

const React = require('react');
const { YStack, XStack, Text } = require('tamagui');

function ProgressBar({ current, total, height = 6, showLabel = false, color }) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  const barColor = color || '$primary';

  return (
    <YStack gap="$2">
      {showLabel && (
        <XStack justifyContent="space-between">
          <Text fontSize="$2" color="$textSecondary">
            Question {current} of {total}
          </Text>
          <Text fontSize="$2" color="$textSecondary">
            {percentage}%
          </Text>
        </XStack>
      )}
      <YStack
        height={height}
        backgroundColor="$backgroundHover"
        borderRadius="$round"
        overflow="hidden"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progress: ${percentage}%`}
      >
        <YStack
          height="100%"
          width={`${percentage}%`}
          backgroundColor={barColor}
          borderRadius="$round"
        />
      </YStack>
    </YStack>
  );
}

module.exports = ProgressBar;
