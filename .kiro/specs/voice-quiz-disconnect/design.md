# Voice Quiz Disconnect Bugfix Design

## Overview

The `VoiceQuizScreen` component incorrectly shows the "Disconnected" dialog immediately on mount
under React StrictMode. StrictMode deliberately double-invokes effects (mount → cleanup → remount)
to surface side-effect bugs. The cleanup `useEffect` calls `conv.endSession()` on a WebSocket that
is still in the CONNECTING state, which causes the ElevenLabs SDK to fire `onDisconnect`. Because
`userEndedRef.current` is `false` at that point, the disconnect dialog is shown before any real
session has been established.

The fix introduces a `hasConnectedRef` boolean that is set to `true` only inside `onConnect`. The
`onDisconnect` handler is updated to gate the dialog on `hasConnectedRef.current === true`, so a
premature disconnect during the CONNECTING phase is silently ignored.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — `onDisconnect` fires while
  `hasConnectedRef.current === false` (i.e., before `onConnect` has ever fired for this mount)
- **Property (P)**: The desired behavior — when C holds, the disconnect dialog must NOT be shown
  and `status` must NOT be set to `'disconnected'` in a way visible to the user
- **Preservation**: Existing behavior for genuine unexpected disconnects, intentional ends,
  reconnects, and no-content errors that must remain unchanged by the fix
- **hasConnectedRef**: A new `useRef(false)` that is set to `true` inside `onConnect` and reset
  to `false` on cleanup, tracking whether a real connection was ever established this mount
- **startedRef**: Existing ref that prevents double-invocation of `startVoiceSession`
- **userEndedRef**: Existing ref that distinguishes intentional ends from unexpected disconnects
- **VoiceQuizScreen**: The component in `frontend/src/screens/VoiceQuizScreen.jsx` that manages
  the ElevenLabs WebSocket voice session lifecycle

## Bug Details

### Bug Condition

The bug manifests when `onDisconnect` fires before `onConnect` has ever fired for the current
component mount. This happens because the cleanup `useEffect` calls `conv.endSession()` on a
WebSocket that is still in the CONNECTING state — most commonly triggered by React StrictMode's
deliberate double-invocation of effects.

**Formal Specification:**
```
FUNCTION isBugCondition(event)
  INPUT: event — an onDisconnect callback invocation
  OUTPUT: boolean

  RETURN hasConnectedRef.current === false
         AND userEndedRef.current === false
         AND showDisconnectDialog is set to true
END FUNCTION
```

### Examples

- **StrictMode double-invoke**: Component mounts → `startVoiceSession` scheduled via `setTimeout(0)`
  → StrictMode runs cleanup → cleanup calls `conv.endSession()` on CONNECTING socket → `onDisconnect`
  fires → dialog shown. Expected: dialog NOT shown.
- **Rapid navigation**: User navigates to VoiceQuizScreen then immediately back before `onConnect`
  fires → cleanup calls `endSession()` → `onDisconnect` fires → dialog shown on next visit.
  Expected: dialog NOT shown.
- **Normal connect then network drop**: `onConnect` fires (sets `hasConnectedRef = true`) → network
  drops → `onDisconnect` fires → dialog shown. Expected: dialog IS shown (preserved behavior).
- **Edge case — no content**: `flashcard.content` is empty → `startVoiceSession` returns early with
  error, no WebSocket created → no `onDisconnect` possible. Expected: error UI shown (unchanged).

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- A fully-established session interrupted by a network error or server-side close must still show
  the unexpected-disconnect dialog
- Clicking "End" or "End Quiz" must still call `endSession()`, skip the dialog, and navigate to
  results
- Clicking "Reconnect" in the dialog after a genuine disconnect must still reset state and restart
  the session
- A flashcard with no content must still show the "no content" error without attempting a connection

