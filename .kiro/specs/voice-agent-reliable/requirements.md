# Requirements Document

## Introduction

The Voice Agent Reliable feature enables users to have interactive voice conversations with an AI tutor about flashcard content using the ElevenLabs Conversational AI SDK. This feature provides a hands-free, conversational learning experience while maintaining robust connection management, proper resource cleanup, and resilience to React development mode behaviors.

## Glossary

- **Voice_Agent**: The ElevenLabs Conversational AI system that conducts voice-based quizzing
- **Connection_Manager**: The React component responsible for managing WebSocket lifecycle
- **Session_Tracker**: The quiz session tracking system that records user progress
- **Disconnect_Handler**: The component that manages unexpected connection interruptions
- **StrictMode**: React's development mode that intentionally double-invokes effects to detect side effects
- **WebSocket_Client**: The ElevenLabs SDK WebSocket connection to the conversational AI service
- **Signed_URL**: A time-limited, authenticated URL provided by the backend for secure WebSocket connections
- **Conversation_Transcript**: Real-time display of messages exchanged between user and AI agent

## Requirements

### Requirement 1: WebSocket Connection Establishment

**User Story:** As a user, I want to connect to the voice agent, so that I can have interactive voice conversations about my flashcards.

#### Acceptance Criteria

1. WHEN the user navigates to the voice quiz screen, THE Connection_Manager SHALL request microphone permissions
2. WHEN microphone permissions are granted, THE Connection_Manager SHALL fetch a Signed_URL from the backend API endpoint /api/quiz/speech-token
3. WHEN a valid Signed_URL is received, THE Connection_Manager SHALL establish a WebSocket connection using the ElevenLabs SDK
4. WHEN the WebSocket connection is established, THE Connection_Manager SHALL transition status from "connecting" to "connected"
5. WHEN the connection fails, THE Connection_Manager SHALL display an error message with retry option

### Requirement 2: Connection Status Display

**User Story:** As a user, I want to see the current connection status, so that I understand whether the voice agent is ready to interact.

#### Acceptance Criteria

1. THE Connection_Manager SHALL display one of four status states: idle, connecting, connected, or disconnected
2. WHEN status is "idle", THE Connection_Manager SHALL display a microphone icon with neutral styling
3. WHEN status is "connecting", THE Connection_Manager SHALL display an hourglass icon with pulsing animation
4. WHEN status is "connected", THE Connection_Manager SHALL display a microphone icon with success styling
5. WHEN status is "disconnected", THE Connection_Manager SHALL display appropriate disconnection UI

### Requirement 3: Real-Time Conversation Transcript

**User Story:** As a user, I want to see a transcript of my conversation with the AI agent, so that I can review what was discussed.

#### Acceptance Criteria

1. WHEN a message is received from the Voice_Agent, THE Conversation_Transcript SHALL append the message with "Agent:" prefix
2. WHEN a message is sent by the user, THE Conversation_Transcript SHALL append the message with "You:" prefix
3. THE Conversation_Transcript SHALL display messages in chronological order with visual distinction between user and agent messages
4. WHEN the transcript exceeds the display area, THE Conversation_Transcript SHALL provide scrolling functionality
5. THE Conversation_Transcript SHALL update in real-time as messages are exchanged

### Requirement 4: Unexpected Disconnect Handling

**User Story:** As a user, I want to be notified when my connection drops unexpectedly, so that I can choose to reconnect or end the session.

#### Acceptance Criteria

1. WHEN the WebSocket connection drops unexpectedly, THE Disconnect_Handler SHALL detect the disconnection
2. IF the status was "connected" before disconnection, THEN THE Disconnect_Handler SHALL display a reconnect dialog
3. IF the status was "connecting" or "idle" before disconnection, THEN THE Disconnect_Handler SHALL NOT display a reconnect dialog
4. THE reconnect dialog SHALL provide two options: "Reconnect" and "End Session"
5. WHEN the user selects "Reconnect", THE Connection_Manager SHALL reload the page to establish a fresh connection
6. WHEN the user selects "End Session", THE Session_Tracker SHALL finalize the quiz session and navigate to results

### Requirement 5: Intentional Session Termination

