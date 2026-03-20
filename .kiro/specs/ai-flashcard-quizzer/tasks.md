# Tasks: AI Flashcard Quizzer

## Overview

This document breaks down the AI Flashcard Quizzer specification into concrete, actionable implementation tasks organized by functional area. Tasks are sequenced to respect dependencies and grouped hierarchically for clarity.

---

## Phase 1: Project Setup and Infrastructure

### 1.1 Project Initialization
- [x] Make a folder for the backend and Initialize Next.js project with JavaScript
- [x] Make a folder for the frontend and Configure React Native Web with Tamagui
- [x] Set up Tamagui theme (purple accent, light theme, modern rounded elements) and design tokens

### 1.2 Environment and Deployment Setup
- [x] Set up Vercel project and environment variables (this is for me to do)
- [x] I created a GitHub repo called `duckida/mirai-flashcards`, initialize that as the repo

- [x] Now that I have the github setup, teach me how to setup Vercel

- [x] Deploy the backend to Vercel using the CLI
- [x] Configure Vercel Storage for image uploads
- [x] Set up Firestore project and authentication
- [x] Configure Firebase Admin SDK for backend



### 1.3 External Service Configuration
- [x] Register and configure Civic.ai OAuth application. Docs of Civic are fonud at `https://raw.githubusercontent.com/civicteam/demos/refs/heads/main/apps/civic-auth-demo/README.md`. My CIVIC_CLIENT_ID=a141d53d-9b85-41b5-8590-38a27caaf582
- [x] Set up ElevenLabs API account and credentials
- [x] Configure Canva MCP integration via Civic.ai
- [x] Set up AI Vision API (Vercel AI SDK)
- [x] Set up AI Image Generation API (Vercel AI SDK)
- [x] Set up AI Classification API (Vercel AI SDK) for module assignment

---

## Phase 2: Authentication and User Management

### 2.1 Authentication Service Implementation
- [x] Implement Civic.ai OAuth flow in JavaScript
- [x] Create `/api/auth/login` endpoint
- [x] Create `/api/auth/callback` endpoint for OAuth callback
- [x] Implement session management with secure HTTP-only cookies
- [x] Create `/api/auth/logout` endpoint
- [x] Create `/api/auth/session` endpoint for session validation
- [x] Implement session refresh logic

### 2.2 User Data Management
- [x] Create Firestore `users` collection schema
- [x] Implement user document creation on first login
- [x] Implement user preferences storage (quiz type, speech rate, theme)
- [x] Create user profile retrieval service
- [x] Implement user preference update endpoints

### 2.3 Authentication UI
- [x] Create Authentication Screen with Civic.ai login button
- [x] Implement error messaging for failed authentication
- [x] Implement loading state during OAuth flow
- [x] Create session validation middleware for protected routes
- [x] Implement automatic redirect to login for unauthenticated users

---

## Phase 3: Image Scanning and Flashcard Digitization

### 3.1 Image Upload Service
- [x] Implement image upload to Vercel Storage
- [x] Validate image format (JPEG, PNG, WEBP)
- [x] Validate image file size (≤20MB)
- [x] Create `/api/flashcards/upload` endpoint
- [x] Implement upload progress tracking
- [x] Handle upload errors gracefully

### 3.2 Scanner Service Implementation
- [x] Implement AI Vision API integration for text extraction
- [x] Create Q&A pair identification logic
- [x] Implement confidence scoring for extracted content
- [x] Create extraction validation logic
- [x] Implement retry logic for failed extractions
- [x] Handle cases where no recognizable content is found

### 3.3 Flashcard Preview and Confirmation
- [x] Create extracted flashcards preview UI
- [x] Implement flashcard edit interface for preview
- [x] Implement confirm/discard workflow
- [x] Create `/api/flashcards` endpoint for saving confirmed flashcards
- [x] Implement batch flashcard persistence to Firestore

### 3.4 Upload Image Screen
- [x] Create Upload Image screen with Tamagui components
- [x] Implement image picker/drag-and-drop zone
- [x] Implement upload progress indicator
- [x] Display extracted flashcards preview
- [x] Implement confirm/edit/cancel buttons
- [x] Add error messaging for upload failures

