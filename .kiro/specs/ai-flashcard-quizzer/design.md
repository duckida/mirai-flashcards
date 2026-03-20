# Design Document: AI Flashcard Quizzer

## Overview

The AI Flashcard Quizzer is a web application that enables users to digitize physical notes into interactive flashcards through image scanning, organize them into topic-based modules, and engage with them through multiple quiz modalities including voice-based sessions and AI-assisted visual quizzes. The system leverages AI vision for content extraction, real-time speech synthesis for interactive quizzing, and generative AI for dynamic question creation and visual content generation.

### Key Design Principles

- **Modular Architecture**: Clear separation between authentication, content management, quiz engines, and external service integrations
- **Progressive Enhancement**: Core functionality works without voice or images; advanced features enhance the experience
- **Resilience**: Graceful degradation when external services are unavailable
- **User-Centric Scoring**: Knowledge scores drive personalized quiz difficulty and content prioritization
- **Cross-Platform Consistency**: React Native + Tamagui ensures consistent UX across web and mobile

---

## Architecture

### System Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    UI Layer (React Native + Tamagui)        │
│  Screens: Auth, Dashboard, Module, Flashcard, Quiz, Results │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Application Layer (Services & Engines)          │
│  Auth Service, Quiz Engine, Scanner, Classifier, Image Svc  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  Data Access Layer (Firestore)              │
│  Collections: users, modules, flashcards, quiz_sessions     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              External Service Integrations                   │
│  Civic.ai (Auth), ElevenLabs (Speech), Canva MCP, AI Vision │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

**Image Upload & Digitization Flow:**
1. User uploads image via UI
2. Image stored in Vercel Storage
3. Scanner service calls AI vision API to extract Q&A pairs
4. Extracted flashcards presented to user for review
5. User confirms → Classifier assigns to modules
6. Flashcards persisted to Firestore

**Quiz Session Flow:**
1. User selects module and quiz type (voice or image-based)
2. Quiz Engine retrieves flashcards, prioritizes by knowledge score
3. For voice quizzes: Speech Service synthesizes question, listens for response
4. For image quizzes: Image Service generates contextual image, displays question
5. Quiz Engine evaluates response, updates knowledge score
6. Session summary generated and displayed

---

## Components and Interfaces

### 1. Authentication Service (Auth_Service)

**Responsibilities:**
- Manage Civic.ai OAuth flow
- Maintain authenticated session state
- Handle session validation and refresh
- Manage user sign-out

**Key Methods:**
```typescript
interface AuthService {
  initiateLogin(): Promise<void>
  handleAuthCallback(code: string): Promise<AuthSession>
  validateSession(): Promise<boolean>
  refreshSession(): Promise<AuthSession>
  logout(): Promise<void>
  getCurrentUser(): Promise<User | null>
}
```

**Integration Points:**
- Civic.ai OAuth endpoints
- Session storage (secure HTTP-only cookies)
- Firestore user document creation/retrieval

---

### 2. Scanner Service

**Responsibilities:**
- Process uploaded images
- Extract text and identify Q&A pairs using AI vision
- Validate extracted content
- Handle extraction failures gracefully

**Key Methods:**
```typescript
interface ScannerService {
  uploadImage(file: File): Promise<string> // Returns storage URL
  extractFlashcards(imageUrl: string): Promise<ExtractedFlashcard[]>
  validateExtraction(flashcards: ExtractedFlashcard[]): Promise<ValidationResult>
}

interface ExtractedFlashcard {
  question: string
  answer: string
  confidence: number // 0-1
  sourceImageUrl: string
}
```

**Integration Points:**
- Vercel Storage (image persistence)
- AI Vision API (content extraction)
- Firestore (flashcard persistence)

---

### 3. Classifier Service

**Responsibilities:**
- Assign flashcards to existing modules or create new ones
- Generate module topic labels
- Handle module reassignment

**Key Methods:**
```typescript
interface ClassifierService {
  classifyFlashcard(flashcard: Flashcard): Promise<ModuleAssignment>
  findMatchingModule(flashcard: Flashcard): Promise<Module | null>
  createModule(topic: string, userId: string): Promise<Module>
  reassignFlashcard(flashcardId: string, moduleId: string): Promise<void>
}

interface ModuleAssignment {
  moduleId: string
  moduleName: string
  confidence: number
}
```