**User Story:** As a user, I want to end my voice quiz session when I'm finished, so that I can review my results and return to the dashboard.

#### Acceptance Criteria

1. WHEN the user is connected, THE Connection_Manager SHALL display an "End" button
2. WHEN the user clicks "End", THE Connection_Manager SHALL call the ElevenLabs SDK endSession method
3. WHEN endSession completes, THE Session_Tracker SHALL finalize the quiz session in the backend
4. WHEN the quiz session is finalized, THE Connection_Manager SHALL fetch the session summary
5. WHEN the session summary is available, THE Connection_Manager SHALL navigate to the quiz results screen

### Requirement 6: Quiz Session Integration

**User Story:** As a user, I want my voice quiz activity tracked, so that my learning progress is recorded in the system.

#### Acceptance Criteria

1. WHEN the WebSocket connection is established, THE Session_Tracker SHALL create a quiz session via the backend API
2. THE Session_Tracker SHALL store the session ID for subsequent operations
3. IF session creation fails, THE Connection_Manager SHALL log a warning but continue the voice session
4. WHEN the user ends the session, THE Session_Tracker SHALL call the backend API to finalize the session
5. WHEN the session is finalized, THE Session_Tracker SHALL retrieve the session summary including scores and statistics

### Requirement 7: React StrictMode Resilience

**User Story:** As a developer, I want the voice agent to work correctly in React StrictMode, so that development and production behaviors are consistent.

#### Acceptance Criteria

1. WHEN React StrictMode double-invokes the connection effect, THE Connection_Manager SHALL prevent duplicate WebSocket connections
2. THE Connection_Manager SHALL use a mounted flag to track component lifecycle state
3. WHEN the component unmounts during connection establishment, THE Connection_Manager SHALL abandon the connection without calling endSession
4. WHEN the component unmounts after connection is established, THE Connection_Manager SHALL NOT call endSession to avoid WebSocket errors
5. THE Connection_Manager SHALL clean up all references and state on unmount without triggering WebSocket closure errors

### Requirement 8: Resource Cleanup

**User Story:** As a developer, I want proper resource cleanup, so that there are no memory leaks or WebSocket errors in the console.

#### Acceptance Criteria

1. WHEN the component unmounts, THE Connection_Manager SHALL set the mounted flag to false
2. WHEN the component unmounts, THE Connection_Manager SHALL clear all conversation references
3. WHEN the component unmounts, THE Connection_Manager SHALL clear all session ID references
4. WHEN the component unmounts, THE Connection_Manager SHALL reset the intentional end flag
5. THE Connection_Manager SHALL NOT call WebSocket endSession on unmount to prevent "WebSocket already CLOSING" errors

### Requirement 9: Error Handling and User Feedback

**User Story:** As a user, I want clear error messages when something goes wrong, so that I understand what happened and what I can do about it.

#### Acceptance Criteria

1. WHEN microphone permissions are denied, THE Connection_Manager SHALL display an error message explaining the permission requirement
2. WHEN the backend API fails to provide a Signed_URL, THE Connection_Manager SHALL display an error message with retry option
3. WHEN the WebSocket connection fails, THE Connection_Manager SHALL display an error message with retry option
4. WHEN a flashcard has no content, THE Connection_Manager SHALL display an error message and prevent connection attempts
5. THE Connection_Manager SHALL provide a "Return" button on all error screens to navigate back to the previous screen

### Requirement 10: ElevenLabs SDK Integration

**User Story:** As a developer, I want to follow ElevenLabs SDK best practices, so that the integration is reliable and maintainable.

#### Acceptance Criteria

1. THE Connection_Manager SHALL use the Conversation.startSession method with signed URL authentication
2. THE Connection_Manager SHALL configure the agent prompt with flashcard content for contextual quizzing
3. THE Connection_Manager SHALL implement onConnect callback to handle successful connection
4. THE Connection_Manager SHALL implement onDisconnect callback to handle connection termination
5. THE Connection_Manager SHALL implement onMessage callback to capture conversation transcript
6. THE Connection_Manager SHALL implement onError callback to handle connection errors
7. THE Connection_Manager SHALL use dynamic import for the ElevenLabs SDK to optimize bundle size