---

## Phase 4: Automatic Topic Classification

### 4.1 Classifier Service Implementation
- [x] Implement AI classification API integration
- [x] Create module matching logic based on flashcard content
- [x] Implement module creation with AI-generated topic labels
- [x] Create flashcard-to-module assignment logic
- [x] Implement confidence scoring for module assignments
- [x] Create module reassignment logic

### 4.2 Module Management
- [x] Create Firestore `modules` collection schema
- [x] Implement module creation endpoint
- [x] Implement module retrieval endpoints
- [x] Create module update endpoint for reassignment
- [x] Implement module deletion with flashcard cleanup
- [x] Create module list retrieval for dashboard

### 4.3 Module Display and Management
- [x] Create Dashboard screen showing all user modules
- [x] Display module name and flashcard count
- [x] Display module aggregate knowledge score
- [x] Implement module selection navigation
- [x] Create "New Module" button
- [x] Implement module color/categorization for UI

---

## Phase 5: Flashcard Management

### 5.1 Flashcard Data Model and Persistence
- [x] Create Firestore `flashcards` collection schema
- [x] Implement flashcard creation with knowledge score initialization (0)
- [x] Implement flashcard retrieval by module
- [x] Implement flashcard update endpoint
- [x] Implement flashcard deletion endpoint
- [x] Create Firestore indexes for efficient queries

### 5.2 Flashcard CRUD Operations
- [x] Create `/api/flashcards/:moduleId` endpoint (GET)
- [x] Create `/api/flashcards` endpoint (POST)
- [x] Create `/api/flashcards/:id` endpoint (PATCH)
- [x] Create `/api/flashcards/:id` endpoint (DELETE)
- [x] Implement validation for non-empty question/answer fields
- [x] Implement error handling for invalid operations

### 5.3 Flashcard UI and Display
- [x] Create Module Detail screen showing flashcard list
- [x] Implement question/answer toggle display
- [x] Display knowledge score for each flashcard
- [x] Create edit button for each flashcard
- [x] Create delete button for each flashcard
- [x] Implement Flashcard Editor (inline modal) with validation
- [x] Add "Add Flashcard" button for manual creation
- [x] Add visual feedback for edit/delete operations

### 5.4 Flashcard Validation and Error Handling
- [x] Implement empty field validation
- [x] Display validation error messages
- [x] Prevent save with invalid data
- [x] Implement UI feedback on edit/delete operations
- [x] Handle error states with dismissible error banner

---

## Phase 6: Knowledge Scoring System

### 6.1 Knowledge Score Initialization and Storage
- [x] Initialize new flashcards with knowledge score of 0
- [x] Store knowledge scores in Firestore
- [x] Implement knowledge score retrieval
- [x] Create knowledge score update logic

### 6.2 Score Update Logic
- [x] Implement correct answer score increase (1-10 points)
- [x] Implement incorrect answer score decrease (1-10 points)
- [x] Enforce minimum score of 0 (no negative scores)
- [x] Enforce maximum score of 100
- [x] Implement confidence-based score adjustments
- [x] Create score change persistence

### 6.3 Module Aggregate Scoring
- [x] Implement module aggregate score calculation (mean of flashcard scores)
- [x] Create denormalized aggregate score storage on module document
- [x] Implement aggregate score update on flashcard score changes
- [x] Implement aggregate score recalculation on flashcard deletion
- [x] Display module aggregate score on dashboard

### 6.4 Knowledge Score Display
- [x] Display individual flashcard knowledge scores in module view
- [x] Display module aggregate score on dashboard
- [x] Create visual score indicators (progress bars, badges)
- [x] Implement score history tracking (optional)

---

## Phase 7: Quiz Engine Core

### 7.1 Quiz Session Management
- [x] Create Firestore `quiz_sessions` collection schema
- [x] Implement quiz session creation endpoint
- [x] Implement quiz session state management
- [x] Create `/api/quiz/start` endpoint
- [x] Create `/api/quiz/:sessionId/end` endpoint
- [x] Implement session persistence and recovery