**Integration Points:**
- Firestore (module and flashcard data)
- AI classification API (topic matching)

---

### 4. Quiz Engine

**Responsibilities:**
- Manage quiz session state and logic
- Select flashcards based on knowledge scores
- Generate exercise variations (free recall, multiple choice, fill-in-blank)
- Evaluate user responses
- Update knowledge scores
- Generate session summaries

**Key Methods:**
```typescript
interface QuizEngine {
  startSession(moduleId: string, userId: string, type: 'voice' | 'image'): Promise<QuizSession>
  getNextQuestion(sessionId: string): Promise<QuizQuestion>
  submitAnswer(sessionId: string, questionId: string, answer: string): Promise<EvaluationResult>
  endSession(sessionId: string): Promise<SessionSummary>
  generateExerciseVariations(flashcard: Flashcard): Promise<ExerciseVariation[]>
  selectFlashcards(moduleId: string, count: number): Promise<Flashcard[]>
}

interface QuizQuestion {
  id: string
  flashcardId: string
  type: 'free_recall' | 'multiple_choice' | 'fill_in_blank'
  question: string
  options?: string[] // For multiple choice
  correctAnswer: string
  imageUrl?: string // For image quizzes
}

interface EvaluationResult {
  isCorrect: boolean
  scoreChange: number
  feedback: string
  correctAnswer: string
}
```

**Integration Points:**
- Firestore (flashcard and session data)
- Speech Service (voice quizzes)
- Image Service (image quizzes)
- AI generation APIs (question and distractor generation)

---

### 5. Speech Service (ElevenLabs Integration)

**Responsibilities:**
- Synthesize speech for quiz questions and feedback
- Capture and transcribe user voice responses
- Manage real-time speech connection
- Handle connection interruptions

**Key Methods:**
```typescript
interface SpeechService {
  synthesizeAndSpeak(text: string): Promise<void>
  startListening(): Promise<void>
  stopListening(): Promise<string> // Returns transcribed text
  greetUser(userName: string, moduleName: string): Promise<void>
  summarizeSession(summary: SessionSummary): Promise<void>
  isConnected(): boolean
  reconnect(): Promise<void>
}
```

**Integration Points:**
- ElevenLabs real-time speech API
- WebSocket for bidirectional communication
- Browser Web Audio API for microphone access

---

### 6. Image Service

**Responsibilities:**
- Generate contextually relevant images for quiz questions
- Handle image generation failures
- Cache generated images

**Key Methods:**
```typescript
interface ImageService {
  generateImage(question: string, context: string): Promise<string> // Returns image URL
  cacheImage(questionId: string, imageUrl: string): Promise<void>
  getCachedImage(questionId: string): Promise<string | null>
}
```

**Integration Points:**
- AI image generation API (DALL-E, Midjourney, or similar)
- Vercel Storage (image caching)
- Firestore (cache metadata)

---

### 7. Canva Service (MCP Integration)

**Responsibilities:**
- Invoke Canva MCP via Civic.ai
- Generate explanation presentations
- Provide presentation links to users
- Handle generation failures

**Key Methods:**
```typescript
interface CanvaService {
  generatePresentation(topic: string, flashcardId?: string): Promise<PresentationResult>
  getPresentationLink(presentationId: string): Promise<string>
}

interface PresentationResult {
  presentationId: string
  editLink: string
  viewLink: string
  status: 'pending' | 'ready' | 'failed'
}
```

**Integration Points:**
- Civic.ai MCP gateway
- Canva API
- Firestore (presentation metadata)

---

## API Routes

### Authentication Routes
- `POST /api/auth/login` - Initiate Civic.ai login
- `GET /api/auth/callback` - Handle OAuth callback
- `POST /api/auth/logout` - Sign out user
- `GET /api/auth/session` - Validate current session

### Flashcard Routes
- `POST /api/flashcards/upload` - Upload image for scanning
- `GET /api/flashcards/:moduleId` - Retrieve flashcards in module
- `POST /api/flashcards` - Create/save flashcard
- `PATCH /api/flashcards/:id` - Update flashcard
- `DELETE /api/flashcards/:id` - Delete flashcard

