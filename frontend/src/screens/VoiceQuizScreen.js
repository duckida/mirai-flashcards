/**
 * Voice Quiz Session Screen
 *
 * Voice-based quiz session. Currently uses text-based interaction
 * as a foundation. Will be enhanced with ElevenLabs speech
 * integration in Phase 8.
 */

const React = require('react');
const { useState, useEffect, useCallback } = React;
const { YStack, XStack, Text, Button, Card, Spinner, ScrollView, Input } = require('@tamagui/core');
const useAuth = require('../hooks/useAuth');
const useQuiz = require('../hooks/useQuiz');
const QuizResultsScreen = require('./QuizResultsScreen');
const moduleService = require('../services/moduleService');

function VoiceQuizScreen({ moduleId, onBack, onNavigate, screens }) {
  const { user } = useAuth();
  const {
    session,
    currentQuestion,
    isLoading,
    error,
    feedback,
    summary,
    isComplete,
    progress,
    startQuiz,
    submitAnswer,
    nextQuestion,
    endQuiz,
    reset,
    setError,
  } = useQuiz();

  const [module, setModule] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [userAnswer, setUserAnswer] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  // Fetch module data
  useEffect(() => {
    if (!moduleId) return;

    const fetchData = async () => {
      try {
        const result = await moduleService.getModuleFlashcards(moduleId);
        if (result.success) {
          setModule(result.module);
          setFlashcards(result.flashcards || []);
        }
      } catch (err) {
        console.error('Failed to load module:', err);
      }
    };
    fetchData();
  }, [moduleId]);

  // Start quiz on mount
  useEffect(() => {
    if (user?.id && moduleId && !session && !isLoading) {
      startQuiz(user.id, moduleId, 'voice', 10);
    }
  }, [user, moduleId, session, isLoading, startQuiz]);

  // Reset answer state when new question loads
  useEffect(() => {
    if (currentQuestion) {
      setUserAnswer('');
      setIsAnswered(false);
      setShowAnswer(false);
    }
  }, [currentQuestion?.id]);

  const handleSubmit = useCallback(async () => {
    if (!currentQuestion) return;

    if (!userAnswer || userAnswer.trim() === '') {
      setError('Please provide an answer');
      return;
    }

    const result = await submitAnswer(userAnswer);
    if (result) {
      setIsAnswered(true);
    }
  }, [currentQuestion, userAnswer, submitAnswer, setError]);

  const handleNext = useCallback(async () => {
    await nextQuestion();
  }, [nextQuestion]);

  const handleEndQuiz = useCallback(async () => {
    await endQuiz();
  }, [endQuiz]);

  const handleReturnToModule = useCallback(() => {
    reset();
    if (onNavigate && screens?.MODULE_DETAIL) {
      onNavigate(screens.MODULE_DETAIL, moduleId);
    } else if (onNavigate) {
      onNavigate('module_detail', moduleId);
    } else if (onBack) {
      onBack();
    }
  }, [reset, onNavigate, screens, moduleId, onBack]);

  const handleReviewWeak = useCallback(async () => {
    handleReturnToModule();
  }, [handleReturnToModule]);

  // Show results when quiz is complete
  if (summary || isComplete) {
    return (
      <QuizResultsScreen
        summary={summary}
        flashcards={flashcards}
        moduleId={moduleId}
        onNavigate={onNavigate}
        screens={screens}
        onReviewWeak={handleReviewWeak}
      />
    );
  }

  // Loading state
  if (isLoading && !currentQuestion) {
    return (
      <YStack flex={1} padding="$4" backgroundColor="$background" alignItems="center" justifyContent="center">
        <Spinner size="large" color="$primary" />
        <Text marginTop="$4" color="$textSecondary">
          Starting voice quiz...
        </Text>
      </YStack>
    );
  }

  // Error state
  if (error && !currentQuestion) {
    return (
      <YStack flex={1} padding="$4" backgroundColor="$background" alignItems="center" justifyContent="center">
        <Card padding="$5" backgroundColor="$errorBackground" borderColor="$error" borderWidth={1}>
          <YStack gap="$3" alignItems="center">
            <Text fontSize="$4" color="$error" fontWeight="bold">
              Quiz Error
            </Text>
            <Text fontSize="$3" color="$textPrimary" textAlign="center">
              {error}
            </Text>
            <XStack gap="$3">
              <Button size="$3" variant="outlined" onPress={handleReturnToModule}>
                Return to Module
              </Button>
              <Button
                size="$3"
                theme="purple"
                onPress={() => {
                  setError(null);
                  if (user?.id && moduleId) {
                    startQuiz(user.id, moduleId, 'voice', 10);
                  }
                }}
              >
                Try Again
              </Button>
            </XStack>
          </YStack>
        </Card>
      </YStack>
    );
  }

  if (!currentQuestion) {
    return (
      <YStack flex={1} padding="$4" backgroundColor="$background" alignItems="center" justifyContent="center">
        <Text fontSize="$3" color="$textSecondary">
          No question available.
        </Text>
        <Button marginTop="$4" theme="purple" size="$3" onPress={handleReturnToModule}>
          Return to Module
        </Button>
      </YStack>
    );
  }

  const canSubmit = userAnswer.trim() !== '';

  return (
    <YStack flex={1} padding="$4" backgroundColor="$background">
      {/* Header */}
      <XStack justifyContent="space-between" alignItems="center" marginBottom="$4" paddingBottom="$3" borderBottomWidth={1} borderBottomColor="$borderColor">
        <YStack flex={1}>
          <Text fontSize="$5" fontWeight="bold" color="$textPrimary">
            Voice Quiz
          </Text>
          <Text fontSize="$2" color="$textSecondary">
            {module?.name || 'Module'}
          </Text>
        </YStack>
        <Button size="$2" variant="outlined" onPress={handleEndQuiz} borderColor="$error" color="$error">
          End Quiz
        </Button>
      </XStack>

      {/* Progress */}
      <YStack gap="$2" marginBottom="$3">
        <XStack justifyContent="space-between">
          <Text fontSize="$2" color="$textSecondary">
            Question {progress.current} of {progress.total}
          </Text>
          <Text fontSize="$2" color="$textSecondary">
            {progress.percentage}%
          </Text>
        </XStack>
        <YStack height={6} backgroundColor="$backgroundHover" borderRadius="$round" overflow="hidden">
          <YStack
            height="100%"
            width={`${progress.percentage}%`}
            backgroundColor="$primary"
            borderRadius="$round"
          />
        </YStack>
      </YStack>

      {/* Score Summary */}
      <XStack gap="$4" justifyContent="center" paddingVertical="$2">
        <XStack gap="$1" alignItems="center">
          <Text fontSize="$2" color="$success" fontWeight="600">{progress.correct}</Text>
          <Text fontSize="$2" color="$textSecondary">correct</Text>
        </XStack>
        <XStack gap="$1" alignItems="center">
          <Text fontSize="$2" color="$error" fontWeight="600">{progress.incorrect}</Text>
          <Text fontSize="$2" color="$textSecondary">incorrect</Text>
        </XStack>
      </XStack>

      {/* Error Banner */}
      {error && (
        <Card backgroundColor="$errorBackground" borderColor="$error" borderWidth={1} padding="$3" marginBottom="$3">
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize="$2" color="$error" flex={1}>{error}</Text>
            <Button size="$1" variant="outlined" onPress={() => setError(null)}>Dismiss</Button>
          </XStack>
        </Card>
      )}

      <ScrollView flex={1}>
        <Card elevate padding="$5" backgroundColor="$cardBackground" borderColor="$borderColor">
          <YStack gap="$4" alignItems="center">
            {/* Microphone indicator placeholder */}
            <YStack
              width={80}
              height={80}
              borderRadius={40}
              backgroundColor={isLoading ? '$warning' : '$primary'}
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize="$6" color="white">
                {isLoading ? '...' : 'Q'}
              </Text>
            </YStack>

            <Text fontSize="$2" color="$textSecondary">
              {/* Will be replaced with actual speech status in Phase 8 */}
              Text-based mode
            </Text>

            {/* Question */}
            <YStack gap="$2" width="100%">
              <Text fontSize="$2" color="$textSecondary" fontWeight="600">
                Question
              </Text>
              <Text fontSize="$4" fontWeight="bold" color="$textPrimary" textAlign="center">
                {currentQuestion.question}
              </Text>
            </YStack>

            {/* Show Answer Toggle */}
            <Button
              size="$2"
              variant="outlined"
              onPress={() => setShowAnswer(!showAnswer)}
            >
              {showAnswer ? 'Hide Answer' : 'Show Answer'}
            </Button>

            {/* Answer (toggled) */}
            {showAnswer && (
              <YStack gap="$2" width="100%" padding="$3" backgroundColor="$backgroundHover" borderRadius="$3">
                <Text fontSize="$2" color="$textSecondary" fontWeight="600">
                  Correct Answer
                </Text>
                <Text fontSize="$3" color="$textPrimary">
                  {currentQuestion.correctAnswer}
                </Text>
              </YStack>
            )}

            {/* Answer Input */}
            {!isAnswered && (
              <YStack gap="$2" width="100%">
                <Text fontSize="$2" color="$textSecondary" fontWeight="600">
                  Your Answer
                </Text>
                <Input
                  value={userAnswer}
                  onChangeText={setUserAnswer}
                  placeholder="Type your answer..."
                  padding="$3"
                  fontSize="$3"
                  backgroundColor="$background"
                  borderColor="$borderColor"
                  borderWidth={1}
                  borderRadius="$3"
                />
              </YStack>
            )}

            {/* Feedback */}
            {feedback && (
              <Card
                padding="$4"
                width="100%"
                backgroundColor={feedback.isCorrect ? '$successLight' : '$errorLight'}
                borderColor={feedback.isCorrect ? '$success' : '$error'}
                borderWidth={2}
              >
                <YStack gap="$2">
                  <Text fontSize="$4" fontWeight="bold" color={feedback.isCorrect ? '$success' : '$error'}>
                    {feedback.isCorrect ? 'Correct!' : 'Incorrect'}
                  </Text>
                  <Text fontSize="$3" color="$textPrimary">
                    {feedback.feedback}
                  </Text>
                  {!feedback.isCorrect && (
                    <Text fontSize="$2" color="$textSecondary">
                      The correct answer is: <Text fontWeight="bold">{feedback.correctAnswer}</Text>
                    </Text>
                  )}
                </YStack>
              </Card>
            )}
          </YStack>
        </Card>
      </ScrollView>

      {/* Actions */}
      <XStack gap="$3" paddingVertical="$3">
        {!isAnswered ? (
          <Button
            flex={1}
            size="$3"
            theme="purple"
            disabled={!canSubmit || isLoading}
            opacity={!canSubmit || isLoading ? 0.5 : 1}
            onPress={handleSubmit}
          >
            {isLoading ? 'Submitting...' : 'Submit Answer'}
          </Button>
        ) : (
          <Button
            flex={1}
            size="$3"
            theme="purple"
            disabled={isLoading}
            opacity={isLoading ? 0.5 : 1}
            onPress={handleNext}
          >
            {isLoading ? 'Loading...' : 'Next Question'}
          </Button>
        )}
      </XStack>
    </YStack>
  );
}

module.exports = VoiceQuizScreen;
