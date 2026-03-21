# Tasks: Voice Quiz Fix

## Task 1: Write bug condition exploration property test

- [x] 1.1 In `frontend/src/screens/VoiceQuizScreen.test.jsx` (create file), write a property-based test using fast-check that verifies the bug condition: given a flashcard with a non-empty `content` field and a valid `moduleName` prop, the component currently gates session start on a secondary module fetch (i.e., `startVoiceSession` is NOT called immediately on mount). This test should FAIL on the current code, confirming the bug exists.

## Task 2: Fix Bug 1 — Remove secondary module fetch, accept moduleName prop

- [x] 2.1 In `frontend/src/screens/VoiceQuizScreen.jsx`, remove the `moduleService.getModuleFlashcards` fetch and the `module` state variable entirely
- [x] 2.2 Add `moduleName` as a prop: `export default function VoiceQuizScreen({ moduleId, moduleName, flashcard, onBack })`
- [x] 2.3 Replace all `module?.name` references with the `moduleName` prop directly
- [x] 2.4 Change the session-start `useEffect` to trigger on `flashcard` alone (remove `module` dependency): `if (flashcard && !startedRef.current)`
- [x] 2.5 In `frontend/src/App.jsx`, add `selectedModuleName` state; update `navigateTo` to accept and store a `moduleName` argument; pass `moduleName={selectedModuleName}` to `VoiceQuizScreen`
- [x] 2.6 In `frontend/src/screens/ModuleDetailScreen.jsx`, update the `onVoiceQuiz` call to pass `module?.name` as the fourth argument: `onNavigate?.('voice_quiz', moduleId, card, module?.name)`
- [x] 2.7 In `frontend/src/App.jsx`, update `navigateTo` signature to `(screen, moduleId, flashcard, moduleName)` and store `moduleName` in state

## Task 3: Fix Bug 2 — Add content guard before starting session

- [x] 3.1 In `startVoiceSession` in `VoiceQuizScreen.jsx`, add a guard at the top: if `!flashcard?.content?.trim()`, set error `'This flashcard has no content to quiz on.'`, reset `isConnecting` and `startedRef`, and return early
- [x] 3.2 Update the ElevenLabs agent override prompt to use the trimmed content: `You are a friendly quiz tutor. Quiz the student on the following flashcard content. Ask questions about it, evaluate their answers, and give helpful feedback.\n\nFlashcard content:\n${flashcard.content.trim()}`
- [x] 3.3 Update the `apiClient.post('/api/quiz/speech-token', ...)` call to pass `moduleName` from props instead of `module?.name`

## Task 4: Fix Bug 3 — Create quiz session on connect, end session and show results

- [x] 4.1 Add `userId` and `onComplete` props to `VoiceQuizScreen`: `{ moduleId, moduleName, flashcard, userId, onBack, onComplete }`
- [x] 4.2 Add `sessionIdRef = useRef(null)` to track the created quiz session ID
- [x] 4.3 Import `quizService` from `@/services/quizService`
- [x] 4.4 In the `onConnect` callback, after setting connected state, call `quizService.startSession(userId, moduleId, 'voice', 1)` and store the returned `sessionId` in `sessionIdRef.current` (wrap in try/catch — non-fatal)
- [x] 4.5 Update `endVoiceSession` to: end the ElevenLabs session, then if `sessionIdRef.current` exists call `quizService.endSession` and `quizService.getSessionSummary`, then call `onComplete(summary)` if successful, otherwise fall back to `onBack()`
- [x] 4.6 In `frontend/src/App.jsx`, pass `userId={user?.id}` and `onComplete={(summary) => navigateTo(SCREENS.QUIZ_RESULTS, selectedModuleId, null, null, summary)}` to `VoiceQuizScreen`; add `QUIZ_RESULTS` screen case if not already present

## Task 5: Fix Bug 4 — Disconnect dialog instead of silent navigation

- [x] 5.1 Add `showDisconnectDialog` state (default `false`) and `userEndedRef = useRef(false)` to `VoiceQuizScreen`
- [x] 5.2 Update `onDisconnect` callback: set `isConnected(false)`, set `status('disconnected')`, and only call `setShowDisconnectDialog(true)` if `!userEndedRef.current`
- [x] 5.3 In `endVoiceSession`, set `userEndedRef.current = true` before calling `conversationRef.current.endSession()`
- [x] 5.4 Add `handleReconnect` function: reset `showDisconnectDialog(false)`, reset `startedRef.current = false`, call `startVoiceSession()`
- [x] 5.5 Add `handleEndAfterDisconnect` function: runs the same end-session + navigate logic as `endVoiceSession` but without calling `conversationRef.current.endSession()` (already disconnected)
- [x] 5.6 Render the disconnect dialog overlay in JSX when `showDisconnectDialog` is true, using `Card`/`CardContent`/`Button` shadcn/ui components with "Reconnect" and "End Session" options

## Task 6: Verify property tests pass after fixes

- [x] 6.1 Run the property test from Task 1 and confirm it now passes (session starts immediately without secondary fetch)
- [x] 6.2 Verify that a flashcard with empty `content` shows an error and does not start the session
- [x] 6.3 Verify that pressing "End" navigates cleanly without showing the disconnect dialog