### 7.2 Flashcard Selection and Prioritization
- [x] Implement flashcard selection by knowledge score (ascending)
- [x] Create flashcard selection algorithm for quiz sessions
- [x] Implement configurable quiz size (number of cards)
- [x] Handle edge cases (empty modules, single card)
- [x] Implement randomization within score tiers

### 7.3 Exercise Type Generation
- [x] Implement free recall exercise generation
- [x] Implement multiple choice exercise generation
- [x] Implement fill-in-the-blank exercise generation
- [x] Create exercise variation logic
- [x] Implement exercise type distribution across session

### 7.4 Multiple Choice Question Generation
- [x] Implement correct answer selection
- [x] Implement distractor generation from other flashcards
- [x] Implement AI-based distractor generation for small modules
- [x] Ensure exactly 4 answer options per question
- [x] Implement answer option shuffling

### 7.5 Quiz Response Evaluation
- [x] Implement response evaluation logic
- [x] Create correctness determination algorithm
- [x] Implement score change calculation
- [x] Create feedback generation
- [x] Implement response persistence

### 7.6 Quiz Session Endpoints
- [x] Create `/api/quiz/:sessionId/question` endpoint (GET)
- [x] Create `/api/quiz/:sessionId/answer` endpoint (POST)
- [x] Create `/api/quiz/:sessionId/summary` endpoint (GET)
- [x] Implement session state validation
- [x] Implement error handling for invalid operations

---

## Phase 8: Voice Quiz Implementation

### 8.1 Speech Service Integration (ElevenLabs)
- [ ] Implement ElevenLabs WebSocket connection
- [ ] Create speech synthesis wrapper
- [ ] Create speech recognition/transcription wrapper
- [ ] Implement connection lifecycle management
- [ ] Implement reconnection logic
- [ ] Handle connection interruptions gracefully

### 8.2 Voice Quiz Session Flow
- [ ] Implement user greeting with name and module topic
- [ ] Implement question reading aloud
- [ ] Implement listening for user response
- [ ] Implement response transcription
- [ ] Implement session summary speech
- [ ] Implement error recovery for speech failures

### 8.3 Voice Quiz UI
- [ ] Create Voice Quiz Session screen
- [ ] Implement microphone indicator (listening/speaking)
- [ ] Implement "Show Answer" toggle
- [ ] Implement "Next" button
- [ ] Implement session progress indicator
- [ ] Implement real-time speech feedback
- [ ] Add visual indicators for speech activity

### 8.4 Voice Quiz Error Handling
- [ ] Implement speech connection error handling
- [ ] Implement transcription error handling
- [ ] Implement microphone permission handling
- [ ] Implement graceful fallback to text-based quiz
- [ ] Implement session resume/end options on error

### 8.5 Speech Latency Optimization
- [ ] Implement speech connection pooling
- [ ] Optimize audio codec selection
- [ ] Implement latency monitoring
- [ ] Create performance alerts for latency >1 second
- [ ] Implement caching for common phrases

---

## Phase 9: Image-Based Quiz Implementation

### 9.1 Image Service Integration
- [ ] Implement AI image generation API integration
- [ ] Create image generation wrapper service
- [ ] Implement image caching logic
- [ ] Create image URL storage and retrieval
- [ ] Implement image generation error handling
- [ ] Implement fallback for failed image generation

### 9.2 Dynamic Question Generation
- [ ] Implement AI-based question generation distinct from flashcard text
- [ ] Create question generation with module context
- [ ] Implement question variation logic
- [ ] Create question caching
- [ ] Implement question validation

### 9.3 Image Quiz Session Flow
- [ ] Implement image quiz session creation
- [ ] Implement question and image display
- [ ] Implement text-based answer input
- [ ] Implement adaptive question selection based on prior answers
- [ ] Implement response evaluation
- [ ] Implement session summary generation

### 9.4 Image Quiz UI
- [ ] Create Image Quiz Session screen
- [ ] Implement question text display
- [ ] Implement AI-generated image display
- [ ] Implement text input for answers
- [ ] Implement multiple choice option display (if applicable)
- [ ] Implement feedback display
- [ ] Implement progress indicator
- [ ] Add image loading states and error handling

