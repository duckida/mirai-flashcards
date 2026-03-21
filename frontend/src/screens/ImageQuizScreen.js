/**
 * Image Quiz Session Screen
 *
 * Text-based quiz session where users answer questions displayed
 * with optional AI-generated images. Supports free recall,
 * multiple choice, and fill-in-the-blank exercise types.
 */

const React = require('react');
const { useState, useEffect, useCallback } = React;
const { YStack, XStack, Text, Button, Card, Spinner, ScrollView, Input } = require('@tamagui/core');
const useAuth = require('../hooks/useAuth');
const useQuiz = require('../hooks/useQuiz');
const QuizResultsScreen = require('./QuizResultsScreen');
const moduleService = require('../services/moduleService');

/**
 * Displays an AI-generated image for a quiz question.
 * Shows a loading spinner while the image loads,
 * and gracefully degrades if the image is unavailable.
 */
function ImageDisplay({ imageUrl, questionText }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Reset state when image URL changes
  useEffect(() => {
    setLoaded(false);
    setError(false);
  }, [imageUrl]);

  if (!imageUrl) {
    return (
      <Card
        padding="$4"
        backgroundColor="$backgroundHover"
        borderColor="$borderColor"
        borderWidth={1}
        alignItems="center"
        justifyContent="center"
        minHeight={200}
      >
        <YStack gap="$2" alignItems="center">
          <Text fontSize="$3" color="$textSecondary">
            No image available
          </Text>
          <Text fontSize="$1" color="$textSecondary" textAlign="center">
            Answer the question below
          </Text>
        </YStack>
      </Card>
    );
  }

  return (
    <Card
      overflow="hidden"
      backgroundColor="$backgroundHover"
      borderColor="$borderColor"
      borderWidth={1}
      borderRadius="$4"
    >
      <YStack position="relative" minHeight={200}>
        {!loaded && !error && (
          <YStack
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            alignItems="center"
            justifyContent="center"
            zIndex={1}
          >
            <Spinner size="large" color="$primary" />
            <Text marginTop="$2" fontSize="$2" color="$textSecondary">
              Generating image...
            </Text>
          </YStack>
        )}
        {error ? (
          <YStack
            padding="$4"
            alignItems="center"
            justifyContent="center"
            minHeight={200}
          >
            <Text fontSize="$3" color="$textSecondary">
              Image unavailable
            </Text>
            <Text fontSize="$1" color="$textSecondary">
              The question is still available below
            </Text>
          </YStack>
        ) : (
          <img
            src={imageUrl}
            alt={`Illustration for: ${questionText}`}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            style={{
              width: '100%',
              maxHeight: 300,
              objectFit: 'contain',
              display: loaded ? 'block' : 'none',
              backgroundColor: '#f5f5f5',
            }}
          />
        )}
      </YStack>
    </Card>
  );
}

function MultipleChoiceQuestion({ question, onSelect, selectedAnswer, isAnswered }) {
  return (
    <YStack gap="$3">
      <Text fontSize="$4" fontWeight="bold" color="$textPrimary">
        {question.question}
      </Text>
      <Text fontSize="$2" color="$textSecondary">
        Select the correct answer:
      </Text>
      <YStack gap="$2">
        {question.options.map((option, index) => {
          const isSelected = selectedAnswer === option;
          const isCorrect = option === question.correctAnswer;
          let borderColor = '$borderColor';
          let backgroundColor = '$cardBackground';

          if (isAnswered) {
            if (isCorrect) {
              borderColor = '$success';
              backgroundColor = '$successLight';
            } else if (isSelected && !isCorrect) {
              borderColor = '$error';
              backgroundColor = '$errorLight';
            }
          } else if (isSelected) {
            borderColor = '$primary';
            backgroundColor = '$purple1';
          }

          return (
            <Card
              key={index}
              padding="$3"
              borderWidth={2}
              borderColor={borderColor}
              backgroundColor={backgroundColor}
              pressStyle={!isAnswered ? { borderColor: '$primary' } : undefined}
              onPress={() => !isAnswered && onSelect(option)}
              cursor={isAnswered ? 'default' : 'pointer'}
            >
              <XStack gap="$3" alignItems="center">
                <YStack
                  width={28}
                  height={28}
                  borderRadius={14}
                  borderWidth={2}
                  borderColor={isSelected ? '$primary' : '$borderColor'}
                  backgroundColor={isSelected ? '$primary' : 'transparent'}
                  alignItems="center"
                  justifyContent="center"
                >
                  {isSelected && <Text fontSize="$1" color="white" fontWeight="bold">{String.fromCharCode(65 + index)}</Text>}
                </YStack>
                <Text fontSize="$3" color="$textPrimary" flex={1}>
                  {option}
                </Text>
              </XStack>
            </Card>
          );
        })}
      </YStack>
    </YStack>
  );
}

