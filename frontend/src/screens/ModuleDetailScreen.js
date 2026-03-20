/**
 * Module Detail Screen
 *
 * Displays all flashcards in a module with question/answer toggle,
 * knowledge score display, and edit/delete capabilities.
 */

const React = require('react');
const { useState, useEffect, useCallback } = React;
const { YStack, XStack, Text, Button, Card, Spinner, ScrollView, Input } = require('@tamagui/core');
const useAuth = require('../hooks/useAuth');
const moduleService = require('../services/moduleService');
const flashcardService = require('../services/flashcardService');
const apiClient = require('../services/apiClient');

function FlashcardCard({ flashcard, onEdit, onDelete, onToggle, isExpanded }) {
  const score = flashcard.knowledgeScore || 0;
  const scoreColor =
    score >= 70 ? '$success' : score >= 40 ? '$warning' : '$error';

  const reviewCount = flashcard.reviewCount || 0;
  const correctCount = flashcard.correctCount || 0;
  const incorrectCount = flashcard.incorrectCount || 0;
  const accuracy = reviewCount > 0 ? Math.round((correctCount / reviewCount) * 100) : null;

  return (
    <Card
      elevate
      padding="$4"
      marginBottom="$3"
      backgroundColor="$cardBackground"
      borderColor={isExpanded ? '$primary' : '$borderColor'}
      borderWidth={isExpanded ? 2 : 1}
    >
      <YStack gap="$3">
        {/* Header with score */}
        <XStack justifyContent="space-between" alignItems="center">
          <XStack gap="$2" alignItems="center">
            <XStack
              paddingHorizontal="$2"
              paddingVertical="$1"
              backgroundColor={scoreColor}
              borderRadius="$2"
            >
              <Text fontSize="$1" color="white" fontWeight="bold">
                {score}%
              </Text>
            </XStack>
            <Text fontSize="$2" color="$textSecondary">
              Knowledge Score
            </Text>
          </XStack>
          <XStack gap="$2">
            <Button size="$2" variant="outlined" onPress={() => onToggle(flashcard.id)}>
              {isExpanded ? 'Hide Answer' : 'Show Answer'}
            </Button>
            <Button size="$2" variant="outlined" onPress={() => onEdit(flashcard.id)}>
              Edit
            </Button>
            <Button size="$2" variant="outlined" borderColor="$error" color="$error" onPress={() => onDelete(flashcard.id)}>
              Delete
            </Button>
          </XStack>
        </XStack>

        {/* Question */}
        <YStack gap="$1">
          <Text fontSize="$2" color="$textSecondary" fontWeight="600">
            Question
          </Text>
          <Text fontSize="$3" color="$textPrimary">
            {flashcard.question}
          </Text>
        </YStack>

        {/* Answer (toggled) */}
        {isExpanded && (
          <YStack gap="$1" paddingTop="$2" borderTopWidth={1} borderTopColor="$borderColor">
            <Text fontSize="$2" color="$textSecondary" fontWeight="600">
              Answer
            </Text>
            <Text fontSize="$3" color="$textPrimary">
              {flashcard.answer}
            </Text>
          </YStack>
        )}

        {/* Score bar */}
        <YStack height={4} backgroundColor="$backgroundHover" borderRadius="$round" overflow="hidden">
          <YStack
            height="100%"
            width={`${Math.min(score, 100)}%`}
            backgroundColor={scoreColor}
            borderRadius="$round"
          />
        </YStack>

        {/* Review stats */}
        {reviewCount > 0 && (
          <XStack gap="$4" justifyContent="space-between">
            <XStack gap="$1" alignItems="center">
              <Text fontSize="$1" color="$textSecondary">
                Reviews:
              </Text>
              <Text fontSize="$1" color="$textPrimary" fontWeight="600">
                {reviewCount}
              </Text>
            </XStack>
            <XStack gap="$1" alignItems="center">
              <Text fontSize="$1" color="$success">
                {correctCount} correct
              </Text>
              <Text fontSize="$1" color="$textSecondary">
                /
              </Text>
              <Text fontSize="$1" color="$error">
                {incorrectCount} incorrect
              </Text>
            </XStack>
            <XStack gap="$1" alignItems="center">
              <Text fontSize="$1" color="$textSecondary">
                Accuracy:
              </Text>
              <Text fontSize="$1" fontWeight="600" color={accuracy >= 70 ? '$success' : accuracy >= 40 ? '$warning' : '$error'}>
                {accuracy}%
              </Text>
            </XStack>
          </XStack>
        )}
      </YStack>
    </Card>
  );
}