### 9.5 Image Quiz Error Handling
- [ ] Implement image generation failure handling
- [ ] Implement graceful degradation (display question without image)
- [ ] Implement question generation error handling
- [ ] Implement response evaluation error handling
- [ ] Implement session recovery

---

## Phase 10: Interactive Exercise Features

### 10.1 Exercise Variation Implementation
- [ ] Implement free recall exercise type
- [ ] Implement multiple choice exercise type
- [ ] Implement fill-in-the-blank exercise type
- [ ] Create exercise type selection logic
- [ ] Implement exercise type distribution

### 10.2 Immediate Feedback System
- [ ] Implement correctness feedback
- [ ] Implement correct answer display
- [ ] Implement explanatory feedback generation
- [ ] Create feedback UI components
- [ ] Implement feedback timing and display

### 10.3 Quiz Results and Summary
- [ ] Create Quiz Results screen
- [ ] Display session summary (cards reviewed, correct/incorrect)
- [ ] Display knowledge score changes
- [ ] Display module aggregate score update
- [ ] Implement "Review Weak Cards" button
- [ ] Implement "Return to Module" button

---

## Phase 11: Canva Integration (MCP)

### 11.1 Canva Service Implementation
- [ ] Implement Canva MCP invocation via Civic.ai
- [ ] Create presentation generation request logic
- [ ] Implement async presentation generation handling
- [ ] Create presentation status polling
- [ ] Implement presentation link retrieval
- [ ] Handle Canva API errors gracefully

### 11.2 Presentation Generation Endpoints
- [ ] Create `/api/canva/generate` endpoint
- [ ] Create `/api/canva/:presentationId/status` endpoint
- [ ] Create `/api/canva/:presentationId/link` endpoint
- [ ] Implement request validation
- [ ] Implement error handling

### 11.3 Canva Presentation Data Model
- [ ] Create Firestore `presentations` collection schema
- [ ] Implement presentation metadata storage
- [ ] Implement presentation status tracking
- [ ] Implement presentation link caching
- [ ] Implement presentation expiration handling

### 11.4 Help Presentation UI
- [ ] Add "Help me understand" button to Module Detail screen
- [ ] Add "Help me understand" button to Quiz Results screen
- [ ] Create presentation generation request UI
- [ ] Implement loading state during generation
- [ ] Display presentation link when ready
- [ ] Implement error messaging for failed generation
- [ ] Add retry button for failed requests

---

## Phase 12: API Routes and Backend

### 12.1 Authentication API Routes
- [ ] Implement `POST /api/auth/login`
- [ ] Implement `GET /api/auth/callback`
- [ ] Implement `POST /api/auth/logout`
- [ ] Implement `GET /api/auth/session`
- [ ] Add authentication middleware to protected routes

### 12.2 Flashcard API Routes
- [ ] Implement `POST /api/flashcards/upload`
- [ ] Implement `GET /api/flashcards/:moduleId`
- [ ] Implement `POST /api/flashcards`
- [ ] Implement `PATCH /api/flashcards/:id`
- [ ] Implement `DELETE /api/flashcards/:id`

### 12.3 Module API Routes
- [ ] Implement `GET /api/modules`
- [ ] Implement `POST /api/modules`
- [ ] Implement `GET /api/modules/:id`
- [ ] Implement `PATCH /api/modules/:id`

### 12.4 Quiz API Routes
- [ ] Implement `POST /api/quiz/start`
- [ ] Implement `GET /api/quiz/:sessionId/question`
- [ ] Implement `POST /api/quiz/:sessionId/answer`
- [ ] Implement `POST /api/quiz/:sessionId/end`
- [ ] Implement `GET /api/quiz/:sessionId/summary`

### 12.5 Canva API Routes
- [ ] Implement `POST /api/canva/generate`
- [ ] Implement `GET /api/canva/:presentationId/status`
- [ ] Implement `GET /api/canva/:presentationId/link`

