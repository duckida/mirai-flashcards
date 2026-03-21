/**
 * Score Badge Component
 *
 * Color-coded score display with consistent styling.
 * Shows a percentage score with green/yellow/red coloring based on value.
 */

const React = require('react');
const { XStack, Text } = require('@tamagui/core');

function getScoreColor(score) {
  if (score >= 70) return '$success';
  if (score >= 40) return '$warning';
  return '$error';
}

function ScoreBadge({ score, showLabel = false, size = '$3' }) {
  const scoreColor = getScoreColor(score);
  const displayScore = typeof score === 'number' ? score : 0;

  return (
    <XStack alignItems="center" gap="$1">
      <XStack
        paddingHorizontal="$2"
        paddingVertical="$1"
        backgroundColor={scoreColor}
        borderRadius="$2"
        aria-label={`Score: ${displayScore}%`}
      >
        <Text fontSize={size} color="white" fontWeight="bold">
          {displayScore}%
        </Text>
      </XStack>
      {showLabel && (
        <Text fontSize="$2" color="$textSecondary">
          Score
        </Text>
      )}
    </XStack>
  );
}

module.exports = ScoreBadge;
module.exports.getScoreColor = getScoreColor;