function FlashcardEditorModal({ flashcard, onSave, onCancel }) {
  const [question, setQuestion] = useState(flashcard.question);
  const [answer, setAnswer] = useState(flashcard.answer);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    if (!question.trim() || !answer.trim()) {
      setError('Question and answer cannot be empty');
      return;
    }
    setError(null);
    await onSave(flashcard.id, { question: question.trim(), answer: answer.trim() });
  };

  return (
    <Card elevate padding="$4" marginBottom="$3" backgroundColor="$cardBackground" borderColor="$primary" borderWidth={2}>
      <YStack gap="$3">
        <Text fontSize="$4" fontWeight="bold" color="$primary">
          Edit Flashcard
        </Text>

        <YStack gap="$2">
          <Text fontSize="$2" color="$textSecondary" fontWeight="600">
            Question
          </Text>
          <Input
            value={question}
            onChangeText={setQuestion}
            placeholder="Enter question"
            multiline
            numberOfLines={3}
            padding="$3"
            backgroundColor="$background"
            borderColor={question.trim() ? '$borderColor' : '$error'}
            borderWidth={1}
            borderRadius="$3"
          />
        </YStack>

        <YStack gap="$2">
          <Text fontSize="$2" color="$textSecondary" fontWeight="600">
            Answer
          </Text>
          <Input
            value={answer}
            onChangeText={setAnswer}
            placeholder="Enter answer"
            multiline
            numberOfLines={3}
            padding="$3"
            backgroundColor="$background"
            borderColor={answer.trim() ? '$borderColor' : '$error'}
            borderWidth={1}
            borderRadius="$3"
          />
        </YStack>

        {error && (
          <Text fontSize="$2" color="$error">
            {error}
          </Text>
        )}

        <XStack gap="$2" justifyContent="flex-end">
          <Button size="$3" variant="outlined" onPress={onCancel}>
            Cancel
          </Button>
          <Button
            size="$3"
            theme="purple"
            onPress={handleSave}
            disabled={!question.trim() || !answer.trim()}
            opacity={!question.trim() || !answer.trim() ? 0.5 : 1}
          >
            Save
          </Button>
        </XStack>
      </YStack>
    </Card>
  );
}

function NewFlashcardForm({ moduleId, userId, onSave, onCancel }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!question.trim() || !answer.trim()) {
      setError('Question and answer cannot be empty');
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await onSave({ question: question.trim(), answer: answer.trim() });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card elevate padding="$4" marginBottom="$3" backgroundColor="$cardBackground" borderColor="$primary" borderWidth={2}>
      <YStack gap="$3">
        <Text fontSize="$4" fontWeight="bold" color="$primary">
          New Flashcard
        </Text>

        <YStack gap="$2">
          <Text fontSize="$2" color="$textSecondary" fontWeight="600">
            Question
          </Text>
          <Input
            value={question}
            onChangeText={setQuestion}
            placeholder="Enter question"
            multiline
            numberOfLines={3}
            padding="$3"
            backgroundColor="$background"
            borderColor={question.trim() ? '$borderColor' : '$error'}
            borderWidth={1}
            borderRadius="$3"
          />
        </YStack>

        <YStack gap="$2">
          <Text fontSize="$2" color="$textSecondary" fontWeight="600">
            Answer
          </Text>
          <Input
            value={answer}
            onChangeText={setAnswer}
            placeholder="Enter answer"
            multiline
            numberOfLines={3}
            padding="$3"
            backgroundColor="$background"
            borderColor={answer.trim() ? '$borderColor' : '$error'}
            borderWidth={1}
            borderRadius="$3"
          />
        </YStack>

        {error && (
          <Text fontSize="$2" color="$error">
            {error}
          </Text>
        )}

        <XStack gap="$2" justifyContent="flex-end">
          <Button size="$3" variant="outlined" onPress={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            size="$3"
            theme="purple"
            onPress={handleSave}
            disabled={!question.trim() || !answer.trim() || isSaving}
            opacity={!question.trim() || !answer.trim() || isSaving ? 0.5 : 1}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </XStack>
      </YStack>
    </Card>
  );
}