### Module Routes
- `GET /api/modules` - List user's modules
- `POST /api/modules` - Create module
- `GET /api/modules/:id` - Get module details
- `PATCH /api/modules/:id` - Update module

### Quiz Routes
- `POST /api/quiz/start` - Start quiz session
- `GET /api/quiz/:sessionId/question` - Get next question
- `POST /api/quiz/:sessionId/answer` - Submit answer
- `POST /api/quiz/:sessionId/end` - End session
- `GET /api/quiz/:sessionId/summary` - Get session summary

### Canva Routes
- `POST /api/canva/generate` - Request presentation generation
- `GET /api/canva/:presentationId/status` - Check generation status
- `GET /api/canva/:presentationId/link` - Get presentation link

---

## Data Models and Firestore Structure

### Collections

#### `users`
```typescript
interface User {
  id: string // Civic.ai user ID
  email: string
  name: string
  createdAt: Timestamp
  lastLoginAt: Timestamp
  preferences: {
    quizType: 'voice' | 'image' | 'mixed'
    speechRate: number // 0.5-2.0
    theme: 'light' | 'dark'
  }
}
```

#### `modules`
```typescript
interface Module {
  id: string
  userId: string
  name: string
  description: string
  createdAt: Timestamp
  updatedAt: Timestamp
  flashcardCount: number
  aggregateKnowledgeScore: number // Mean of all flashcard scores
  color?: string // For UI categorization
}
```

#### `flashcards`
```typescript
interface Flashcard {
  id: string
  userId: string
  moduleId: string
  question: string
  answer: string
  knowledgeScore: number // 0-100, initialized to 0
  sourceImageUrl: string
  createdAt: Timestamp
  updatedAt: Timestamp
  lastReviewedAt?: Timestamp
  reviewCount: number
  correctCount: number
  incorrectCount: number
}
```

#### `quiz_sessions`
```typescript
interface QuizSession {
  id: string
  userId: string
  moduleId: string
  type: 'voice' | 'image'
  startedAt: Timestamp
  endedAt?: Timestamp
  status: 'active' | 'paused' | 'completed' | 'abandoned'
  flashcardIds: string[]
  currentFlashcardIndex: number
  responses: QuizResponse[]
  scoreChanges: { [flashcardId: string]: number }
}

interface QuizResponse {
  flashcardId: string
  questionType: 'free_recall' | 'multiple_choice' | 'fill_in_blank'
  userAnswer: string
  isCorrect: boolean
  scoreChange: number
  timestamp: Timestamp
}
```

#### `presentations` (Canva)
```typescript
interface Presentation {
  id: string
  userId: string
  flashcardId?: string
  topic: string
  canvaId: string
  editLink: string
  viewLink: string
  status: 'pending' | 'ready' | 'failed'
  createdAt: Timestamp
  expiresAt: Timestamp
}
```

### Firestore Indexes