function FreeRecallQuestion({ question, userAnswer, setUserAnswer, isAnswered }) {
  return (
    <YStack gap="$3">
      <Text fontSize="$4" fontWeight="bold" color="$textPrimary">
        {question.question}
      </Text>
      <Text fontSize="$2" color="$textSecondary">
        Type your answer:
      </Text>
      <Input
        value={userAnswer}
        onChangeText={setUserAnswer}
        placeholder="Enter your answer..."
        disabled={isAnswered}
        padding="$3"
        fontSize="$3"
        backgroundColor="$background"
        borderColor={isAnswered ? (userAnswer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim() ? '$success' : '$error') : '$borderColor'}
        borderWidth={1}
        borderRadius="$3"
      />
    </YStack>
  );
}

function FillInTheBlankQuestion({ question, userAnswer, setUserAnswer, isAnswered }) {
  return (
    <YStack gap="$3">
      <Text fontSize="$4" fontWeight="bold" color="$textPrimary">
        {question.question}
      </Text>
      <Input
        value={userAnswer}
        onChangeText={setUserAnswer}
        placeholder="Fill in the blank..."
        disabled={isAnswered}
        padding="$3"
        fontSize="$3"
        backgroundColor="$background"
        borderColor={isAnswered ? '$borderColor' : '$borderColor'}
        borderWidth={1}
        borderRadius="$3"
      />
    </YStack>
  );
}

function FeedbackDisplay({ feedback, isCorrect, correctAnswer }) {
  return (
    <Card
      padding="$4"
      marginTop="$3"
      backgroundColor={isCorrect ? '$successLight' : '$errorLight'}
      borderColor={isCorrect ? '$success' : '$error'}
      borderWidth={2}
    >
      <YStack gap="$2">
        <XStack gap="$2" alignItems="center">
          <Text fontSize="$4" fontWeight="bold" color={isCorrect ? '$success' : '$error'}>
            {isCorrect ? 'Correct!' : 'Incorrect'}
          </Text>
        </XStack>
        <Text fontSize="$3" color="$textPrimary">
          {feedback}
        </Text>
        {!isCorrect && (
          <Text fontSize="$2" color="$textSecondary">
            The correct answer is: <Text fontWeight="bold">{correctAnswer}</Text>
          </Text>
        )}
      </YStack>
    </Card>
  );
}

function ProgressBar({ current, total }) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <YStack gap="$2">
      <XStack justifyContent="space-between">
        <Text fontSize="$2" color="$textSecondary">
          Question {current} of {total}
        </Text>
        <Text fontSize="$2" color="$textSecondary">
          {percentage}%
        </Text>
      </XStack>
      <YStack height={6} backgroundColor="$backgroundHover" borderRadius="$round" overflow="hidden">
        <YStack
          height="100%"
          width={`${percentage}%`}
          backgroundColor="$primary"
          borderRadius="$round"
        />
      </YStack>
    </YStack>
  );
}

