# Requirements Document

## Introduction

This feature adds Gemini 2.5 Flash Native Audio as an alternative voice provider for voice-based quizzes, alongside the existing ElevenLabs integration. Firebase Remote Config will dynamically control which provider is used, enabling A/B testing, gradual rollouts, and runtime switching without code deployments. The voice quiz experience must remain consistent regardless of the provider selected.

## Glossary

- **Voice_Provider**: The service used for speech synthesis and recognition (ElevenLabs or Gemini)
- **Remote_Config**: Firebase Remote Config service that stores and delivers configuration values
- **Voice_Adapter**: An abstraction layer that provides a unified interface for different voice providers
- **ElevenLabs_Provider**: The existing voice provider using ElevenLabs Agent API
- **Gemini_Provider**: The new voice provider using Gemini 2.5 Flash Native Audio
- **VoiceQuizScreen**: The React component that renders the voice quiz interface
- **Signed_URL**: A time-limited authenticated URL for establishing WebSocket connections
- **Fallback_Provider**: The provider to use when the primary provider fails
- **Provider_Config**: Configuration object containing provider selection and parameters

## Requirements

### Requirement 1: Gemini Voice Provider Integration

**User Story:** As a developer, I want to integrate Gemini 2.5 Flash Native Audio, so that the app can use it as an alternative voice provider for quizzes.

#### Acceptance Criteria

1. THE Gemini_Provider SHALL support speech synthesis for quiz questions
2. THE Gemini_Provider SHALL support speech recognition for user answers
3. WHEN a voice quiz session starts with Gemini, THE Gemini_Provider SHALL establish a WebSocket connection
4. WHEN the Gemini connection is established, THE Gemini_Provider SHALL send the quiz context to initialize the conversation
5. THE Gemini_Provider SHALL provide the same interface methods as ElevenLabs_Provider (startSession, endSession, sendMessage, setMicMuted)
6. WHEN Gemini_Provider receives audio input, THE System SHALL transcribe it and return the text
7. WHEN Gemini_Provider generates a response, THE System SHALL synthesize speech and stream it to the client

### Requirement 2: Firebase Remote Config Integration

**User Story:** As a product manager, I want to control voice provider selection via Firebase Remote Config, so that I can switch providers or run A/B tests without deploying code.

#### Acceptance Criteria

1. THE Remote_Config SHALL store a configuration parameter named "voice_provider_selection"
2. THE Remote_Config SHALL support values: "elevenlabs", "gemini", or "auto"
3. WHEN the backend starts, THE System SHALL initialize Firebase Remote Config client
4. WHEN a voice quiz session is requested, THE System SHALL fetch the current provider configuration from Remote_Config
5. THE Remote_Config SHALL support percentage-based rollouts (e.g., 20% Gemini, 80% ElevenLabs)
6. THE Remote_Config SHALL support user-targeting rules (e.g., by user ID, region, or custom attributes)
7. THE Remote_Config SHALL cache configuration values with a configurable TTL (default 1 hour)
8. WHEN Remote_Config fetch fails, THE System SHALL use the cached value or default to ElevenLabs

### Requirement 3: Voice Provider Abstraction Layer

**User Story:** As a developer, I want a unified interface for voice providers, so that VoiceQuizScreen works seamlessly with either provider.

#### Acceptance Criteria

1. THE Voice_Adapter SHALL provide a factory method that returns the appropriate provider based on Remote_Config
2. THE Voice_Adapter SHALL expose a consistent interface: getSignedUrl(), startSession(), endSession(), sendMessage(), setMicMuted()
3. WHEN VoiceQuizScreen requests a voice session, THE Voice_Adapter SHALL select the provider based on Remote_Config
4. THE Voice_Adapter SHALL normalize provider-specific responses into a common format
5. THE Voice_Adapter SHALL emit standardized events: "connect", "disconnect", "message", "error", "status-change", "mode-change"
6. WHEN a provider method is called, THE Voice_Adapter SHALL delegate to the selected provider implementation
7. THE Voice_Adapter SHALL handle provider-specific authentication and connection setup

### Requirement 4: API Route for Provider Selection

**User Story:** As a frontend developer, I want the speech-token API to return the correct provider configuration, so that the client can initialize the appropriate voice provider.

#### Acceptance Criteria

1. THE System SHALL modify the /api/quiz/speech-token endpoint to return provider information
2. WHEN /api/quiz/speech-token is called, THE System SHALL query Remote_Config for the active provider
3. THE System SHALL return a response containing: provider name, signed URL, and provider-specific configuration
4. WHEN the selected provider is ElevenLabs, THE System SHALL return the ElevenLabs signed URL and agent ID
5. WHEN the selected provider is Gemini, THE System SHALL return the Gemini API key and project configuration
6. THE System SHALL include provider capabilities in the response (e.g., supports feedback, supports mute)
7. WHEN Remote_Config is unavailable, THE System SHALL default to ElevenLabs and log a warning

