# Design Document: Voice Quiz Fix

## Overview

Four bugs make the Voice Quiz completely non-functional. This document describes the root cause of each bug and the precise code changes needed to fix them.

---

## Bug 1: Session start gated on secondary module fetch

### Root Cause

`VoiceQuizScreen` fetches the module object via `moduleService.getModuleFlashcards(moduleId)` on mount, then gates `startVoiceSession` on `module` being truthy:

```js
useEffect(() => {
  if (module && flashcard && !startedRef.current) {
    startVoiceSession()
  }
}, [module, flashcard, startVoiceSession])
```

If that fetch is slow or fails, `module` stays `null` and the session never starts — the user is stuck on a permanent connecting/loading state. The module name is already available from the parent via props (the caller navigates to this screen from `ModuleDetailScreen` which already has the module).

### Fix

Remove the `moduleService.getModuleFlashcards` fetch entirely. Accept `moduleName` as a prop alongside `moduleId`. Start the session as soon as `flashcard` is available, using `moduleName` directly.

**Props change:**
```js
// Before
export default function VoiceQuizScreen({ moduleId, flashcard, onBack })

// After
export default function VoiceQuizScreen({ moduleId, moduleName, flashcard, onBack })
```

**Session start trigger change:**
```js
// Before: gated on module object from secondary fetch
useEffect(() => {
  if (module && flashcard && !startedRef.current) {
    startVoiceSession()
  }
}, [module, flashcard, startVoiceSession])

// After: starts immediately when flashcard is available
useEffect(() => {
  if (flashcard && !startedRef.current) {
    startVoiceSession()
  }
}, [flashcard, startVoiceSession])
```

**Caller update** (`ModuleDetailScreen` or `App.jsx` — wherever `VoiceQuizScreen` is rendered): pass `moduleName` as a prop.

---

## Bug 2: Flashcard content field mismatch

### Root Cause

`VoiceQuizScreen` passes `flashcard.content` to the speech token endpoint and uses it in the ElevenLabs agent override prompt:

```js
const tokenResult = await apiClient.post('/api/quiz/speech-token', {
  content: flashcard.content,   // ← undefined if flashcard has no .content
  moduleName: module?.name || 'Quiz'
})
// ...
prompt: `You are a quiz tutor. Quiz the student on this flashcard: ${flashcard.content}.`
//                                                                    ^^^^^^^^^^^^^^^^ undefined
```

Flashcards in Firestore use a single `content` field (raw OCR text). This is already correct — `flashcard.content` is the right field. However, the `bugfix.md` analysis was written when flashcards still had `question`/`answer` fields. Since the data model has since been updated to use `content`, this bug is now about ensuring the prompt is well-formed even when `content` is present.

The real issue is the prompt construction: if `content` is an empty string or whitespace, the agent gets a useless prompt. The fix is to add a guard and a fallback.

### Fix

Add a content guard before starting the session, and ensure the prompt is always meaningful:

```js
// Guard: don't start if content is missing
if (!flashcard?.content?.trim()) {
  setError('This flashcard has no content to quiz on.')
  setIsConnecting(false)
  startedRef.current = false
  return
}

// Prompt using content field (already correct field name)
prompt: `You are a friendly quiz tutor. Quiz the student on the following flashcard content. Ask questions about it, evaluate their answers, and give helpful feedback.\n\nFlashcard content:\n${flashcard.content.trim()}`
```

---

## Bug 3: No quiz session created — knowledge scores never updated

### Root Cause

`VoiceQuizScreen` never calls `POST /api/quiz/start` or any quiz engine endpoint. The ElevenLabs conversation runs entirely client-side with no Firestore session, so knowledge scores are never updated and no session summary is produced.

### Fix

After the ElevenLabs connection is established (`onConnect`), create a quiz session via the quiz engine:

```js
onConnect: async () => {
  setIsConnected(true)
  setIsConnecting(false)
  setStatus('connected')

  // Create quiz session for score tracking
  try {
    const sessionResult = await quizService.startSession(userId, moduleId, 'voice', 1)
    if (sessionResult.success) {
      sessionIdRef.current = sessionResult.sessionId
    }
  } catch (e) {
    console.warn('Could not create quiz session:', e.message)
    // Non-fatal: voice quiz continues without score tracking
  }
}
```

When the session ends (either via `endVoiceSession` or `onDisconnect`), end the session and navigate to the results screen:

