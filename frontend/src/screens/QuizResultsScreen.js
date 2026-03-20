/**
 * Quiz Results Screen
 *
 * Displays session summary after completing a quiz.
 * Shows cards reviewed, correct/incorrect counts, score changes,
 * and provides navigation back to module or to review weak cards.
 */

const React = require('react');
const { useState, useCallback } = React;
const { YStack, XStack, Text, Button, Card, ScrollView } = require('@tamagui/core');

function ScoreChangeItem({ flashcardId, result, flashcards }) {
  const flashcard = flashcards?.find(fc => fc.id === flashcardId);
  const isPositive = result.scoreChange > 0;

  return (
    <Card
      padding="$3"
      marginBottom="$2"
      backgroundColor="$cardBackground"
      borderColor={result.isCorrect ? '$success' : '$error'}
      borderWidth={1}
    >
      <YStack gap="$2">
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize="$2" color="$textSecondary" flex={1} numberOfLines={1}>
            {flashcard?.question || `Card ${flashcardId?.substring(0, 8)}...`}
          </Text>
          <XStack
            paddingHorizontal="$2"
            paddingVertical="$1"
            backgroundColor={result.isCorrect ? '$success' : '$error'}
            borderRadius="$2"
          >
            <Text fontSize="$1" color="white" fontWeight="bold">
              {result.isCorrect ? 'Correct' : 'Incorrect'}
            </Text>
          </XStack>
        </XStack>
        {!result.isCorrect && result.correctAnswer && (
          <Text fontSize="$2" color="$textPrimary">
            Answer: {result.correctAnswer}
          </Text>
        )}
        <XStack justifyContent="flex-end">
          <Text fontSize="$2" color={isPositive ? '$success' : '$error'} fontWeight="600">
            {isPositive ? '+' : ''}{result.scoreChange} points
          </Text>
        </XStack>
      </YStack>
    </Card>
  );
}