### 12.6 API Error Handling and Validation
- [ ] Implement request validation middleware
- [ ] Implement error response standardization
- [ ] Implement rate limiting
- [ ] Implement request logging
- [ ] Implement CORS configuration

---

## Phase 13: Database Schema and Firestore Setup

### 13.1 Firestore Collections and Indexes
- [x] Create `users` collection with schema
- [x] Create `modules` collection with schema
- [x] Create `flashcards` collection with schema
- [x] Create `quiz_sessions` collection with schema
- [x] Create `presentations` collection with schema
- [x] Create composite indexes for efficient queries
- [x] Set up Firestore security rules

### 13.2 Data Validation and Constraints
- [x] Implement field-level validation rules
- [x] Implement document-level constraints
- [x] Implement referential integrity checks
- [x] Implement data type validation
- [x] Implement required field validation

### 13.3 Data Migration and Seeding
- [x] Create database migration scripts
- [x] Create seed data for testing
- [x] Implement data backup procedures
- [x] Create data cleanup scripts

---

## Phase 14: UI Screens and Components

### 14.1 Core Screens
- [ ] Create Authentication Screen
- [ ] Create Dashboard Screen (Module List)
- [ ] Create Module Detail Screen (Flashcard List)
- [ ] Create Flashcard Editor Screen
- [ ] Create Voice Quiz Session Screen
- [ ] Create Image Quiz Session Screen
- [ ] Create Quiz Results Screen
- [ ] Create Settings Screen

### 14.2 Tamagui Component Implementation
- [ ] Implement YStack and XStack layouts
- [ ] Implement Card components for modules and flashcards
- [ ] Implement Button components with variants
- [ ] Implement Text components with typography
- [ ] Implement Input components for editing
- [ ] Implement Badge components for scores
- [ ] Implement Spinner components for loading
- [ ] Implement Image components for quiz images
- [ ] Implement FlatList for scrollable lists

### 14.3 Navigation and Routing
- [ ] Set up Next.js routing structure
- [ ] Implement navigation between screens
- [ ] Implement deep linking support
- [ ] Implement back button handling
- [ ] Implement navigation state management

### 14.4 Theme and Styling
- [ ] Define Tamagui theme tokens
- [ ] Implement light/dark mode support
- [ ] Create consistent spacing and sizing
- [ ] Implement responsive design
- [ ] Create reusable styled components

### 14.5 Accessibility
- [ ] Implement ARIA labels for interactive elements
- [ ] Implement keyboard navigation
- [ ] Implement screen reader support
- [ ] Implement color contrast compliance
- [ ] Implement focus management

---

## Phase 15: Testing

### 15.1 Unit Tests (JavaScript)
- [x] Write tests for Auth Service
- [x] Write tests for Scanner Service
- [x] Write tests for Classifier Service
- [ ] Write tests for Quiz Engine (pending - Phase 7 not implemented)
- [ ] Write tests for Speech Service (pending - Phase 8 not implemented)
- [x] Write tests for Image Service
- [x] Write tests for Canva Service
- [x] Write tests for API route handlers
- [x] Write tests for data validation functions
- [ ] Achieve >80% code coverage

### 15.2 Integration Tests
- [ ] Test Auth → Dashboard flow
- [x] Test Upload → Classify → Quiz flow
- [x] Test Quiz → Scoring flow
- [ ] Test Speech → Evaluation flow (pending - Phase 8 not implemented)
- [ ] Test Image Generation → Display flow
- [ ] Test Canva Integration flow
- [x] Test error recovery flows

### 15.3 Property-Based Tests
- [x] Write property tests for image format validation
- [x] Write property tests for flashcard persistence
- [x] Write property tests for module classification
- [x] Write property tests for knowledge score updates
- [x] Write property tests for quiz selection logic
- [x] Write property tests for exercise generation
- [x] Write property tests for response evaluation

### 15.4 Performance Tests
- [ ] Test page load time (<3 seconds)
- [ ] Test speech latency (<1 second)
- [ ] Test quiz responsiveness (<500ms)
- [ ] Load test with 100+ concurrent users
- [ ] Test image generation performance
- [ ] Test Firestore query performance

