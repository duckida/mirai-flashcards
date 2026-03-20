/**
 * Upload Image Screen
 *
 * Allows users to upload images of notes/documents for AI-powered
 * flashcard extraction. Shows upload progress, extracted flashcards
 * preview, and confirm/edit/cancel workflow.
 */

const React = require('react');
const { useState, useRef, useCallback } = React;
const { YStack, XStack, Text, Button, Card, Spinner, Input, ScrollView } = require('@tamagui/core');
const useAuth = require('../hooks/useAuth');
const flashcardService = require('../services/flashcardService');

// Upload states
const STATES = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  SCANNING: 'scanning',
  PREVIEW: 'preview',
  SAVING: 'saving',
  SUCCESS: 'success',
  ERROR: 'error',
};

function FlashcardPreviewCard({ flashcard, index, onEdit, onRemove }) {
  const [isEditing, setIsEditing] = useState(false);
  const [question, setQuestion] = useState(flashcard.question);
  const [answer, setAnswer] = useState(flashcard.answer);

  const handleSave = () => {
    if (!question.trim() || !answer.trim()) {
      return;
    }
    onEdit(index, { ...flashcard, question: question.trim(), answer: answer.trim() });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setQuestion(flashcard.question);
    setAnswer(flashcard.answer);
    setIsEditing(false);
  };

  const confidenceColor =
    flashcard.confidence >= 0.8
      ? '$success'
      : flashcard.confidence >= 0.5
        ? '$warning'
        : '$error';

  if (isEditing) {
    return (
      <Card elevate padding="$4" marginBottom="$3" backgroundColor="$cardBackground" borderColor="$primary">
        <YStack gap="$3">
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize="$3" fontWeight="bold" color="$primary">
              Editing Card {index + 1}
            </Text>
          </XStack>

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

          {(!question.trim() || !answer.trim()) && (
            <Text fontSize="$2" color="$error">
              Question and answer cannot be empty
            </Text>
          )}

          <XStack gap="$2" justifyContent="flex-end">
            <Button size="$3" variant="outlined" onPress={handleCancel}>
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

  return (
    <Card elevate padding="$4" marginBottom="$3" backgroundColor="$cardBackground" borderColor="$borderColor">
      <YStack gap="$3">
        <XStack justifyContent="space-between" alignItems="center">
          <XStack gap="$2" alignItems="center">
            <Text fontSize="$3" fontWeight="bold" color="$textPrimary">
              Card {index + 1}
            </Text>
            <XStack
              paddingHorizontal="$2"
              paddingVertical="$1"
              backgroundColor={confidenceColor}
              borderRadius="$2"
            >
              <Text fontSize="$1" color="white" fontWeight="600">
                {Math.round((flashcard.confidence || 0) * 100)}%
              </Text>
            </XStack>
          </XStack>
          <XStack gap="$2">
            <Button size="$2" variant="outlined" onPress={() => setIsEditing(true)}>
              Edit
            </Button>
            <Button size="$2" variant="outlined" borderColor="$error" color="$error" onPress={() => onRemove(index)}>
              Remove
            </Button>
          </XStack>
        </XStack>

        <YStack gap="$1">
          <Text fontSize="$2" color="$textSecondary" fontWeight="600">
            Question
          </Text>
          <Text fontSize="$3" color="$textPrimary">
            {flashcard.question}
          </Text>
        </YStack>

        <YStack gap="$1">
          <Text fontSize="$2" color="$textSecondary" fontWeight="600">
            Answer
          </Text>
          <Text fontSize="$3" color="$textPrimary">
            {flashcard.answer}
          </Text>
        </YStack>
      </YStack>
    </Card>
  );
}

function UploadImageScreen({ onBack, onSuccess }) {
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [state, setState] = useState(STATES.IDLE);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  const handleFileSelect = useCallback((file) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Unsupported format. Please upload a JPEG, PNG, or WEBP image.');
      return;
    }

    // Validate file size (20MB)
    if (file.size > 20 * 1024 * 1024) {
      setError('File too large. Maximum size is 20MB.');
      return;
    }

    setError(null);
    setSelectedFile(file);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleUploadAndScan = useCallback(async () => {
    if (!selectedFile || !user?.id) return;

    setError(null);
    setState(STATES.UPLOADING);
    setUploadProgress(0);

    try {
      const result = await flashcardService.uploadAndScan(
        selectedFile,
        user.id,
        0.5,
        (progress) => {
          setUploadProgress(progress);
          if (progress >= 100) {
            setState(STATES.SCANNING);
          }
        }
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to process image');
      }

      const extracted = result.scan?.flashcards || [];
      if (extracted.length === 0) {
        throw new Error('No flashcards could be extracted from this image. Try a clearer image with visible text.');
      }

      setFlashcards(extracted);
      setState(STATES.PREVIEW);
    } catch (err) {
      setError(err.message);
      setState(STATES.ERROR);
    }
  }, [selectedFile, user]);

  const handleEditFlashcard = useCallback((index, updatedCard) => {
    setFlashcards((prev) => {
      const copy = [...prev];
      copy[index] = updatedCard;
      return copy;
    });
  }, []);

  const handleRemoveFlashcard = useCallback((index) => {
    setFlashcards((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!user?.id || flashcards.length === 0) return;

    setError(null);
    setState(STATES.SAVING);

    try {
      const result = await flashcardService.saveFlashcards(
        user.id,
        flashcards.map((card) => ({
          question: card.question,
          answer: card.answer,
          sourceImageUrl: card.sourceImageUrl || '',
          confidence: card.confidence || 0,
        }))
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to save flashcards');
      }

      const moduleInfo = result.moduleAssignments
        ?.map((m) => `${m.moduleName} (${m.flashcardCount} cards)`)
        .join(', ');

      setSaveMessage(`${flashcards.length} flashcard${flashcards.length > 1 ? 's' : ''} saved! ${moduleInfo ? `Added to: ${moduleInfo}` : ''}`);
      setState(STATES.SUCCESS);
    } catch (err) {
      setError(err.message);
      setState(STATES.ERROR);
    }
  }, [user, flashcards]);

  const handleReset = useCallback(() => {
    setState(STATES.IDLE);
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFlashcards([]);
    setError(null);
    setUploadProgress(0);
    setSaveMessage(null);
  }, [previewUrl]);

  const handleRetry = useCallback(() => {
    setError(null);
    setState(STATES.IDLE);
  }, []);

  return (
    <YStack flex={1} padding="$4" backgroundColor="$background">
      {/* Header */}
      <XStack justifyContent="space-between" alignItems="center" marginBottom="$5">
        <YStack>
          <Text fontSize="$6" fontWeight="bold" color="$textPrimary">
            Upload Image
          </Text>
          <Text fontSize="$3" color="$textSecondary">
            Scan your notes into flashcards
          </Text>
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
            <Button size="$2" variant="outlined" onPress={state === STATES.ERROR ? handleRetry : () => setError(null)}>
              {state === STATES.ERROR ? 'Retry' : 'Dismiss'}
            </Button>
          </XStack>
        </Card>
      )}

      {/* Success Banner */}
      {state === STATES.SUCCESS && saveMessage && (
        <Card backgroundColor="$successBackground" borderColor="$success" borderWidth={1} padding="$4" marginBottom="$4">
          <YStack gap="$3" alignItems="center">
            <Text fontSize="$4" fontWeight="bold" color="$success">
              Flashcards Saved!
            </Text>
            <Text fontSize="$3" color="$textPrimary" textAlign="center">
              {saveMessage}
            </Text>
            <XStack gap="$3">
              <Button theme="purple" size="$3" onPress={handleReset}>
                Upload Another
              </Button>
              <Button size="$3" variant="outlined" onPress={onSuccess}>
                Go to Dashboard
              </Button>
            </XStack>
          </YStack>
        </Card>
      )}

      {/* Idle State - Image Picker */}
      {(state === STATES.IDLE || state === STATES.ERROR) && (
        <YStack gap="$4">
          {/* Drop Zone */}
          <YStack
            borderWidth={2}
            borderStyle="dashed"
            borderColor={isDragging ? '$primary' : '$borderColor'}
            borderRadius="$5"
            padding="$8"
            alignItems="center"
            justifyContent="center"
            backgroundColor={isDragging ? '$purple1' : '$backgroundHover'}
            minHeight={250}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onPress={() => fileInputRef.current?.click()}
            cursor="pointer"
            hoverStyle={{ borderColor: '$primary', backgroundColor: '$purple1' }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleInputChange}
              style={{ display: 'none' }}
            />

            {previewUrl ? (
              <YStack gap="$3" alignItems="center" width="100%">
                <img
                  src={previewUrl}
                  alt="Preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: 200,
                    borderRadius: 12,
                    objectFit: 'contain',
                  }}
                />
                <Text fontSize="$2" color="$textSecondary">
                  {selectedFile?.name} ({(selectedFile?.size / 1024 / 1024).toFixed(2)} MB)
                </Text>
              </YStack>
            ) : (
              <YStack gap="$3" alignItems="center">
                <Text fontSize="$8" color="$textTertiary">
                  +
                </Text>
                <Text fontSize="$4" fontWeight="bold" color="$textPrimary">
                  Drop image here or click to browse
                </Text>
                <Text fontSize="$2" color="$textSecondary">
                  Supports JPEG, PNG, WEBP up to 20MB
                </Text>
              </YStack>
            )}
          </YStack>

          {/* Scan Button */}
          {selectedFile && (
            <Button theme="purple" size="$4" onPress={handleUploadAndScan} width="100%">
              Scan Image for Flashcards
            </Button>
          )}
        </YStack>
      )}

      {/* Uploading / Scanning State */}
      {(state === STATES.UPLOADING || state === STATES.SCANNING) && (
        <YStack gap="$4" alignItems="center" padding="$8">
          <Spinner size="large" color="$primary" />
          <Text fontSize="$4" fontWeight="bold" color="$textPrimary">
            {state === STATES.UPLOADING ? 'Uploading image...' : 'Scanning for flashcards...'}
          </Text>

          {state === STATES.UPLOADING && (
            <YStack width="100%" gap="$2">
              <YStack
                height={8}
                backgroundColor="$backgroundHover"
                borderRadius="$round"
                overflow="hidden"
              >
                <YStack
                  height="100%"
                  width={`${uploadProgress}%`}
                  backgroundColor="$primary"
                  borderRadius="$round"
                />
              </YStack>
              <Text fontSize="$2" color="$textSecondary" textAlign="center">
                {uploadProgress}%
              </Text>
            </YStack>
          )}

          {state === STATES.SCANNING && (
            <Text fontSize="$3" color="$textSecondary" textAlign="center">
              AI is reading your notes and extracting flashcards. This may take a moment...
            </Text>
          )}
        </YStack>
      )}

      {/* Saving State */}
      {state === STATES.SAVING && (
        <YStack gap="$4" alignItems="center" padding="$8">
          <Spinner size="large" color="$primary" />
          <Text fontSize="$4" fontWeight="bold" color="$textPrimary">
            Saving flashcards...
          </Text>
          <Text fontSize="$3" color="$textSecondary">
            Classifying into modules and saving to your account
          </Text>
        </YStack>
      )}

      {/* Preview State - Extracted Flashcards */}
      {state === STATES.PREVIEW && (
        <ScrollView flex={1}>
          <YStack gap="$4">
            {/* Summary */}
            <Card backgroundColor="$purple1" borderColor="$primary" borderWidth={1} padding="$4">
              <XStack justifyContent="space-between" alignItems="center">
                <YStack>
                  <Text fontSize="$4" fontWeight="bold" color="$primary">
                    {flashcards.length} Flashcard{flashcards.length !== 1 ? 's' : ''} Extracted
                  </Text>
                  <Text fontSize="$2" color="$textSecondary">
                    Review, edit, or remove cards before saving
                  </Text>
                </YStack>
              </XStack>
            </Card>

            {/* Flashcard List */}
            {flashcards.map((card, index) => (
              <FlashcardPreviewCard
                key={index}
                flashcard={card}
                index={index}
                onEdit={handleEditFlashcard}
                onRemove={handleRemoveFlashcard}
              />
            ))}

            {flashcards.length === 0 && (
              <Card padding="$6" backgroundColor="$backgroundHover" borderRadius="$4">
                <Text fontSize="$3" color="$textTertiary" textAlign="center">
                  All flashcards have been removed. Go back to upload a new image.
                </Text>
              </Card>
            )}

            {/* Action Buttons */}
            <XStack gap="$3" paddingVertical="$4">
              <Button
                flex={1}
                size="$4"
                variant="outlined"
                onPress={handleReset}
              >
                Cancel
              </Button>
              <Button
                flex={1}
                size="$4"
                theme="purple"
                onPress={handleConfirm}
                disabled={flashcards.length === 0}
                opacity={flashcards.length === 0 ? 0.5 : 1}
              >
                Save {flashcards.length} Card{flashcards.length !== 1 ? 's' : ''}
              </Button>
            </XStack>
          </YStack>
        </ScrollView>
      )}
    </YStack>
  );
}

module.exports = UploadImageScreen;