function ModuleDetailScreen({ moduleId, onBack, onNavigate, screens }) {
  const { user } = useAuth();

  const handleStartVoiceQuiz = useCallback(() => {
    if (onNavigate && screens?.VOICE_QUIZ) {
      onNavigate(screens.VOICE_QUIZ, moduleId);
    } else if (onNavigate) {
      onNavigate('voice_quiz', moduleId);
    }
  }, [onNavigate, screens, moduleId]);

  const handleStartImageQuiz = useCallback(() => {
    if (onNavigate && screens?.IMAGE_QUIZ) {
      onNavigate(screens.IMAGE_QUIZ, moduleId);
    } else if (onNavigate) {
      onNavigate('image_quiz', moduleId);
    }
  }, [onNavigate, screens, moduleId]);
  const [module, setModule] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedCardId, setExpandedCardId] = useState(null);
  const [editingCardId, setEditingCardId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);

  const fetchData = useCallback(async () => {
    if (!moduleId) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await moduleService.getModuleFlashcards(moduleId);
      if (result.success) {
        setModule(result.module);
        setFlashcards(result.flashcards || []);
      } else {
        throw new Error(result.error || 'Failed to load module');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [moduleId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggle = useCallback((cardId) => {
    setExpandedCardId((prev) => (prev === cardId ? null : cardId));
  }, []);

  const handleEdit = useCallback((cardId) => {
    setEditingCardId(cardId);
  }, []);

  const handleSaveEdit = useCallback(
    async (cardId, updates) => {
      try {
        await apiClient.patch(`/api/flashcards/${cardId}`, updates);
        setFlashcards((prev) =>
          prev.map((card) => (card.id === cardId ? { ...card, ...updates } : card))
        );
        setEditingCardId(null);
      } catch (err) {
        setError(err.message);
      }
    },
    []
  );

  const handleDelete = useCallback(
    async (cardId) => {
      if (deleteConfirmId !== cardId) {
        setDeleteConfirmId(cardId);
        return;
      }

      try {
        await apiClient.delete(`/api/flashcards/${cardId}`);
        setFlashcards((prev) => prev.filter((card) => card.id !== cardId));
        setDeleteConfirmId(null);
      } catch (err) {
        setError(err.message);
      }
    },
    [deleteConfirmId]
  );

  const handleCreateFlashcard = useCallback(
    async (data) => {
      const result = await apiClient.post('/api/flashcards', {
        userId: user.id,
        flashcards: [{ question: data.question, answer: data.answer }],
        moduleId,
      });

      if (result.success && result.flashcards && result.flashcards.length > 0) {
        setFlashcards((prev) => [...prev, ...result.flashcards]);
        setShowNewForm(false);
      } else {
        throw new Error(result.error || 'Failed to create flashcard');
      }
    },
    [user, moduleId]
  );

  const aggregateScore =
    flashcards.length > 0
      ? Math.round(flashcards.reduce((sum, card) => sum + (card.knowledgeScore || 0), 0) / flashcards.length)
      : 0;

  const scoreColor =
    aggregateScore >= 70 ? '$success' : aggregateScore >= 40 ? '$warning' : '$error';

  if (isLoading) {
    return (
      <YStack flex={1} padding="$4" backgroundColor="$background" alignItems="center" justifyContent="center">
        <Spinner size="large" color="$primary" />
        <Text marginTop="$4" color="$textSecondary">
          Loading module...
        </Text>
      </YStack>
    );
  }

  return (
    <YStack flex={1} padding="$4" backgroundColor="$background">
      {/* Header */}
      <XStack justifyContent="space-between" alignItems="center" marginBottom="$5" paddingBottom="$4" borderBottomWidth={1} borderBottomColor="$borderColor">
        <YStack flex={1}>
          <XStack gap="$3" alignItems="center">
            {module?.color && (
              <YStack
                width={36}
                height={36}
                borderRadius="$3"
                backgroundColor={module.color}
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize="$4" color="white" fontWeight="bold">
                  {(module.name || 'M').charAt(0).toUpperCase()}
                </Text>
              </YStack>
            )}
            <YStack>
              <Text fontSize="$6" fontWeight="bold" color="$textPrimary">
                {module?.name || 'Module'}
              </Text>
              <Text fontSize="$3" color="$textSecondary">
                {flashcards.length} card{flashcards.length !== 1 ? 's' : ''} | Score: {aggregateScore}%
              </Text>
            </YStack>
          </XStack>
        </YStack>
        <Button size="$3" variant="outlined" onPress={onBack}>
          Back
        </Button>
      </XStack>

      {/* Error Banner */}
      {error && (
        <Card backgroundColor="$errorBackground" borderColor="$error" borderWidth={1} padding="$3" marginBottom="$4">
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize="$3" color="$error" flex={1}>
              {error}
            </Text>
            <Button size="$2" variant="outlined" onPress={() => setError(null)}>
              Dismiss
            </Button>
          </XStack>
        </Card>
      )}

      {/* Aggregate Score Card */}
      <Card elevate padding="$4" marginBottom="$4" backgroundColor="$cardBackground" borderColor="$borderColor">
        <XStack justifyContent="space-between" alignItems="center">
          <YStack>
            <Text fontSize="$3" fontWeight="bold" color="$textPrimary">
              Module Knowledge Score
            </Text>
            <Text fontSize="$2" color="$textSecondary">
              Average across all flashcards
            </Text>
          </YStack>
          <XStack gap="$3" alignItems="center">
            <Button size="$2" theme="purple" onPress={() => setShowNewForm(true)}>
              + Add Card
            </Button>
            <XStack
              paddingHorizontal="$3"
              paddingVertical="$2"
              backgroundColor={scoreColor}
              borderRadius="$3"
            >
              <Text fontSize="$5" color="white" fontWeight="bold">
                {aggregateScore}%
              </Text>
            </XStack>
          </XStack>
        </XStack>
        <YStack marginTop="$3" height={8} backgroundColor="$backgroundHover" borderRadius="$round" overflow="hidden">
          <YStack
            height="100%"
            width={`${Math.min(aggregateScore, 100)}%`}
            backgroundColor={scoreColor}
            borderRadius="$round"
          />
        </YStack>
      </Card>

      {/* Flashcard List */}
      <ScrollView flex={1}>
        <YStack>
          {showNewForm && (
            <NewFlashcardForm
              moduleId={moduleId}
              userId={user?.id}
              onSave={handleCreateFlashcard}
              onCancel={() => setShowNewForm(false)}
            />
          )}
          {flashcards.length === 0 && !showNewForm ? (
            <Card padding="$8" backgroundColor="$backgroundHover" borderRadius="$4" alignItems="center">
              <YStack alignItems="center" gap="$3">
                <Text fontSize="$3" color="$textTertiary" textAlign="center">
                  No flashcards in this module yet.
                </Text>
                <Button size="$3" theme="purple" onPress={() => setShowNewForm(true)}>
                  Add Your First Card
                </Button>
              </YStack>
            </Card>
          ) : (
            flashcards.map((card) =>
              editingCardId === card.id ? (
                <FlashcardEditorModal
                  key={card.id}
                  flashcard={card}
                  onSave={handleSaveEdit}
                  onCancel={() => setEditingCardId(null)}
                />
              ) : (
                <FlashcardCard
                  key={card.id}
                  flashcard={card}
                  isExpanded={expandedCardId === card.id}
                  onToggle={handleToggle}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              )
            )
          )}
        </YStack>
      </ScrollView>

      {/* Bottom Actions */}
      <XStack gap="$3" paddingVertical="$3">
        <Button
          flex={1}
          size="$3"
          theme="purple"
          disabled={flashcards.length === 0}
          opacity={flashcards.length === 0 ? 0.5 : 1}
          onPress={handleStartVoiceQuiz}
        >
          Start Voice Quiz
        </Button>
        <Button
          flex={1}
          size="$3"
          theme="purple"
          disabled={flashcards.length === 0}
          opacity={flashcards.length === 0 ? 0.5 : 1}
          onPress={handleStartImageQuiz}
        >
          Start Image Quiz
        </Button>
      </XStack>
    </YStack>
  );
}

module.exports = ModuleDetailScreen;
