# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Premature Disconnect Shows Dialog
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to the concrete failing case — `onDisconnect` fires with `hasConnectedRef.current === false` and `userEndedRef.current === false`
  - Create `frontend/src/screens/__tests__/VoiceQuizScreen.disconnect.test.jsx` using Vitest + @testing-library/react
  - Mock `@elevenlabs/client` so `Conversation.startSession` returns a controllable `{ endSession, onConnect, onDisconnect }` object
  - Mount `VoiceQuizScreen` with a valid flashcard prop; capture the `onDisconnect` callback passed to `startSession`
  - For all combinations of `(userEnded: false)` with `hasConnected: false`, invoke `onDisconnect` directly and assert `showDisconnectDialog` is NOT rendered
  - Run test on UNFIXED code — **EXPECTED OUTCOME**: Test FAILS (dialog IS shown, confirming the bug)
  - Document the counterexample: `onDisconnect()` called before `onConnect` → dialog appears immediately
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.2, 1.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Genuine Unexpected Disconnect Still Shows Dialog
  - **IMPORTANT**: Follow observation-first methodology
  - Observe on UNFIXED code: when `onConnect` fires first (setting `isConnected = true`) and then `onDisconnect` fires with `userEndedRef.current === false`, the dialog IS shown
  - Observe on UNFIXED code: when `userEndedRef.current === true` and `onDisconnect` fires, the dialog is NOT shown
  - Add preservation tests to `frontend/src/screens/__tests__/VoiceQuizScreen.disconnect.test.jsx`
  - For all combinations of `(hasConnected: true, userEnded: false)` — fire `onConnect` then `onDisconnect` — assert `showDisconnectDialog` IS rendered (genuine disconnect preserved)
  - For all combinations of `(hasConnected: true, userEnded: true)` — fire `onConnect`, set userEnded, fire `onDisconnect` — assert dialog is NOT shown (intentional end preserved)
  - Run tests on UNFIXED code — **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 3. Fix premature disconnect dialog in VoiceQuizScreen

  - [x] 3.1 Implement the fix in `frontend/src/screens/VoiceQuizScreen.jsx`
    - Add `const hasConnectedRef = useRef(false)` alongside `userEndedRef` and `startedRef`
    - Inside the `onConnect` callback, add `hasConnectedRef.current = true` before `setIsConnected(true)`
    - Change the `onDisconnect` guard from `if (!userEndedRef.current)` to `if (hasConnectedRef.current && !userEndedRef.current)`
    - In the cleanup `useEffect` (the one with `conv.endSession()`), add `hasConnectedRef.current = false` so remounts start fresh
    - _Bug_Condition: isBugCondition(event) where hasConnectedRef.current === false AND userEndedRef.current === false_
    - _Expected_Behavior: onDisconnect fires before onConnect → showDisconnectDialog remains false, status does not surface 'disconnected' to user_
    - _Preservation: all onDisconnect invocations after onConnect has fired are unaffected; intentional ends, reconnects, and no-content errors unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Premature Disconnect Does Not Surface Dialog
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior: `onDisconnect` before `onConnect` must not show the dialog
    - Run `frontend/src/screens/__tests__/VoiceQuizScreen.disconnect.test.jsx` (Property 1 cases)
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Genuine Unexpected Disconnect Still Shows Dialog
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation cases in `frontend/src/screens/__tests__/VoiceQuizScreen.disconnect.test.jsx`
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions — genuine disconnects still show dialog, intentional ends still skip it)
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run the full test file: `cd frontend && npx vitest run src/screens/__tests__/VoiceQuizScreen.disconnect.test.jsx`
  - Ensure all Property 1 and Property 2 cases pass
  - Ask the user if any questions arise
