/**
 * Voice Quiz Session Screen
 *
 * Voice-based quiz session using ElevenLabs for speech recognition and synthesis.
 */

const React = require('react');
const { useState, useEffect, useCallback, useRef } = React;
const { YStack, XStack, Text, Button, Card, Spinner, ScrollView, Input } = require('tamagui');
const useAuth = require('../hooks/useAuth');
const useQuiz = require('../hooks/useQuiz');
const useSpeech = require('../hooks/useSpeech');
const speechService = require('../services/speechService');
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
  const {
    isConnected,
    isSpeaking,
    isListening,
    transcript,
    agentMessage,
    status,
    error: speechError,
    startConversation,
    stopConversation,
    sendContextualUpdate,
    sendUserMessage,
  } = useSpeech();

  const [module, setModule] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [userAnswer, setUserAnswer] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isMicPermissionRequested, setIsMicPermissionRequested] = useState(false);
  const [latencyStartTime, setLatencyStartTime] = useState(null);
  const conversationIdRef = useRef(null);

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
      
      // Send contextual update for new question
      if (isConnected) {
        setLatencyStartTime(Date.now());
        const contextText = `Question: ${currentQuestion.question}`;
        sendContextualUpdate(contextText);
      }
    }
  }, [currentQuestion?.id, isConnected, sendContextualUpdate]);

  // Handle speech connection when quiz starts
  useEffect(() => {
    if (user?.id && moduleId && session && !isConnected && status === 'idle') {
      initializeSpeechConnection();
    }
  }, [user, moduleId, session, isConnected, status]);

  // Handle transcript updates (when user finishes speaking)
  useEffect(() => {
    if (transcript && !isAnswered && isListening === false) {
      // Auto-populate answer field with transcript
      setUserAnswer(transcript);
      
      // Optionally auto-submit after a short delay
      // setTimeout(() => {
      //   if (userAnswer && !isAnswered) {
      //     handleSubmit();
      //   }
      // }, 1500);
    }
  }, [transcript, isAnswered, isListening]);

  // Handle agent messages (when AI speaks)
  useEffect(() => {
    if (agentMessage) {
      // Reset local answer input when agent starts speaking
      setUserAnswer('');
    }
  }, [agentMessage]);

  // Speech helper functions (defined before use to avoid const hoisting issues)
  const buildConversationContext = useCallback((sess, cards, usr) => {
    const currentQuestionIndex = sess?.currentQuestionIndex || 0;
    const currentFlashcard = cards[currentQuestionIndex];
    
    return {
      user_id: usr?.id,
      user_name: usr?.name || 'User',
      session_id: sess?.id,
      module_name: sess?.moduleName || 'Unknown Module',
      current_question_index: currentQuestionIndex,
      total_questions: sess?.questionCount || cards.length,
      current_question: currentFlashcard ? currentFlashcard.question : null,
      correct_answer: currentFlashcard ? currentFlashcard.answer : null,
      score_correct: sess?.score?.correct || 0,
      score_incorrect: sess?.score?.incorrect || 0,
      is_complete: sess?.isComplete || false,
      feedback: sess?.lastFeedback || null,
    };
  }, []);

  const buildSessionOverrides = useCallback((modName, userName) => {
    return {
      agent: {
        prompt: {
          prompt: `You are a helpful quiz assistant for the "${modName}" module. Greet the user by name (${userName}) and help them study by asking questions from their flashcards. Read questions clearly, wait for their responses, and provide encouraging feedback. Keep your responses concise and focused on the quiz.`,
        },
        first_message: `Hello ${userName}! I'm your quiz assistant for ${modName}. Let's start studying!`,
      },
    };
  }, []);

  const initializeSpeechConnection = async () => {
    try {
      // Get signed URL from backend
      const signedUrl = await speechService.getSignedUrl();
      
      // Build session overrides for quiz context
      const overrides = buildSessionOverrides(
        module?.name || 'Unknown Module',
        user?.name || 'User'
      );
      
      // Start conversation
      const success = await startConversation(signedUrl, overrides);
      if (success) {
        // Send initial context with user info
        const context = buildConversationContext(
          session,
          flashcards,
          user
        );
        sendContextualUpdate(JSON.stringify(context));
      }
    } catch (err) {
      console.error('Failed to initialize speech connection:', err);
      setError('Speech connection failed. Falling back to text mode.');
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!currentQuestion) return;

    if (!userAnswer || userAnswer.trim() === '') {
      setError('Please provide an answer');
      return;
    }

    // Calculate latency if we tracked it
    if (latencyStartTime) {
      const latency = Date.now() - latencyStartTime;
      console.log(`Speech latency: ${latency}ms`);
      if (latency > 1000) {
        console.warn(`High speech latency detected: ${latency}ms`);
      }
      setLatencyStartTime(null);
    }

    const result = await submitAnswer(userAnswer);
    if (result) {
      setIsAnswered(true);
      
      // Send feedback to agent
      if (isConnected) {
        const feedbackText = feedback.isCorrect 
          ? `Correct! ${feedback.feedback}` 
          : `Incorrect. ${feedback.feedback} The correct answer is ${feedback.correctAnswer}`;
        sendContextualUpdate(feedbackText);
      }
    }
  }, [currentQuestion, userAnswer, submitAnswer, setError, feedback, isConnected, sendContextualUpdate, latencyStartTime]);

  const handleNext = useCallback(async () => {
    await nextQuestion();
  }, [nextQuestion]);

  const handleEndQuiz = useCallback(async () => {
    if (isConnected) {
      // Send session summary to agent
      const summaryText = `Quiz complete! You scored ${progress.correct} out of ${progress.total} questions.`;
      sendContextualUpdate(summaryText);
      
      // Give a moment for the agent to speak before disconnecting
      setTimeout(() => {
        stopConversation();
      }, 2000);
    } else {
      stopConversation();
    }
    
    await endQuiz();
  }, [endQuiz, isConnected, sendContextualUpdate, stopConversation, progress]);

  const handleReturnToModule = useCallback(() => {
    reset();
    stopConversation();
    if (onNavigate && screens?.MODULE_DETAIL) {
      onNavigate(screens.MODULE_DETAIL, moduleId);
    } else if (onNavigate) {
      onNavigate('module_detail', moduleId);
    } else if (onBack) {
      onBack();
    }
  }, [reset, onNavigate, screens, moduleId, onBack, stopConversation]);

  const handleReviewWeak = useCallback(async () => {
    reset();
    stopConversation();
    if (onNavigate && screens?.MODULE_DETAIL) {
      onNavigate(screens.MODULE_DETAIL, moduleId, { reviewWeak: true });
    } else if (onNavigate) {
      onNavigate('module_detail', moduleId, { reviewWeak: true });
    } else if (onBack) {
      onBack();
    }
  }, [reset, stopConversation, onNavigate, screens, moduleId, onBack]);

  const requestMicPermission = useCallback(async () => {
    setIsMicPermissionRequested(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      return true;
    } catch (err) {
      console.error('Microphone permission denied:', err);
      return false;
    }
  }, []);

  // Show results when quiz is complete
  if (summary || isComplete) {
    return (
      <QuizResultsScreen
        summary={summary}
        flashcards={flashcards}
        moduleId={moduleId}
        moduleName={module?.name}
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

  // Determine microphone indicator color and animation
  let micBackgroundColor = '$primary';
  let micIcon = 'Q';
  
  if (isLoading) {
    micBackgroundColor = '$warning';
    micIcon = '...';
  } else if (status === 'error' || speechError) {
    micBackgroundColor = '$error';
    micIcon = '!';
  } else if (isSpeaking) {
    micBackgroundColor = '$purple6';
    micIcon = '🔊';
  } else if (isListening) {
    micBackgroundColor = '$success';
    micIcon = '🎤';
  } else if (!isConnected && !isMicPermissionRequested) {
    micBackgroundColor = '$backgroundHover';
    micIcon = '🎤';
  }

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

      {/* Speech Error Banner */}
      {(status === 'error' || speechError) && !isConnected && (
        <Card backgroundColor="$errorBackground" borderColor="$error" borderWidth={1} padding="$3" marginBottom="$3">
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize="$2" color="$error" flex={1}>
              {speechError || 'Speech connection error'}
            </Text>
            <XStack gap="$2">
              {!isMicPermissionRequested && (
                <Button size="$2" onPress={requestMicPermission}>
                  Enable Microphone
                </Button>
              )}
              <Button size="$2" variant="outlined" onPress={() => {
                // Reset error and try to reconnect
                stopConversation();
                setError(null);
              }}>
                Retry
              </Button>
              <Button size="$2" theme="purple" onPress={() => {
                setError(null);
                // Switch to text-only mode by ending speech
                stopConversation();
              }}>
                Text Mode
              </Button>
            </XStack>
          </XStack>
        </Card>
      )}

      {/* Mic Permission Banner */}
      {isMicPermissionRequested && !isConnected && !status.includes('connected') && (
        <Card backgroundColor="$warning" borderColor="$warning" borderWidth={1} padding="$3" marginBottom="$3">
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize="$2" color="$warning" flex={1}>
              Microphone permission denied. Please enable microphone access in browser settings for voice quiz.
            </Text>
            <Button size="$2" variant="outlined" onPress={() => setIsMicPermissionRequested(false)}>
              Got it
            </Button>
          </XStack>
        </Card>
      )}

      <ScrollView flex={1}>
        <Card elevate padding="$5" backgroundColor="$cardBackground" borderColor="$borderColor">
          <YStack gap="$4" alignItems="center">
            {/* Microphone indicator */}
            <YStack
              width={80}
              height={80}
              borderRadius={40}
              backgroundColor={micBackgroundColor}
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize="$6" color="white">
                {micIcon}
              </Text>
            </YStack>

            <Text fontSize="$2" color="$textSecondary">
              {/* Dynamic speech status */}
              {status === 'connecting' ? 'Connecting...' :
               status === 'connected' && !isSpeaking && !isListening ? 'Listening...' :
               isSpeaking ? 'AI is speaking...' :
               isListening ? 'Listening to your answer...' :
               status === 'error' ? 'Connection error' :
               !isConnected && !isMicPermissionRequested ? 'Tap microphone to start' :
               'Ready'}
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
                  placeholder="Type your answer or speak now..."
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
                backgroundColor={feedback.isCorrect ? '$successBackground' : '$errorBackground'}
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