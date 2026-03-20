/**
 * Dashboard Screen
 *
 * Displays user modules with flashcard counts and aggregate knowledge scores.
 * Provides navigation to module details, image upload, and quiz features.
 */

const React = require('react');
const { useState, useEffect, useCallback } = React;
const { YStack, XStack, Text, Button, Card, Spinner, ScrollView } = require('@tamagui/core');
const useAuth = require('../hooks/useAuth');
const moduleService = require('../services/moduleService');

function ModuleCard({ module, onPress }) {
  const scoreColor =
    module.aggregateKnowledgeScore >= 70
      ? '$success'
      : module.aggregateKnowledgeScore >= 40
        ? '$warning'
        : '$error';

  return (
    <Card
      elevate
      padding="$4"
      marginBottom="$3"
      backgroundColor="$cardBackground"
      borderColor="$borderColor"
      pressStyle={{ borderColor: '$primary', backgroundColor: '$purple1' }}
      onPress={() => onPress(module)}
      cursor="pointer"
    >
      <YStack gap="$3">
        <XStack justifyContent="space-between" alignItems="center">
          <XStack gap="$3" alignItems="center" flex={1}>
            <YStack
              width={40}
              height={40}
              borderRadius="$3"
              backgroundColor={module.color || '$primary'}
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize="$4" color="white" fontWeight="bold">
                {(module.name || 'M').charAt(0).toUpperCase()}
              </Text>
            </YStack>
            <YStack flex={1}>
              <Text fontSize="$4" fontWeight="bold" color="$textPrimary" numberOfLines={1}>
                {module.name}
              </Text>
              <Text fontSize="$2" color="$textSecondary">
                {module.flashcardCount || 0} card{(module.flashcardCount || 0) !== 1 ? 's' : ''}
              </Text>
            </YStack>
          </XStack>
          <YStack alignItems="flex-end" gap="$1">
            <Text fontSize="$2" color="$textSecondary">
              Score
            </Text>
            <XStack
              paddingHorizontal="$2"
              paddingVertical="$1"
              backgroundColor={scoreColor}
              borderRadius="$2"
            >
              <Text fontSize="$3" color="white" fontWeight="bold">
                {module.aggregateKnowledgeScore || 0}%
              </Text>
            </XStack>
          </YStack>
        </XStack>

        {/* Progress bar */}
        <YStack
          height={6}
          backgroundColor="$backgroundHover"
          borderRadius="$round"
          overflow="hidden"
        >
          <YStack
            height="100%"
            width={`${Math.min(module.aggregateKnowledgeScore || 0, 100)}%`}
            backgroundColor={scoreColor}
            borderRadius="$round"
          />
        </YStack>
      </YStack>
    </Card>
  );
}