```js
const endVoiceSession = useCallback(async () => {
  if (conversationRef.current) {
    await conversationRef.current.endSession()
    conversationRef.current = null
  }

  if (sessionIdRef.current) {
    try {
      await quizService.endSession(sessionIdRef.current)
      const summary = await quizService.getSessionSummary(sessionIdRef.current)
      if (summary.success) {
        onComplete(summary)  // navigate to QuizResultsScreen
        return
      }
    } catch (e) {
      console.warn('Could not fetch session summary:', e.message)
    }
  }

  startedRef.current = false
  onBack()
}, [onBack, onComplete, moduleId])
```

**Props change:** add `userId` and `onComplete` props:
```js
export default function VoiceQuizScreen({ moduleId, moduleName, flashcard, userId, onBack, onComplete })
```

`onComplete(summary)` navigates to `QuizResultsScreen` with the session summary. If no session was created (non-fatal fallback), `onBack()` is called instead.

---

## Bug 4: WebSocket disconnect silently navigates away

### Root Cause

The `onDisconnect` callback calls `onBack()` immediately:

```js
onDisconnect: () => {
  setIsConnected(false)
  setStatus('disconnected')
  onBack()   // ← immediate navigation, no warning, no summary
},
```

This fires on any disconnect — including unexpected drops mid-session — giving the user no chance to resume or see a summary.

### Fix

On disconnect, set a `disconnected` state and show a dialog offering "Resume" or "End Session":

```js
onDisconnect: () => {
  setIsConnected(false)
  setStatus('disconnected')
  // Only auto-navigate if the user explicitly ended the session
  if (!userEndedRef.current) {
    setShowDisconnectDialog(true)
  }
},
```

Add a `userEndedRef` that is set to `true` before calling `endSession()` explicitly, so intentional ends still navigate away cleanly.

**Disconnect dialog UI:**
```jsx
{showDisconnectDialog && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <Card className="max-w-sm w-full">
      <CardContent className="pt-6 pb-6 text-center">
        <div className="text-4xl mb-3">📡</div>
        <h3 className="text-lg font-bold text-text-primary mb-2">Disconnected</h3>
        <p className="text-text-secondary text-sm mb-5">
          The voice connection was lost. Would you like to reconnect or end the session?
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={handleEndAfterDisconnect}>
            End Session
          </Button>
          <Button className="flex-1" onClick={handleReconnect}>
            Reconnect
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
)}
```

`handleReconnect` resets `startedRef.current = false` and calls `startVoiceSession()` again.  
`handleEndAfterDisconnect` calls the same end-session logic as the "End" button.

---

## Summary of Changes

| File | Change |
|------|--------|
| `frontend/src/screens/VoiceQuizScreen.jsx` | Fix all 4 bugs: remove module fetch, add content guard, create quiz session on connect, add disconnect dialog |
| `frontend/src/App.jsx` (or caller) | Pass `moduleName` and `userId` props to `VoiceQuizScreen`; handle `onComplete` to navigate to results |

No backend changes are required. The `speech-token` route and quiz engine endpoints are already correct.

---

## Correctness Properties

### Property 1: Session starts without secondary fetch

*For any* `VoiceQuizScreen` render where `flashcard` is non-null and `flashcard.content` is non-empty, the voice session SHALL start without waiting for any additional network request.

**Validates: Bug 1 fix**

### Property 2: Content guard prevents undefined prompt

*For any* flashcard where `content` is empty or undefined, the voice session SHALL NOT start and SHALL display an error message to the user.

**Validates: Bug 2 fix**

### Property 3: Quiz session created on connect

*For any* successful ElevenLabs connection, a quiz session SHALL be created via `POST /api/quiz/start` and the returned `sessionId` SHALL be stored for use when the session ends.

**Validates: Bug 3 fix**

### Property 4: Disconnect does not silently navigate

*For any* unexpected WebSocket disconnect (i.e., not triggered by the user pressing "End"), the system SHALL display a disconnect dialog and SHALL NOT navigate away without user confirmation.

**Validates: Bug 4 fix**

### Property 5: Intentional end navigates cleanly

*For any* user-initiated session end (pressing "End" button), the system SHALL end the ElevenLabs session, end the quiz session, and navigate to the results screen (or back if no session was created), WITHOUT showing the disconnect dialog.

**Validates: Bug 4 fix — regression prevention**