**Scope:**
All `onDisconnect` invocations that occur AFTER `onConnect` has fired at least once for the current
mount are unaffected by this fix. This includes:
- Network-level disconnects mid-session
- Server-side session termination
- Any disconnect following a successful `onConnect`

## Hypothesized Root Cause

1. **Missing "has connected" guard in `onDisconnect`**: The handler only checks `userEndedRef` to
   decide whether to show the dialog. It has no awareness of whether a real connection was ever
   established. Adding `hasConnectedRef` closes this gap.

2. **`endSession()` called unconditionally in cleanup**: The cleanup `useEffect` calls
   `conv.endSession()` whenever `conversationRef.current` is set, regardless of the WebSocket's
   readyState. Under StrictMode the socket may still be CONNECTING when cleanup runs.

3. **`setTimeout(0)` defer is insufficient**: The defer prevents `startVoiceSession` from running
   during the StrictMode cleanup pass (via the `cancelled` flag), but if `Conversation.startSession`
   resolves quickly the conversation object can be assigned to `conversationRef.current` before the
   cleanup `useEffect` teardown runs, leaving a CONNECTING socket exposed to `endSession()`.

4. **No reset of `hasConnectedRef` on cleanup**: Without resetting the ref on unmount, a remount
   after a genuine disconnect could incorrectly inherit `true` from the previous mount.

## Correctness Properties

Property 1: Bug Condition - Premature Disconnect Does Not Surface Dialog

_For any_ `onDisconnect` invocation where `hasConnectedRef.current` is `false` (i.e., `onConnect`
has not yet fired for this mount), the fixed `VoiceQuizScreen` SHALL NOT set
`showDisconnectDialog` to `true` and SHALL NOT set `status` to `'disconnected'` in a way visible
to the user before a session has been established.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Genuine Unexpected Disconnect Still Shows Dialog

_For any_ `onDisconnect` invocation where `hasConnectedRef.current` is `true` and
`userEndedRef.current` is `false`, the fixed `VoiceQuizScreen` SHALL set
`showDisconnectDialog` to `true` and `status` to `'disconnected'`, preserving the existing
unexpected-disconnect recovery flow.

**Validates: Requirements 3.1, 3.3**

## Fix Implementation

### Changes Required

**File**: `frontend/src/screens/VoiceQuizScreen.jsx`

**Function**: `VoiceQuizScreen` (component body + `startVoiceSession` callback + cleanup `useEffect`)

**Specific Changes**:

1. **Add `hasConnectedRef`**: Declare `const hasConnectedRef = useRef(false)` alongside the other
   refs. This ref tracks whether `onConnect` has fired at least once for the current mount.

2. **Set `hasConnectedRef` in `onConnect`**: Inside the `onConnect` callback passed to
   `Conversation.startSession`, add `hasConnectedRef.current = true` before any state updates.

3. **Gate `onDisconnect` on `hasConnectedRef`**: Change the `onDisconnect` handler from:
   ```js
   if (!userEndedRef.current) {
     setShowDisconnectDialog(true)
   }
   ```
   to:
   ```js
   if (hasConnectedRef.current && !userEndedRef.current) {
     setShowDisconnectDialog(true)
   }
   ```
   The `setIsConnected(false)` and `setStatus('disconnected')` calls can remain — they are
   harmless when the session never connected (status was already `'idle'` or `'connecting'`).
   Alternatively, also gate those behind `hasConnectedRef.current` to keep UI state clean.

4. **Reset `hasConnectedRef` in cleanup `useEffect`**: In the teardown `useEffect` (the one with
   `return () => { ... }`), add `hasConnectedRef.current = false` so that a remount starts fresh.

5. **No change to `endSession()` call in cleanup**: The existing `try/catch` around
   `conv.endSession()` already swallows the CLOSING/CLOSED error. The real fix is in step 3 — the
   dialog guard — so the `endSession()` call can remain as-is for proper resource cleanup.

## Testing Strategy

### Validation Approach

