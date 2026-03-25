# Implementation Plan: Gemini Voice Agent

## Overview

This implementation adds Gemini 2.5 Flash Native Audio as an alternative voice provider alongside ElevenLabs, with Firebase Remote Config controlling dynamic provider selection. The architecture introduces a provider abstraction layer that enables seamless switching between providers with automatic fallback support.

## Tasks

- [x] 1. Set up Firebase Remote Config integration
  - Initialize Firebase Remote Config client in backend
  - Create configuration parameters for provider selection
  - Implement caching mechanism with configurable TTL
  - Add environment variable `FIREBASE_REMOTE_CONFIG_ENABLED`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.7, 2.8_

- [x] 2. Create voice provider abstraction layer
  - [x] 2.1 Create base VoiceProvider interface class
    - Implement getName(), getSignedUrl(), getCapabilities(), validateCredentials(), getFrontendConfig() methods
    - _Requirements: 3.2, 3.6, 3.7_
  
  - [ ]* 2.2 Write property test for provider interface compatibility
    - **Property 1: Provider Interface Compatibility**
    - **Validates: Requirements 1.5, 3.2**
  
  - [x] 2.3 Implement ElevenLabsProvider adapter
    - Extend VoiceProvider base class
    - Implement all interface methods for ElevenLabs API
    - Add credential validation logic
    - _Requirements: 1.5, 3.2, 3.6, 8.3_
  
  - [x] 2.4 Implement GeminiProvider adapter
    - Extend VoiceProvider base class
    - Implement all interface methods for Gemini 2.5 Flash Native Audio API
    - Add credential validation logic
    - Handle WebSocket endpoint construction with API key
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_
  
  - [ ]* 2.5 Write property test for WebSocket connection establishment
    - **Property 3: WebSocket Connection Establishment**
    - **Validates: Requirements 1.3**

- [x] 3. Implement Voice Provider Service
  - [x] 3.1 Create VoiceProviderService class
    - Implement getProviderConfig() with Remote Config integration
    - Implement createProvider() factory method
    - Implement getProvider() with fallback logic
    - Add in-memory caching with TTL
    - _Requirements: 2.4, 2.7, 2.8, 3.1, 3.3, 5.1, 5.2_
  
  - [ ]* 3.2 Write property test for Remote Config cache behavior
    - **Property 5: Remote Config Cache Behavior**
    - **Validates: Requirements 2.7**
  
  - [ ]* 3.3 Write property test for Remote Config fallback on failure
    - **Property 6: Remote Config Fallback on Failure**
    - **Validates: Requirements 2.8**
  
  - [ ]* 3.4 Write property test for provider factory selection
    - **Property 7: Provider Factory Selection**
    - **Validates: Requirements 3.1, 3.3**
  
  - [ ]* 3.5 Write property test for primary provider fallback
    - **Property 12: Primary Provider Fallback on Failure**
    - **Validates: Requirements 5.1**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Update API route for provider selection
  - [x] 5.1 Modify /api/quiz/speech-token route
    - Import and use VoiceProviderService
    - Return provider configuration with signedUrl, capabilities, and config
    - Handle fallback scenarios and include fallbackOccurred flag
    - Extract user ID from session if available
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_
  
  - [ ]* 5.2 Write property test for API response structure completeness
    - **Property 11: API Response Structure Completeness**
    - **Validates: Requirements 4.1, 4.6**
  
  - [ ]* 5.3 Write property test for response normalization
    - **Property 8: Response Normalization**
    - **Validates: Requirements 3.4, 4.3**

- [x] 6. Add environment variable configuration
  - [x] 6.1 Add Gemini environment variables
    - Add GEMINI_API_KEY to .env.local.example
    - Add GEMINI_PROJECT_ID to .env.local.example
    - Add FIREBASE_REMOTE_CONFIG_ENABLED flag
    - Add VOICE_PROVIDER_DEFAULT for local development
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [ ]* 6.2 Write property test for credential validation
    - **Property 18: Credential Validation for Selected Provider**
    - **Validates: Requirements 7.6**
  
  - [ ]* 6.3 Write property test for missing credentials error response
    - **Property 19: Missing Credentials Error Response**
    - **Validates: Requirements 7.7**

