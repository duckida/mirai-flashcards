/**
 * Flashcard Form Component
 *
 * Reusable form for creating or editing flashcards.
 * Handles question/answer input with validation.
 * Used in ModuleDetailScreen and UploadImageScreen.
 */

const React = require('react');
const { useState, useCallback, useEffect } = React;
const { YStack, XStack, Text, Button, Input, Card } = require('@tamagui/core');

function FlashcardForm({
  mode = 'create', // 'create' | 'edit'
  initialQuestion = '',
  initialAnswer = '',
  onSave,
  onCancel,
  isSaving = false,
}) {
  const [question, setQuestion] = useState(initialQuestion);
  const [answer, setAnswer] = useState(initialAnswer);
  const [validationError, setValidationError] = useState(null);

  // Update local state when props change (for edit mode)
  useEffect(() => {
    setQuestion(initialQuestion);
    setAnswer(initialAnswer);
  }, [initialQuestion, initialAnswer]);

  const handleSave = useCallback(() => {
    if (!question.trim()) {
      setValidationError('Question cannot be empty');
      return;
    }
    if (!answer.trim()) {
      setValidationError('Answer cannot be empty');
      return;
    }
    setValidationError(null);
    onSave({ question: question.trim(), answer: answer.trim() });
  }, [question, answer, onSave]);

  const handleCancel = useCallback(() => {
    setQuestion(initialQuestion);
    setAnswer(initialAnswer);
    setValidationError(null);
    if (onCancel) onCancel();
  }, [initialQuestion, initialAnswer, onCancel]);

  return (
    <Card
      elevate
      padding="$4"
      backgroundColor="$cardBackground"
      borderColor="$borderColor"
    >
      <YStack gap="$3">
        <Text fontSize="$3" fontWeight="bold" color="$textPrimary">
          {mode === 'create' ? 'New Flashcard' : 'Edit Flashcard'}
        </Text>

        {/* Question Input */}
        <YStack gap="$1">
          <Text fontSize="$2" color="$textSecondary" fontWeight="600">
            Question
          </Text>
          <Input
            value={question}
            onChangeText={setQuestion}
            placeholder="Enter the question..."
            disabled={isSaving}
            padding="$3"
            fontSize="$3"
            backgroundColor="$background"
            borderColor={validationError && !question.trim() ? '$error' : '$borderColor'}
            borderWidth={1}
            borderRadius="$3"
            aria-label="Flashcard question"
          />
        </YStack>

        {/* Answer Input */}
        <YStack gap="$1">
          <Text fontSize="$2" color="$textSecondary" fontWeight="600">
            Answer
          </Text>
          <Input
            value={answer}
            onChangeText={setAnswer}
            placeholder="Enter the answer..."
            disabled={isSaving}
            padding="$3"
            fontSize="$3"
            backgroundColor="$background"
            borderColor={validationError && !answer.trim() ? '$error' : '$borderColor'}
            borderWidth={1}
            borderRadius="$3"
            aria-label="Flashcard answer"
          />
        </YStack>

        {/* Validation Error */}
        {validationError && (
          <Text fontSize="$2" color="$error" role="alert">
            {validationError}
          </Text>
        )}

        {/* Action Buttons */}
        <XStack gap="$3" justifyContent="flex-end">
          {onCancel && (
            <Button
              size="$3"
              variant="outlined"
              onPress={handleCancel}
              disabled={isSaving}
              aria-label="Cancel"
            >
              Cancel
            </Button>
          )}
          <Button
            size="$3"
            theme="purple"
            onPress={handleSave}
            disabled={isSaving}
            opacity={isSaving ? 0.5 : 1}
            aria-label={mode === 'create' ? 'Save flashcard' : 'Update flashcard'}
          >
            {isSaving ? 'Saving...' : mode === 'create' ? 'Add' : 'Save'}
          </Button>
        </XStack>
      </YStack>
    </Card>
  );
}

module.exports = FlashcardForm;