Two-phase approach: first run exploratory tests on the UNFIXED code to surface counterexamples and
confirm the root cause, then verify the fix satisfies both correctness properties.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or
refute the root cause analysis.

**Test Plan**: Simulate the StrictMode double-invoke sequence by manually calling the `onDisconnect`
callback with `hasConnectedRef.current === false` and asserting that `showDisconnectDialog` becomes
`true` on unfixed code (confirming the bug) and `false` on fixed code (confirming the fix).

**Test Cases**:
1. **StrictMode simulation**: Mount component, fire `onDisconnect` before `onConnect` — assert
   dialog is shown on unfixed code (will fail after fix is applied)
2. **Rapid unmount**: Mount, immediately unmount before `onConnect`, remount — assert dialog is
   not shown on remount
3. **CONNECTING socket cleanup**: Mock `conv` with a CONNECTING-state socket, run cleanup, assert
   `onDisconnect` does not surface the dialog
4. **Edge case — onDisconnect fires with no conv object**: Ensure no crash when
   `conversationRef.current` is null

**Expected Counterexamples**:
- On unfixed code: `showDisconnectDialog` is `true` immediately after mount under StrictMode
- Root cause confirmed: `onDisconnect` fires without `hasConnectedRef` guard

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed component does not
show the disconnect dialog.

**Pseudocode:**
```
FOR ALL event WHERE isBugCondition(event) DO
  result := onDisconnect_fixed(event)
  ASSERT showDisconnectDialog === false
  ASSERT status !== 'disconnected' (or status change is invisible to user)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed component
produces the same behavior as the original.

**Pseudocode:**
```
FOR ALL event WHERE NOT isBugCondition(event) DO
  ASSERT onDisconnect_original(event) produces same dialog/state as onDisconnect_fixed(event)
END FOR
```

**Testing Approach**: Property-based testing is well-suited here because:
- It generates many combinations of `(hasConnectedRef, userEndedRef, disconnectEvent)` automatically
- It catches edge cases like rapid connect/disconnect cycles
- It provides strong guarantees that the dialog logic is unchanged for all non-buggy inputs

**Test Cases**:
1. **Genuine disconnect preservation**: Set `hasConnectedRef = true`, fire `onDisconnect` with
   `userEndedRef = false` — assert dialog IS shown (unchanged behavior)
2. **Intentional end preservation**: Call `endVoiceSession` — assert `userEndedRef = true`,
   dialog NOT shown, `finalizeSession` called
3. **Reconnect preservation**: Show dialog, call `handleReconnect` — assert `startedRef` reset
   and `startVoiceSession` called
4. **No-content preservation**: Pass flashcard with empty content — assert error state set,
   no WebSocket created

### Unit Tests

- Test `onDisconnect` with `hasConnectedRef = false` → dialog not shown
- Test `onDisconnect` with `hasConnectedRef = true`, `userEndedRef = false` → dialog shown
- Test `onDisconnect` with `hasConnectedRef = true`, `userEndedRef = true` → dialog not shown
- Test cleanup resets `hasConnectedRef` to `false`
- Test `onConnect` sets `hasConnectedRef` to `true`

### Property-Based Tests

- Generate random sequences of `(onConnect fired: boolean, userEnded: boolean)` and verify
  `showDisconnectDialog` is `true` iff `hasConnectedRef && !userEndedRef`
- Generate random mount/unmount/remount sequences and verify the dialog is never shown before
  `onConnect` has fired at least once in the current mount
- Generate random non-buggy inputs (hasConnectedRef = true) and verify dialog behavior is
  identical between original and fixed `onDisconnect`

### Integration Tests

- Render `VoiceQuizScreen` inside `React.StrictMode` with a mocked ElevenLabs `Conversation` —
  assert dialog is not shown after the StrictMode double-invoke cycle
- Render component, simulate successful connect then network drop — assert dialog IS shown
- Render component, simulate successful connect then user clicks "End" — assert dialog NOT shown
  and navigation occurs