function DashboardScreen({ onNavigate, screens }) {
  const { user, logout } = useAuth();
  const [modules, setModules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchModules = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await moduleService.getModules(user.id);
      if (result.success) {
        setModules(result.modules || []);
      } else {
        throw new Error(result.error || 'Failed to load modules');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  const handleModulePress = useCallback(
    (module) => {
      if (onNavigate) {
        onNavigate(screens?.MODULE_DETAIL || 'module_detail', module.id);
      }
    },
    [onNavigate, screens]
  );

  return (
    <YStack flex={1} padding="$4" backgroundColor="$background">
      {/* Header */}
      <XStack justifyContent="space-between" alignItems="center" marginBottom="$5" paddingBottom="$4" borderBottomWidth={1} borderBottomColor="$borderColor">
        <YStack>
          <Text fontSize="$6" fontWeight="bold" color="$textPrimary">
            Dashboard
          </Text>
          <Text fontSize="$3" color="$textSecondary">
            Welcome, {user?.name || 'User'}
          </Text>
        </YStack>
        <Button size="$3" variant="outlined" onPress={logout} borderColor="$borderColor">
          Sign Out
        </Button>
      </XStack>

      {/* Error Banner */}
      {error && (
        <Card backgroundColor="$errorBackground" borderColor="$error" borderWidth={1} padding="$3" marginBottom="$4">
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize="$3" color="$error" flex={1}>
              {error}
            </Text>
            <Button size="$2" variant="outlined" onPress={fetchModules}>
              Retry
            </Button>
          </XStack>
        </Card>
      )}

      {/* Overall Knowledge Summary */}
      {modules.length > 0 && (() => {
        const totalCards = modules.reduce((sum, m) => sum + (m.flashcardCount || 0), 0);
        const totalScore = modules.reduce((sum, m) => sum + (m.aggregateKnowledgeScore || 0) * (m.flashcardCount || 0), 0);
        const overallAvg = totalCards > 0 ? Math.round(totalScore / totalCards) : 0;
        const overallColor = overallAvg >= 70 ? '$success' : overallAvg >= 40 ? '$warning' : '$error';

        return (
          <Card elevate padding="$4" marginBottom="$4" backgroundColor="$cardBackground" borderColor="$borderColor">
            <YStack gap="$3">
              <Text fontSize="$4" fontWeight="bold" color="$textPrimary">
                Knowledge Overview
              </Text>
              <XStack justifyContent="space-between" alignItems="center">
                <YStack alignItems="center" gap="$1" flex={1}>
                  <Text fontSize="$6" fontWeight="bold" color="$textPrimary">
                    {totalCards}
                  </Text>
                  <Text fontSize="$2" color="$textSecondary">
                    Total Cards
                  </Text>
                </YStack>
                <YStack alignItems="center" gap="$1" flex={1}>
                  <Text fontSize="$6" fontWeight="bold" color={overallColor}>
                    {overallAvg}%
                  </Text>
                  <Text fontSize="$2" color="$textSecondary">
                    Avg Score
                  </Text>
                </YStack>
                <YStack alignItems="center" gap="$1" flex={1}>
                  <Text fontSize="$6" fontWeight="bold" color="$primary">
                    {modules.length}
                  </Text>
                  <Text fontSize="$2" color="$textSecondary">
                    Modules
                  </Text>
                </YStack>
              </XStack>
              <YStack height={8} backgroundColor="$backgroundHover" borderRadius="$round" overflow="hidden">
                <YStack
                  height="100%"
                  width={`${Math.min(overallAvg, 100)}%`}
                  backgroundColor={overallColor}
                  borderRadius="$round"
                />
              </YStack>
            </YStack>
          </Card>
        );
      })()}

      {/* Modules Section */}
      <ScrollView flex={1}>
        <YStack gap="$4">
          <Card elevate padding="$5" backgroundColor="$cardBackground" borderColor="$borderColor">
            <YStack gap="$3">
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$5" fontWeight="bold" color="$textPrimary">
                  My Modules
                </Text>
                <XStack gap="$2">
                  <Button
                    theme="purple"
                    size="$3"
                    onPress={() => onNavigate && onNavigate(screens?.UPLOAD_IMAGE || 'upload_image')}
                  >
                    Upload Image
                  </Button>
                </XStack>
              </XStack>

              {isLoading ? (
                <YStack padding="$8" alignItems="center" justifyContent="center">
                  <Spinner size="large" color="$primary" />
                  <Text marginTop="$3" fontSize="$3" color="$textSecondary">
                    Loading modules...
                  </Text>
                </YStack>
              ) : modules.length === 0 ? (
                <YStack
                  padding="$8"
                  alignItems="center"
                  justifyContent="center"
                  backgroundColor="$backgroundHover"
                  borderRadius="$4"
                >
                  <Text fontSize="$3" color="$textTertiary" textAlign="center">
                    No modules yet. Upload an image of your notes to get started!
                  </Text>
                </YStack>
              ) : (
                <YStack>
                  {modules.map((mod) => (
                    <ModuleCard key={mod.id} module={mod} onPress={handleModulePress} />
                  ))}
                </YStack>
              )}
            </YStack>
          </Card>

          {/* Quick Actions */}
          <Card elevate padding="$5" backgroundColor="$cardBackground" borderColor="$borderColor">
            <YStack gap="$3">
              <Text fontSize="$5" fontWeight="bold" color="$textPrimary">
                Quick Actions
              </Text>
              <XStack gap="$3" flexWrap="wrap">
                <Button theme="purple" size="$3" flex={1} minWidth={140}>
                  Start Voice Quiz
                </Button>
                <Button theme="purple" size="$3" flex={1} minWidth={140}>
                  Start Image Quiz
                </Button>
              </XStack>
            </YStack>
          </Card>
        </YStack>
      </ScrollView>
    </YStack>
  );
}

module.exports = DashboardScreen;
