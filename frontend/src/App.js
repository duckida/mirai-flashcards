import React from 'react'
import { TamaguiProvider, YStack, Text, Button } from '@tamagui/core'
import tamaguiConfig from '../tamagui.config'

export default function App() {
  return (
    <TamaguiProvider config={tamaguiConfig}>
      <YStack flex={1} alignItems="center" justifyContent="center" padding="$4">
        <Text fontSize="$8" fontWeight="bold" marginBottom="$4">
          AI Flashcard Quizzer
        </Text>
        <Button theme="purple" size="$4">
          Get Started
        </Button>
      </YStack>
    </TamaguiProvider>
  )
}