function ImageQuizScreen({ moduleId, onBack, onNavigate, screens }) {
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
    getSummary,
    reset,
    setError,
  } = useQuiz();

  const [module, setModule] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [userAnswer, setUserAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);

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
      startQuiz(user.id, moduleId, 'image', 10);
    }
  }, [user, moduleId, session, isLoading, startQuiz]);

  // Reset answer state when new question loads
  useEffect(() => {
    if (currentQuestion) {
      setUserAnswer('');
      setSelectedOption(null);
      setIsAnswered(false);
    }
  }, [currentQuestion?.id]);

  const handleSelectOption = useCallback((option) => {
    setSelectedOption(option);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!currentQuestion) return;

    let answer;
    if (currentQuestion.type === 'multiple_choice') {
      answer = selectedOption;
    } else {
      answer = userAnswer;
    }

    if (!answer || answer.trim() === '') {
      setError('Please provide an answer');
      return;
    }

    const result = await submitAnswer(answer);
    if (result) {
      setIsAnswered(true);
    }
  }, [currentQuestion, selectedOption, userAnswer, submitAnswer, setError]);

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
    reset();
    if (onNavigate && screens?.MODULE_DETAIL) {
      onNavigate(screens.MODULE_DETAIL, moduleId, { reviewWeak: true });
    } else if (onNavigate) {
      onNavigate('module_detail', moduleId, { reviewWeak: true });
    } else if (onBack) {
      onBack();
    }
  }, [reset, onNavigate, screens, moduleId, onBack]);

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
          Loading quiz...
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
                    startQuiz(user.id, moduleId, 'image', 10);
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

  const canSubmit = currentQuestion.type === 'multiple_choice'
    ? selectedOption !== null
    : userAnswer.trim() !== '';

  return (
    <YStack flex={1} padding="$4" backgroundColor="$background">
      {/* Header */}
      <XStack justifyContent="space-between" alignItems="center" marginBottom="$4" paddingBottom="$3" borderBottomWidth={1} borderBottomColor="$borderColor">
        <YStack flex={1}>
          <Text fontSize="$5" fontWeight="bold" color="$textPrimary">
            Image Quiz
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
      <ProgressBar
        current={progress.current}
        total={progress.total}
      />

      {/* Score Summary */}
      <XStack gap="$4" justifyContent="center" paddingVertical="$3">
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
        <Card elevate padding="$4" backgroundColor="$cardBackground" borderColor="$borderColor">
          <YStack gap="$4">
            {/* Exercise Type Badge */}
            <XStack justifyContent="flex-start">
              <XStack
                paddingHorizontal="$2"
                paddingVertical="$1"
                backgroundColor="$purple2"
                borderRadius="$2"
              >
                <Text fontSize="$1" color="$primary" fontWeight="600">
                  {currentQuestion.type === 'multiple_choice' ? 'Multiple Choice' :
                   currentQuestion.type === 'fill_in_blank' ? 'Fill in the Blank' :
                   'Free Recall'}
                </Text>
              </XStack>
            </XStack>

            {/* AI-Generated Image */}
            {currentQuestion.imageUrl !== undefined && (
              <ImageDisplay
                imageUrl={currentQuestion.imageUrl}
                questionText={currentQuestion.question}
              />
            )}

            {/* Question */}
            {currentQuestion.type === 'multiple_choice' && (
              <MultipleChoiceQuestion
                question={currentQuestion}
                onSelect={handleSelectOption}
                selectedAnswer={selectedOption}
                isAnswered={isAnswered}
              />
            )}

            {currentQuestion.type === 'free_recall' && (
              <FreeRecallQuestion
                question={currentQuestion}
                userAnswer={userAnswer}
                setUserAnswer={setUserAnswer}
                isAnswered={isAnswered}
              />
            )}

            {currentQuestion.type === 'fill_in_blank' && (
              <FillInTheBlankQuestion
                question={currentQuestion}
                userAnswer={userAnswer}
                setUserAnswer={setUserAnswer}
                isAnswered={isAnswered}
              />
            )}

            {/* Feedback */}
            {feedback && (
              <FeedbackDisplay
                feedback={feedback.feedback}
                isCorrect={feedback.isCorrect}
                correctAnswer={feedback.correctAnswer}
              />
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

module.exports = ImageQuizScreen;