### Requirement 5: Graceful Fallback Mechanism

**User Story:** As a user, I want the voice quiz to work reliably, so that if one provider fails, the system automatically switches to the backup provider.

#### Acceptance Criteria

1. WHEN the primary provider fails to connect, THE System SHALL attempt to use the Fallback_Provider
2. THE System SHALL define ElevenLabs as the default Fallback_Provider
3. WHEN a provider connection fails, THE System SHALL log the error with provider name and error details
4. WHEN falling back to an alternative provider, THE System SHALL notify the user with a message
5. IF both providers fail, THEN THE System SHALL display an error message and allow retry
6. THE System SHALL track provider failure rates in application logs
7. WHEN a fallback occurs, THE System SHALL record the event for monitoring and analytics

### Requirement 6: Frontend Provider Adapter

**User Story:** As a frontend developer, I want VoiceQuizScreen to work with multiple providers, so that I don't need to modify the component when providers change.

#### Acceptance Criteria

1. THE VoiceQuizScreen SHALL use a provider-agnostic voice service interface
2. WHEN VoiceQuizScreen starts a session, THE System SHALL dynamically load the appropriate provider client library
3. THE VoiceQuizScreen SHALL handle provider-specific initialization based on the API response
4. WHEN using ElevenLabs, THE System SHALL import and use @elevenlabs/client
5. WHEN using Gemini, THE System SHALL import and use @google/generative-ai or equivalent
6. THE VoiceQuizScreen SHALL normalize provider events into a consistent format
7. THE VoiceQuizScreen SHALL display the same UI regardless of the active provider

### Requirement 7: Environment Configuration

**User Story:** As a DevOps engineer, I want to configure both voice providers via environment variables, so that credentials are managed securely.

#### Acceptance Criteria

1. THE System SHALL require ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID for ElevenLabs provider
2. THE System SHALL require GEMINI_API_KEY and GEMINI_PROJECT_ID for Gemini provider
3. THE System SHALL require FIREBASE_REMOTE_CONFIG_ENABLED flag to enable/disable Remote Config
4. THE System SHALL provide a VOICE_PROVIDER_DEFAULT environment variable for local development
5. WHEN FIREBASE_REMOTE_CONFIG_ENABLED is false, THE System SHALL use VOICE_PROVIDER_DEFAULT
6. THE System SHALL validate that required credentials exist for the selected provider
7. WHEN required credentials are missing, THE System SHALL return a 500 error with a descriptive message

### Requirement 8: Backward Compatibility

**User Story:** As a developer, I want existing ElevenLabs functionality to remain unchanged, so that current users experience no disruption.

#### Acceptance Criteria

1. THE System SHALL maintain the existing /api/quiz/speech-token endpoint signature
2. WHEN Remote_Config is not configured, THE System SHALL default to ElevenLabs
3. THE System SHALL preserve all existing ElevenLabs features: feedback, mute, contextual updates
4. THE VoiceQuizScreen SHALL continue to work with the existing ElevenLabs integration
5. THE System SHALL not require code changes to existing voice quiz sessions
6. WHEN Gemini is disabled or unavailable, THE System SHALL fall back to ElevenLabs seamlessly
7. THE System SHALL maintain the same response format for the speech-token endpoint

### Requirement 9: Monitoring and Logging

**User Story:** As a site reliability engineer, I want detailed logs for voice provider operations, so that I can troubleshoot issues and monitor performance.

#### Acceptance Criteria

1. THE System SHALL log provider selection decisions with timestamp and user context
2. THE System SHALL log connection attempts, successes, and failures for each provider
3. THE System SHALL log Remote_Config fetch operations and cache hits/misses
4. THE System SHALL log fallback events with the reason for fallback
5. THE System SHALL include provider name in all voice-related log entries
6. THE System SHALL log session duration and message counts per provider
7. THE System SHALL expose provider metrics for monitoring dashboards

### Requirement 10: Testing and Validation

**User Story:** As a QA engineer, I want to test both voice providers independently, so that I can verify functionality before production rollout.

#### Acceptance Criteria

1. THE System SHALL provide a test endpoint /api/quiz/test-voice-provider that accepts a provider parameter
2. WHEN the test endpoint is called with "elevenlabs", THE System SHALL validate ElevenLabs connectivity
3. WHEN the test endpoint is called with "gemini", THE System SHALL validate Gemini connectivity
4. THE System SHALL return connection status, latency, and capability information
5. THE System SHALL support a query parameter to override Remote_Config for testing
6. THE System SHALL provide unit tests for Voice_Adapter factory logic
7. THE System SHALL provide integration tests for both provider implementations