### 15.5 Error Scenario Tests
- [ ] Test network failure handling
- [ ] Test service unavailability handling
- [ ] Test invalid input handling
- [ ] Test session expiry handling
- [ ] Test concurrent operation handling
- [ ] Test data corruption recovery

---

## Phase 16: Deployment and Monitoring

### 16.1 Deployment Pipeline
- [ ] Configure Vercel deployment

### 16.3 Performance Optimization
- [ ] Implement code splitting for screens
- [ ] Optimize image compression and delivery
- [ ] Implement state management optimization
- [ ] Optimize Firestore queries
- [ ] Implement API response caching
- [ ] Optimize bundle size

### 16.4 Security and Compliance
- [ ] Implement HTTPS enforcement
- [ ] Set up CORS properly
- [ ] Implement rate limiting
- [ ] Implement input sanitization
- [ ] Implement CSRF protection
- [ ] Set up security headers
- [ ] Implement API key rotation

### 16.5 Documentation and Runbooks
- [ ] Create API documentation
- [ ] Create deployment runbook
- [ ] Create incident response runbook
- [ ] Create troubleshooting guide
- [ ] Create architecture documentation
- [ ] Create developer setup guide

---

## Phase 17: Optional Enhancements

### 17.1 Advanced Features (Optional)
- [ ] * Implement spaced repetition algorithm
- [ ] * Implement study streak tracking
- [ ] * Implement leaderboard/social features
- [ ] * Implement flashcard sharing
- [ ] * Implement collaborative modules
- [ ] * Implement mobile app (React Native)
- [ ] * Implement offline mode
- [ ] * Implement flashcard templates

### 17.2 Analytics and Insights (Optional)
- [ ] * Implement learning analytics dashboard
- [ ] * Implement study time tracking
- [ ] * Implement performance trends
- [ ] * Implement weak topic identification
- [ ] * Implement study recommendations

### 17.3 Advanced Quiz Features (Optional)
- [ ] * Implement timed quizzes
- [ ] * Implement difficulty levels
- [ ] * Implement custom quiz creation
- [ ] * Implement quiz scheduling
- [ ] * Implement quiz templates

---

## Task Dependencies and Sequencing

### Critical Path
1. Phase 1: Project Setup (prerequisite for all)
2. Phase 2: Authentication (prerequisite for user-specific features)
3. Phase 13: Database Schema (prerequisite for data persistence)
4. Phase 3: Image Scanning (core feature)
5. Phase 4: Classification (depends on Phase 3)
6. Phase 5: Flashcard Management (depends on Phase 4)
7. Phase 6: Knowledge Scoring (depends on Phase 5)
8. Phase 7: Quiz Engine Core (depends on Phase 6)
9. Phase 8: Voice Quiz (depends on Phase 7)
10. Phase 9: Image Quiz (depends on Phase 7)
11. Phase 10: Interactive Exercises (depends on Phase 7)
12. Phase 11: Canva Integration (can be parallel with Phase 8-10)
13. Phase 12: API Routes (depends on all services)
14. Phase 14: UI Screens (depends on Phase 12)
15. Phase 15: Testing (can be parallel with development)
16. Phase 16: Deployment (final phase)

### Parallelizable Work
- Phase 1 and Phase 13 can start immediately
- Phase 8, 9, 10, 11 can be developed in parallel after Phase 7
- Phase 15 (testing) can begin after Phase 7
- Phase 16 (deployment setup) can begin after Phase 1

---

## Complexity Estimates

- **High Complexity**: Phases 7, 8, 9, 11 (quiz engines, speech integration, Canva MCP)
- **Medium Complexity**: Phases 3, 4, 5, 6, 12, 14 (core features and UI)
- **Low Complexity**: Phases 1, 2, 13, 15, 16 (setup, database, testing, deployment)

---

## Success Criteria

- All requirements from requirements.md are implemented
- All correctness properties from design.md are validated
- >80% code coverage with unit and integration tests
- Page load time <3 seconds
- Speech latency <1 second
- All API endpoints functional and documented
- Deployment pipeline automated and tested
- Monitoring and alerting configured
- User authentication working with Civic.ai
- All external service integrations functional