function QuizResultsScreen({ summary, flashcards, moduleId, onNavigate, screens, onReviewWeak }) {
  const [showDetails, setShowDetails] = useState(false);

  if (!summary) {
    return (
      <YStack flex={1} padding="$4" backgroundColor="$background" alignItems="center" justifyContent="center">
        <Text fontSize="$3" color="$textSecondary">
          No quiz results available.
        </Text>
        <Button
          marginTop="$4"
          theme="purple"
          size="$3"
          onPress={() => onNavigate && onNavigate(screens?.MODULE_DETAIL || 'module_detail', moduleId)}
        >
          Return to Module
        </Button>
      </YStack>
    );
  }

  const accuracy = summary.accuracy || 0;
  const accuracyColor = accuracy >= 70 ? '$success' : accuracy >= 40 ? '$warning' : '$error';
  const duration = summary.duration || 0;
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  return (
    <YStack flex={1} padding="$4" backgroundColor="$background">
      {/* Header */}
      <XStack justifyContent="space-between" alignItems="center" marginBottom="$5" paddingBottom="$4" borderBottomWidth={1} borderBottomColor="$borderColor">
        <YStack>
          <Text fontSize="$6" fontWeight="bold" color="$textPrimary">
            Quiz Complete!
          </Text>
          <Text fontSize="$3" color="$textSecondary">
            Session Summary
          </Text>
        </YStack>
        <Button
          size="$3"
          variant="outlined"
          onPress={() => onNavigate && onNavigate(screens?.MODULE_DETAIL || 'module_detail', moduleId)}
        >
          Back to Module
        </Button>
      </XStack>

      <ScrollView flex={1}>
        <YStack gap="$4">
          {/* Score Overview Card */}
          <Card elevate padding="$5" backgroundColor="$cardBackground" borderColor="$borderColor">
            <YStack gap="$4" alignItems="center">
              {/* Big Score Circle */}
              <YStack
                width={120}
                height={120}
                borderRadius={60}
                backgroundColor={accuracyColor}
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize="$8" color="white" fontWeight="bold">
                  {accuracy}%
                </Text>
              </YStack>

              <Text fontSize="$3" color="$textSecondary" textAlign="center">
                Accuracy
              </Text>

              {/* Stats Row */}
              <XStack gap="$5" justifyContent="center" flexWrap="wrap">
                <YStack alignItems="center" gap="$1">
                  <Text fontSize="$5" fontWeight="bold" color="$textPrimary">
                    {summary.answered}
                  </Text>
                  <Text fontSize="$2" color="$textSecondary">
                    Answered
                  </Text>
                </YStack>
                <YStack alignItems="center" gap="$1">
                  <Text fontSize="$5" fontWeight="bold" color="$success">
                    {summary.correct}
                  </Text>
                  <Text fontSize="$2" color="$textSecondary">
                    Correct
                  </Text>
                </YStack>
                <YStack alignItems="center" gap="$1">
                  <Text fontSize="$5" fontWeight="bold" color="$error">
                    {summary.incorrect}
                  </Text>
                  <Text fontSize="$2" color="$textSecondary">
                    Incorrect
                  </Text>
                </YStack>
              </XStack>

              {/* Progress Bar */}
              <YStack width="100%" gap="$2">
                <XStack justifyContent="space-between">
                  <Text fontSize="$2" color="$success">{summary.correct} correct</Text>
                  <Text fontSize="$2" color="$error">{summary.incorrect} incorrect</Text>
                </XStack>
                <YStack height={10} backgroundColor="$backgroundHover" borderRadius="$round" overflow="hidden">
                  <XStack height="100%" width="100%">
                    <YStack
                      height="100%"
                      width={`${summary.answered > 0 ? (summary.correct / summary.answered) * 100 : 0}%`}
                      backgroundColor="$success"
                      borderRadius="$round"
                    />
                    <YStack
                      height="100%"
                      width={`${summary.answered > 0 ? (summary.incorrect / summary.answered) * 100 : 0}%`}
                      backgroundColor="$error"
                      borderRadius="$round"
                    />
                  </XStack>
                </YStack>
              </YStack>
            </YStack>
          </Card>

          {/* Score Changes Card */}
          <Card elevate padding="$4" backgroundColor="$cardBackground" borderColor="$borderColor">
            <YStack gap="$3">
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$4" fontWeight="bold" color="$textPrimary">
                  Score Changes
                </Text>
                <XStack
                  paddingHorizontal="$2"
                  paddingVertical="$1"
                  backgroundColor={summary.totalScoreChange >= 0 ? '$success' : '$error'}
                  borderRadius="$2"
                >
                  <Text fontSize="$2" color="white" fontWeight="bold">
                    {summary.totalScoreChange >= 0 ? '+' : ''}{summary.totalScoreChange} total
                  </Text>
                </XStack>
              </XStack>

              <YStack height={8} backgroundColor="$backgroundHover" borderRadius="$round" overflow="hidden">
                <YStack
                  height="100%"
                  width={`${Math.min(summary.moduleAggregateScore || 0, 100)}%`}
                  backgroundColor={summary.moduleAggregateScore >= 70 ? '$success' : summary.moduleAggregateScore >= 40 ? '$warning' : '$error'}
                  borderRadius="$round"
                />
              </YStack>

              <XStack justifyContent="space-between">
                <Text fontSize="$2" color="$textSecondary">
                  Module Score: {summary.moduleAggregateScore || 0}%
                </Text>
                <Text fontSize="$2" color="$textSecondary">
                  Duration: {minutes}m {seconds}s
                </Text>
              </XStack>
            </YStack>
          </Card>

          {/* Detailed Results Toggle */}
          <Button
            size="$3"
            variant="outlined"
            onPress={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide Details' : 'Show Detailed Results'}
          </Button>

          {/* Detailed Results */}
          {showDetails && summary.responses && (
            <YStack>
              <Text fontSize="$4" fontWeight="bold" color="$textPrimary" marginBottom="$3">
                Question Details
              </Text>
              {summary.responses.map((response, index) => (
                <ScoreChangeItem
                  key={index}
                  flashcardId={response.flashcardId}
                  result={response}
                  flashcards={flashcards}
                />
              ))}
            </YStack>
          )}

          {/* Action Buttons */}
          <XStack gap="$3" paddingVertical="$3">
            <Button
              flex={1}
              size="$3"
              theme="purple"
              onPress={() => onNavigate && onNavigate(screens?.MODULE_DETAIL || 'module_detail', moduleId)}
            >
              Return to Module
            </Button>
            {summary.incorrect > 0 && (
              <Button
                flex={1}
                size="$3"
                variant="outlined"
                theme="orange"
                onPress={() => onReviewWeak && onReviewWeak(summary)}
              >
                Review Weak Cards
              </Button>
            )}
          </XStack>
        </YStack>
      </ScrollView>
    </YStack>
  );
}

module.exports = QuizResultsScreen;