- [x] 7. Update frontend voice service
  - [x] 7.1 Modify voiceService.js to return full provider config
    - Update getSignedUrl() to getProviderConfig()
    - Return provider, signedUrl, capabilities, config, fallbackOccurred, fallbackReason
    - _Requirements: 6.1, 6.2_
  
  - [x] 7.2 Implement startSession() with dynamic provider loading
    - Add provider detection logic
    - Implement startElevenLabsSession() method
    - Implement startGeminiSession() method
    - Normalize provider events into consistent format
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6_
  
  - [ ]* 7.3 Write property test for dynamic provider library loading
    - **Property 15: Dynamic Provider Library Loading**
    - **Validates: Requirements 6.2, 6.3**
  
  - [ ]* 7.4 Write property test for provider event normalization
    - **Property 16: Provider Event Normalization**
    - **Validates: Requirements 6.6**

- [x] 8. Update VoiceQuizScreen component
  - [x] 8.1 Modify VoiceQuizScreen to use new voiceService API
    - Replace getSignedUrl() with getProviderConfig()
    - Pass provider config to startSession()
    - Display fallback notification if fallbackOccurred is true
    - Ensure UI remains provider-agnostic
    - _Requirements: 6.1, 6.7, 8.4, 8.5_
  
  - [ ]* 8.2 Write property test for UI provider independence
    - **Property 17: UI Provider Independence**
    - **Validates: Requirements 6.7**

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Add logging and monitoring
  - [x] 10.1 Add provider selection logging
    - Log provider selection decisions with timestamp and user context
    - Log connection attempts, successes, and failures
    - Log Remote Config fetch operations and cache hits/misses
    - Log fallback events with reason
    - Include provider name in all voice-related log entries
    - _Requirements: 5.3, 5.6, 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [ ]* 10.2 Write property test for failure logging completeness
    - **Property 14: Failure Logging Completeness**
    - **Validates: Requirements 5.3, 9.1, 9.2**
  
  - [ ]* 10.3 Write property test for Remote Config fetch logging
    - **Property 20: Remote Config Fetch Logging**
    - **Validates: Requirements 9.3**
  
  - [ ]* 10.4 Write property test for provider name in voice logs
    - **Property 22: Provider Name in Voice Logs**
    - **Validates: Requirements 9.5**
  
  - [ ] 10.5 Add session metrics logging
    - Log session duration and message counts per provider
    - _Requirements: 9.6_
  
  - [ ]* 10.6 Write property test for session metrics logging
    - **Property 21: Session Metrics Logging**
    - **Validates: Requirements 9.6**

- [x] 11. Create test endpoint for provider validation
  - [x] 11.1 Create /api/quiz/test-voice-provider endpoint
    - Accept provider parameter (elevenlabs or gemini)
    - Validate connectivity for specified provider
    - Return connection status, latency, and capability information
    - Support query parameter to override Remote Config
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [ ]* 11.2 Write integration tests for test endpoint
    - Test ElevenLabs validation
    - Test Gemini validation
    - Test Remote Config override
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 12. Add unit tests for core components
  - [x] 12.1 Write unit tests for VoiceProviderService
    - Test provider factory logic
    - Test caching behavior
    - Test fallback scenarios
    - _Requirements: 10.6_
  
  - [x] 12.2 Write unit tests for ElevenLabsProvider
    - Test getSignedUrl()
    - Test validateCredentials()
    - Test capability reporting
    - _Requirements: 10.6_
  
  - [x] 12.3 Write unit tests for GeminiProvider
    - Test getSignedUrl()
    - Test validateCredentials()
    - Test capability reporting
    - _Requirements: 10.6_

- [x] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Update documentation
  - [x] 14.1 Update backend README with Gemini configuration
    - Document GEMINI_API_KEY and GEMINI_PROJECT_ID
    - Document FIREBASE_REMOTE_CONFIG_ENABLED flag
    - Document VOICE_PROVIDER_DEFAULT for local development
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [x] 14.2 Update .env.local.example with new variables
    - Add Gemini credentials
    - Add Firebase Remote Config flag
    - Add voice provider default
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 14.3 Add provider architecture documentation
    - Document provider abstraction layer
    - Document fallback mechanism
    - Document Remote Config integration
    - _Requirements: 3.1, 5.1, 2.1_

- [x] 15. Fix Gemini Live audio round-trip
  - Fixed variable shadowing: outer `ws` was null when sending mic audio (line 270 `let ws` shadowed outer `ws`)
  - Fixed audio message format: changed from custom `{ type: 'audio' }` to Gemini protocol `{ realtimeInput: { mediaChunks: [...] } }`
  - Added `input_audio_transcription: {}` to setup message for user speech transcription
  - Removed unused `downsampleBuffer` function and constants

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation maintains full backward compatibility with existing ElevenLabs integration
- Firebase Remote Config enables runtime provider switching without code deployments
