# Bugfix Requirements Document

## Introduction

The Voice Quiz feature is non-functional. When a user taps "Voice Quiz" on a flashcard, the ElevenLabs conversational agent receives an empty/undefined prompt (because the flashcard's `content` field does not exist — flashcards use `question` and `answer` fields), the quiz session is never registered with the quiz engine so knowledge scores are never updated, and any disconnection from ElevenLabs immediately navigates the user away without warning or a session summary. Together these issues make the Voice Quiz completely broken from the user's perspective.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user starts a Voice Quiz for a flashcard THEN the system sends `undefined` as the flashcard content to ElevenLabs because `flashcard.content` does not exist (flashcards have `question` and `answer` fields, not `content`)

1.2 WHEN a Voice Quiz session runs THEN the system does not create a quiz session via the quiz engine, so no knowledge scores are recorded and no session summary is produced

1.3 WHEN the ElevenLabs WebSocket disconnects for any reason (including normal end-of-conversation) THEN the system immediately navigates the user back to the module screen without confirmation or a summary

1.4 WHEN the module data fetch is slow or fails THEN the system never starts the voice session because session start is gated on the module object being truthy, leaving the user on a permanent loading/connecting state

### Expected Behavior (Correct)

2.1 WHEN a user starts a Voice Quiz for a flashcard THEN the system SHALL construct the ElevenLabs agent prompt using the flashcard's `question` and `answer` fields so the agent has valid content to quiz the user on

2.2 WHEN a Voice Quiz session starts THEN the system SHALL create a quiz session via the quiz engine and update the flashcard's knowledge score based on the conversation outcome

2.3 WHEN the ElevenLabs WebSocket disconnects THEN the system SHALL display a disconnect notification and offer the user the option to resume or end the session, rather than silently navigating away

2.4 WHEN the module name is needed for the speech token request THEN the system SHALL use the module name already available from the navigation context (passed as a prop) rather than re-fetching it, so the session can start immediately without depending on a secondary fetch

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user ends the Voice Quiz by pressing the "End" button THEN the system SHALL CONTINUE TO navigate back to the module screen

3.2 WHEN the ElevenLabs API key or agent ID is missing THEN the system SHALL CONTINUE TO return a descriptive error and display it to the user

3.3 WHEN microphone permission is denied THEN the system SHALL CONTINUE TO display an error and allow the user to retry

3.4 WHEN a Voice Quiz session is active THEN the system SHALL CONTINUE TO display the real-time conversation transcript in the UI

3.5 WHEN the speech token endpoint is called THEN the system SHALL CONTINUE TO return a signed ElevenLabs WebSocket URL
