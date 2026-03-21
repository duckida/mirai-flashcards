# Bugfix Requirements Document

## Introduction

When a user opens the Voice Quiz screen, it immediately shows a "disconnected" status and the disconnect dialog appears before any conversation has started. The browser console logs `"WebSocket is already in CLOSING or CLOSED state."` This happens because the cleanup function of the `useEffect` in `VoiceQuizScreen` calls `conv.endSession()` on a WebSocket that was torn down mid-handshake — most commonly triggered by React StrictMode's deliberate double-invocation of effects (mount → cleanup → remount), or by a rapid unmount/remount during navigation. The `onDisconnect` callback fires as a result, setting `status` to `'disconnected'` and surfacing the unexpected-disconnect dialog to the user.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the VoiceQuizScreen mounts under React StrictMode THEN the system calls `conv.endSession()` during the StrictMode cleanup pass on a WebSocket that is still in the CONNECTING state, causing the error `"WebSocket is already in CLOSING or CLOSED state."`

1.2 WHEN the WebSocket is closed mid-handshake by the cleanup function THEN the system fires the `onDisconnect` callback, setting `isConnected` to `false` and `status` to `'disconnected'` before the session was ever active

1.3 WHEN `onDisconnect` fires and `userEndedRef.current` is `false` (which it always is at this point) THEN the system displays the unexpected-disconnect dialog immediately upon screen open

### Expected Behavior (Correct)

2.1 WHEN the VoiceQuizScreen mounts and the ElevenLabs WebSocket is still in the CONNECTING state during a cleanup pass THEN the system SHALL skip calling `endSession()` and shall not trigger the `onDisconnect` handler in a way that surfaces the disconnect dialog

2.2 WHEN the cleanup function runs before a session has successfully connected THEN the system SHALL abort the in-progress connection attempt without treating it as an unexpected disconnect

2.3 WHEN the VoiceQuizScreen opens under React StrictMode THEN the system SHALL display "Connecting..." status and SHALL NOT show the disconnect dialog before a connection has been established

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a fully-established voice session is interrupted by a network error or server-side close THEN the system SHALL CONTINUE TO fire `onDisconnect`, set `status` to `'disconnected'`, and show the unexpected-disconnect dialog

3.2 WHEN the user clicks "End" or "End Quiz" to intentionally close the session THEN the system SHALL CONTINUE TO call `endSession()`, skip the disconnect dialog, and navigate to the results screen

3.3 WHEN the user clicks "Reconnect" in the disconnect dialog after a genuine unexpected disconnect THEN the system SHALL CONTINUE TO reset state and restart the voice session

3.4 WHEN the flashcard has no content THEN the system SHALL CONTINUE TO show the "no content" error without attempting a connection