- `modules`: userId + createdAt (for listing user's modules)
- `flashcards`: userId + moduleId + knowledgeScore (for quiz selection)
- `quiz_sessions`: userId + status + startedAt (for session history)

---

## UI Screens and Navigation Flow

### Screen Hierarchy

```
Auth Screen
  ↓
Dashboard (Module List)
  ├→ Module Detail (Flashcard List)
  │   ├→ Flashcard Editor
  │   ├→ Voice Quiz Session
  │   ├→ Image Quiz Session
  │   └→ Quiz Results
  ├→ Upload Image
  └→ Settings
```

### Key Screens

#### 1. Authentication Screen
- Civic.ai login button
- Error messaging for failed auth
- Loading state during OAuth flow

#### 2. Dashboard
- List of user's modules with aggregate scores
- "New Module" button
- "Upload Image" button
- Settings/Profile access
- Tamagui components: `YStack`, `XStack`, `Card`, `Button`, `Text`

#### 3. Module Detail
- Flashcard list with question/answer toggle
- Knowledge score display per card
- Edit/delete buttons per card
- "Start Voice Quiz" button
- "Start Image Quiz" button
- "Request Help Presentation" button
- Tamagui components: `FlatList`, `Card`, `Button`, `Badge`

#### 4. Voice Quiz Session
- Current question display
- Microphone indicator (listening/speaking)
- "Show Answer" toggle
- "Next" button
- Session progress indicator
- Real-time speech feedback
- Tamagui components: `YStack`, `Button`, `Text`, `Spinner`

#### 5. Image Quiz Session
- Question text
- AI-generated image
- Text input for answer
- Multiple choice options (if applicable)
- Feedback display
- Progress indicator
- Tamagui components: `YStack`, `XStack`, `Input`, `Button`, `Image`

#### 6. Quiz Results
- Session summary (cards reviewed, correct/incorrect)
- Knowledge score changes
- Module aggregate score update
- "Review Weak Cards" button
- "Return to Module" button
- Tamagui components: `YStack`, `Card`, `Text`, `Button`

#### 7. Flashcard Editor
- Question input field
- Answer input field
- Validation error display
- Save/Cancel buttons
- Tamagui components: `YStack`, `Input`, `Button`, `Text`

#### 8. Upload Image
- Image picker/drag-and-drop zone
- Upload progress indicator
- Extracted flashcards preview
- Confirm/Edit/Cancel buttons
- Tamagui components: `YStack`, `Button`, `Text`, `Spinner`

---

## Integration Points with External Services

### 1. Civic.ai Authentication
- **Flow**: User clicks login → redirected to Civic.ai → callback to `/api/auth/callback` → session created
- **Error Handling**: Display user-friendly error messages; allow retry
- **Session Management**: Store session token in secure HTTP-only cookie; validate on each request

### 2. ElevenLabs Real-Time Speech
- **Connection**: WebSocket connection established at quiz session start
- **Latency Target**: <1 second from question trigger to speech output
- **Fallback**: If connection fails, display question as text; offer resume or end session
- **Transcription**: User speech captured and transcribed in real-time

### 3. Canva MCP via Civic.ai
- **Invocation**: User clicks "Help me understand" → request sent to Civic.ai MCP gateway
- **Async Processing**: Presentation generation may be asynchronous; poll for status
- **Link Delivery**: Once ready, provide edit/view links to user
- **Error Handling**: Notify user if generation fails; allow retry

### 4. AI Vision API (Image Scanning)
- **Input**: Image URL from Vercel Storage
- **Output**: Extracted Q&A pairs with confidence scores
- **Validation**: Discard extractions with low confidence; notify user if no content found
- **Retry Logic**: Allow user to re-upload if extraction fails

### 5. AI Image Generation (Image Quiz)
- **Trigger**: When image quiz question is presented
- **Caching**: Cache generated images to reduce API calls
- **Fallback**: If generation fails, display question without image; continue quiz
- **Context**: Pass question text and module topic for contextual image generation

---

## Error Handling and Resilience Patterns

### Authentication Errors
- **Invalid credentials**: Display error message; allow retry
- **Session expired**: Silently refresh session; if refresh fails, redirect to login
- **Network error**: Display offline message; retry on reconnection

### Image Upload Errors
- **Unsupported format**: Display error; list supported formats
- **File too large**: Display error; show size limit
- **Extraction failed**: Notify user; offer to retry or manually create flashcards
- **Storage error**: Display error; suggest retry

### Quiz Session Errors
- **Speech connection lost**: Notify user; offer resume or end session
- **Image generation failed**: Display question without image; continue quiz
- **Response evaluation error**: Display generic error; allow retry
- **Session data loss**: Recover from Firestore; resume from last checkpoint

### Canva Integration Errors
- **Generation failed**: Notify user with descriptive message; offer retry
- **Timeout**: Display status check UI; allow user to check back later
- **Link expired**: Regenerate presentation link

### Graceful Degradation
- Voice quiz falls back to text-based quiz if speech unavailable
- Image quiz displays questions without images if generation fails
- Canva presentations optional; core quiz functionality unaffected

---

## Performance Considerations

### Frontend Optimization
- **Code Splitting**: Lazy-load quiz and upload screens
- **Image Optimization**: Compress and resize AI-generated images; use WebP format
- **State Management**: Use React context or state library to minimize re-renders
- **Caching**: Cache module and flashcard data locally; sync on background

### Backend Optimization
- **Firestore Queries**: Use indexed queries; batch reads where possible
- **API Response Caching**: Cache module lists and flashcard data with short TTL
- **Async Processing**: Offload image extraction and presentation generation to background jobs
- **Rate Limiting**: Implement rate limits on API endpoints to prevent abuse

### Speech Service Optimization
- **Connection Pooling**: Reuse WebSocket connections across quiz sessions
- **Audio Compression**: Use appropriate audio codec for ElevenLabs
- **Latency Monitoring**: Track and log speech latency; alert if exceeding 1-second target

### Image Generation Optimization
- **Batch Requests**: Queue image generation requests; process in batches
- **Caching**: Store generated images with long TTL; reuse for similar questions
- **CDN Delivery**: Serve cached images from CDN for fast delivery

### Database Optimization
- **Denormalization**: Store aggregate knowledge scores on modules to avoid aggregation queries
- **Archival**: Archive old quiz sessions to separate collection after 90 days
- **Cleanup**: Implement TTL on temporary data (e.g., pending presentations)

### Vercel Deployment
- **Edge Functions**: Use Vercel Edge Functions for low-latency auth and routing
- **Serverless Functions**: Deploy API routes as serverless functions
- **Environment Variables**: Manage API keys and secrets via Vercel environment variables
- **Monitoring**: Enable Vercel Analytics and error tracking

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Image Format and Size Validation

*For any* file upload, if the file format is JPEG, PNG, or WEBP and the file size is ≤20MB, the upload should be accepted; otherwise, it should be rejected with an appropriate error message.

**Validates: Requirements 2.1**

### Property 2: Flashcard Persistence Round Trip

*For any* extracted flashcard that a user confirms, querying the database should return the same flashcard with identical question, answer, and module assignment.

**Validates: Requirements 2.5, 3.1**

### Property 3: Module Classification Consistency

*For any* flashcard with a known topic, the classifier should assign it to a module whose topic matches the flashcard's content, or create a new module if no match exists.

**Validates: Requirements 3.1, 3.2**

### Property 4: Module Display Completeness

*For any* user, the dashboard should display all modules belonging to that user, each with the correct module name and an accurate count of flashcards it contains.

**Validates: Requirements 3.3**

### Property 5: Flashcard Reassignment Persistence

*For any* flashcard that is manually reassigned to a different module, querying the database should reflect the new module assignment, and the flashcard should appear in the new module's list.

**Validates: Requirements 3.4**

### Property 6: Flashcard Display and Toggle

*For any* module, all flashcards should be displayed with the question side shown by default, and toggling should alternate between question and answer sides.

**Validates: Requirements 4.1, 4.2**

### Property 7: Flashcard Edit Validation and Persistence

*For any* flashcard edit with non-empty question and answer fields, the edit should be persisted to the database; edits with empty fields should be rejected with a validation error.

**Validates: Requirements 4.3, 4.4**

### Property 8: Flashcard Deletion and Score Recalculation

*For any* flashcard deleted from a module, the flashcard should be removed from the database, and the module's aggregate knowledge score should be recalculated as the mean of remaining flashcards' scores.

**Validates: Requirements 4.5, 5.5**

### Property 9: Knowledge Score Initialization

*For any* newly created flashcard, its knowledge score should be initialized to 0.

**Validates: Requirements 5.1**

### Property 10: Correct Answer Score Increase

*For any* correct answer during a quiz session, the flashcard's knowledge score should increase by a value between 1 and 10, and the new score should not exceed 100.

**Validates: Requirements 5.2**

### Property 11: Incorrect Answer Score Decrease with Floor

*For any* incorrect answer during a quiz session, the flashcard's knowledge score should decrease by a value between 1 and 10, with a minimum value of 0 (score should never go negative).

**Validates: Requirements 5.3**

### Property 12: Knowledge Score Display

*For any* flashcard in a module view, the flashcard's current knowledge score should be displayed to the user.

**Validates: Requirements 5.4**

### Property 13: Quiz Flashcard Selection by Score

*For any* quiz session, the flashcards selected should be ordered by knowledge score in ascending order, prioritizing flashcards with the lowest scores.

**Validates: Requirements 6.1**

### Property 14: Quiz Response Evaluation and Scoring

*For any* response submitted during a quiz session, the quiz engine should evaluate the response, determine correctness, update the flashcard's knowledge score accordingly, and persist the change.

**Validates: Requirements 6.4, 10.5**

### Property 15: Exercise Type Variety

*For any* quiz session, the generated exercises should include at least three distinct types: free recall, multiple choice, and fill-in-the-blank.

**Validates: Requirements 7.1**

### Property 16: Multiple Choice Question Structure

*For any* multiple-choice question generated, exactly four answer options should be provided, with one correct answer and three plausible distractors.

**Validates: Requirements 7.2**

### Property 17: Distractor Generation Fallback

*For any* module with fewer than four flashcards, when generating multiple-choice questions, distractor options should be generated using AI rather than sourced from existing flashcards.

**Validates: Requirements 7.3**

### Property 18: Image Quiz Question Distinctness

*For any* image quiz session, the generated quiz questions should be distinct from the original flashcard text, providing new phrasing or perspective on the same content.

**Validates: Requirements 10.1**

### Property 19: Image Quiz Text-Only Modality

*For any* image quiz session, all user interactions should occur through text-based UI controls with no voice input or output required.

**Validates: Requirements 10.3**

### Property 20: Adaptive Question Selection in Image Quiz

*For any* image quiz session, subsequent questions should be selected based on prior answers, prioritizing flashcards with lower knowledge scores.

**Validates: Requirements 10.4**

### Property 21: Image Quiz Graceful Degradation

*For any* image quiz question where image generation fails, the question should still be displayed and the quiz should continue uninterrupted without the image.

**Validates: Requirements 10.6**

### Property 22: Page Load Performance

*For any* page navigation, the initial content should render within 3 seconds on a standard broadband connection.

**Validates: Requirements 9.2**

### Property 23: Speech Latency Performance

*For any* quiz session, the speech service should deliver synthesized speech with a latency of no more than 1 second from the time a question is triggered.

**Validates: Requirements 9.3**

---

## Testing Strategy

### Unit Testing
- **Auth Service**: Test login flow, session validation, logout
- **Scanner Service**: Test image upload, extraction, validation
- **Classifier Service**: Test module assignment, topic generation
- **Quiz Engine**: Test question selection, scoring logic, session management
- **Speech Service**: Test speech synthesis, transcription, connection handling
- **Image Service**: Test image generation, caching
- **Canva Service**: Test presentation generation, link retrieval

### Integration Testing
- **Auth → Dashboard**: Test full login flow and dashboard load
- **Upload → Classify → Quiz**: Test end-to-end flashcard creation and quiz
- **Quiz → Scoring**: Test knowledge score updates and persistence
- **Speech → Evaluation**: Test voice input capture and response evaluation
- **Image Generation → Display**: Test image generation and quiz display

### Property-Based Testing
- [Properties to be defined after prework analysis]

### Performance Testing
- **Page Load**: Verify initial content renders within 3 seconds
- **Speech Latency**: Verify speech output latency <1 second
- **Quiz Responsiveness**: Verify quiz interactions respond within 500ms
- **Concurrent Users**: Load test with 100+ concurrent users

### Error Scenario Testing
- **Network Failures**: Simulate network interruptions; verify graceful recovery
- **Service Unavailability**: Mock external service failures; verify fallbacks
- **Invalid Input**: Test with malformed data; verify validation and error messages
- **Session Expiry**: Test session refresh and re-authentication

---

## Deployment and Operations

### Deployment Pipeline
1. Code pushed to main branch
2. GitHub Actions runs tests and linting
3. Build artifacts generated
4. Deployed to Vercel staging environment
5. Manual approval for production deployment
6. Deployed to Vercel production

### Monitoring and Observability
- **Error Tracking**: Sentry for frontend and backend errors
- **Performance Monitoring**: Vercel Analytics for page load times
- **API Monitoring**: Log API response times and error rates
- **Speech Service Monitoring**: Track ElevenLabs connection health and latency
- **Database Monitoring**: Monitor Firestore read/write operations and costs

### Scaling Considerations
- **Firestore**: Use auto-scaling; monitor costs
- **Image Storage**: Use Vercel Storage with CDN; implement cleanup policies
- **Speech Service**: Monitor ElevenLabs concurrent connection limits
- **API Rate Limiting**: Implement per-user rate limits to prevent abuse

