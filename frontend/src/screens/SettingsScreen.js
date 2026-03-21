/**
 * Settings Screen
 *
 * Allows users to view their profile information and manage preferences
 * including quiz type, speech rate, and theme.
 */

const React = require('react');
const { useState, useCallback } = React;
const { YStack, XStack, Text, Button, Card, ScrollView, Slider } = require('@tamagui/core');
const useAuth = require('../hooks/useAuth');

function SettingsScreen({ onBack }) {
  const { user, logout, updatePreferences } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [error, setError] = useState(null);

  // Local preference state (initialized from user prefs)
  const [quizType, setQuizType] = useState(user?.preferences?.quizType || 'voice');
  const [speechRate, setSpeechRate] = useState(user?.preferences?.speechRate || 1.0);
  const [theme, setTheme] = useState(user?.preferences?.theme || 'light');

  const handleSavePreferences = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      await updatePreferences({
        quizType,
        speechRate,
        theme,
      });
      setSaveMessage('Preferences saved successfully!');
    } catch (err) {
      setError(err.message || 'Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  }, [quizType, speechRate, theme, updatePreferences]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch (err) {
      setError(err.message);
    }
  }, [logout]);

  const speechRateLabel =
    speechRate <= 0.5 ? 'Slow' :
    speechRate >= 1.5 ? 'Fast' :
    speechRate >= 0.8 && speechRate <= 1.2 ? 'Normal' :
    `${speechRate.toFixed(1)}x`;

  return (
    <YStack flex={1} padding="$4" backgroundColor="$background">
      {/* Header */}
      <XStack justifyContent="space-between" alignItems="center" marginBottom="$5" paddingBottom="$4" borderBottomWidth={1} borderBottomColor="$borderColor">
        <YStack>
          <Text fontSize="$6" fontWeight="bold" color="$textPrimary">
            Settings
          </Text>
          <Text fontSize="$3" color="$textSecondary">
            Manage your account and preferences
          </Text>
        </YStack>
        <Button size="$3" variant="outlined" onPress={onBack} aria-label="Go back">
          Back
        </Button>
      </XStack>

      <ScrollView flex={1}>
        <YStack gap="$4">
          {/* Profile Card */}
          <Card elevate padding="$4" backgroundColor="$cardBackground" borderColor="$borderColor">
            <YStack gap="$3">
              <Text fontSize="$4" fontWeight="bold" color="$textPrimary">
                Profile
              </Text>
              <YStack gap="$2">
                <XStack justifyContent="space-between" alignItems="center">
                  <Text fontSize="$2" color="$textSecondary">Name</Text>
                  <Text fontSize="$3" color="$textPrimary" fontWeight="600">{user?.name || 'User'}</Text>
                </XStack>
                <XStack justifyContent="space-between" alignItems="center">
                  <Text fontSize="$2" color="$textSecondary">Email</Text>
                  <Text fontSize="$3" color="$textPrimary">{user?.email || 'N/A'}</Text>
                </XStack>
              </YStack>
            </YStack>
          </Card>

          {/* Quiz Preferences Card */}
          <Card elevate padding="$4" backgroundColor="$cardBackground" borderColor="$borderColor">
            <YStack gap="$4">
              <Text fontSize="$4" fontWeight="bold" color="$textPrimary">
                Quiz Preferences
              </Text>

              {/* Quiz Type Selection */}
              <YStack gap="$2">
                <Text fontSize="$3" color="$textSecondary" fontWeight="600">
                  Default Quiz Type
                </Text>
                <XStack gap="$2">
                  {[
                    { key: 'voice', label: 'Voice' },
                    { key: 'image', label: 'Image' },
                    { key: 'mixed', label: 'Mixed' },
                  ].map((option) => (
                    <Button
                      key={option.key}
                      size="$3"
                      variant={quizType === option.key ? 'solid' : 'outlined'}
                      theme={quizType === option.key ? 'purple' : undefined}
                      flex={1}
                      onPress={() => setQuizType(option.key)}
                      aria-label={`Select ${option.label} quiz type`}
                    >
                      {option.label}
                    </Button>
                  ))}
                </XStack>
              </YStack>

              {/* Speech Rate */}
              <YStack gap="$2">
                <XStack justifyContent="space-between" alignItems="center">
                  <Text fontSize="$3" color="$textSecondary" fontWeight="600">
                    Speech Rate
                  </Text>
                  <Text fontSize="$2" color="$primary" fontWeight="bold">
                    {speechRateLabel}
                  </Text>
                </XStack>
                <Slider
                  defaultValue={[speechRate]}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  onValueChange={(values) => setSpeechRate(values[0])}
                  aria-label="Speech rate slider"
                >
                  <Slider.Track backgroundColor="$borderColor">
                    <Slider.TrackActive backgroundColor="$primary" />
                  </Slider.Track>
                  <Slider.Thumb index={0} size="$3" circular backgroundColor="$primary" />
                </Slider>
                <XStack justifyContent="space-between">
                  <Text fontSize="$1" color="$textTertiary">0.5x</Text>
                  <Text fontSize="$1" color="$textTertiary">2.0x</Text>
                </XStack>
              </YStack>
            </YStack>
          </Card>

          {/* Theme Preferences Card */}
          <Card elevate padding="$4" backgroundColor="$cardBackground" borderColor="$borderColor">
            <YStack gap="$3">
              <Text fontSize="$4" fontWeight="bold" color="$textPrimary">
                Appearance
              </Text>
              <XStack gap="$2">
                {[
                  { key: 'light', label: 'Light' },
                  { key: 'dark', label: 'Dark' },
                ].map((option) => (
                  <Button
                    key={option.key}
                    size="$3"
                    variant={theme === option.key ? 'solid' : 'outlined'}
                    theme={theme === option.key ? 'purple' : undefined}
                    flex={1}
                    onPress={() => setTheme(option.key)}
                    aria-label={`Select ${option.label} theme`}
                  >
                    {option.label} Mode
                  </Button>
                ))}
              </XStack>
            </YStack>
          </Card>

          {/* Error / Success Messages */}
          {error && (
            <Card backgroundColor="$errorBackground" borderColor="$error" borderWidth={1} padding="$3" role="alert">
              <Text fontSize="$3" color="$error">{error}</Text>
            </Card>
          )}
          {saveMessage && (
            <Card backgroundColor="$successBackground" borderColor="$success" borderWidth={1} padding="$3">
              <Text fontSize="$3" color="$success">{saveMessage}</Text>
            </Card>
          )}

          {/* Save Preferences Button */}
          <Button
            theme="purple"
            size="$4"
            onPress={handleSavePreferences}
            disabled={isSaving}
            opacity={isSaving ? 0.5 : 1}
            aria-label="Save preferences"
          >
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </Button>

          {/* Sign Out */}
          <Button
            size="$4"
            variant="outlined"
            borderColor="$error"
            color="$error"
            onPress={handleLogout}
            aria-label="Sign out"
          >
            Sign Out
          </Button>
        </YStack>
      </ScrollView>
    </YStack>
  );
}

module.exports = SettingsScreen;
