# Design Document: AI Flashcard Quizzer

## Overview

The AI Flashcard Quizzer is a web application that enables users to digitize physical notes into interactive flashcards through image scanning, organize them into topic-based modules, and engage with them through multiple quiz modalities including voice-based sessions and AI-assisted visual quizzes. The system leverages AI vision for content extraction, real-time speech synthesis for interactive quizzing, and generative AI for dynamic question creation and visual content generation.

### Key Design Principles

- **Modular Architecture**: Clear separation between authentication, content management, quiz engines, and external service integrations
- **Progressive Enhancement**: Core functionality works without voice or images; advanced features enhance the experience
- **Resilience**: Graceful degradation when external services are unavailable
- **User-Centric Scoring**: Knowledge scores drive personalized quiz difficulty and content prioritization
- **Modern UI**: React + Tailwind CSS + shadcn/ui provides beautiful, consistent components

---

## Architecture

### System Layers

```
┌─────────────────────────────────────────────────────────────┐
│              UI Layer (React + Tailwind CSS + shadcn/ui)    │
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
3. Scanner service calls AI vision API to extract raw content from the card
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
```javascript
/**
 * @typedef {Object} AuthService
 * @property {() => Promise<void>} initiateLogin
 * @property {(code: string) => Promise<AuthSession>} handleAuthCallback
 * @property {() => Promise<boolean>} validateSession
 * @property {() => Promise<AuthSession>} refreshSession
 * @property {() => Promise<void>} logout
 * @property {() => Promise<User | null>} getCurrentUser
 */
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
```javascript
/**
 * @typedef {Object} ScannerService
 * @property {(file: File) => Promise<string>} uploadImage - Returns storage URL
 * @property {(imageUrl: string) => Promise<ExtractedFlashcard[]>} extractFlashcards
 * @property {(flashcards: ExtractedFlashcard[]) => Promise<ValidationResult>} validateExtraction
 */

/**
 * @typedef {Object} ExtractedFlashcard
 * @property {string} content - Raw OCR text extracted from the card (single-sided)
 * @property {string[]} drawingDescriptions - Brief descriptions of any drawings/diagrams
 * @property {number} confidence - 0-1
 * @property {string} sourceImageUrl
 */
```
```

**Integration Points:**
- Vercel Storage (image persistence)
- AI Vision API (content extraction)
- Firestore (flashcard persistence)

---

### 3. Classifier Service

**Responsibilities:**
- Assign flashcards to existing modules or create new ones
**Key Methods:**
```javascript
/**
 * @typedef {Object} ClassifierService
 * @property {(flashcard: Flashcard) => Promise<ModuleAssignment>} classifyFlashcard
 * @property {(flashcard: Flashcard) => Promise<Module | null>} findMatchingModule
 * @property {(topic: string, userId: string) => Promise<Module>} createModule
 * @property {(flashcardId: string, moduleId: string) => Promise<void>} reassignFlashcard
 */

/**
 * @typedef {Object} ModuleAssignment
 * @property {string} moduleId
 * @property {string} moduleName
 * @property {number} confidence
 */
```oduleName: string
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
**Key Methods:**
```javascript
/**
 * @typedef {Object} QuizEngine
 * @property {(moduleId: string, userId: string, type: 'voice' | 'image') => Promise<QuizSession>} startSession
 * @property {(sessionId: string) => Promise<QuizQuestion>} getNextQuestion
 * @property {(sessionId: string, questionId: string, answer: string) => Promise<EvaluationResult>} submitAnswer
 * @property {(sessionId: string) => Promise<SessionSummary>} endSession
 * @property {(flashcard: Flashcard) => Promise<ExerciseVariation[]>} generateExerciseVariations
 * @property {(moduleId: string, count: number) => Promise<Flashcard[]>} selectFlashcards
 */

/**
 * @typedef {Object} QuizQuestion
 * @property {string} id
 * @property {string} flashcardId
 * @property {'free_recall' | 'multiple_choice' | 'fill_in_blank'} type
 * @property {string} question
 * @property {string[]} [options] - For multiple choice
 * @property {string} correctAnswer
 * @property {string} [imageUrl] - For image quizzes
 */

/**
 * @typedef {Object} EvaluationResult
 * @property {boolean} isCorrect
 * @property {number} scoreChange
 * @property {string} feedback
 * @property {string} correctAnswer
 */
```sCorrect: boolean
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

**Key Methods:**
```javascript
/**
 * @typedef {Object} SpeechService
 * @property {(text: string) => Promise<void>} synthesizeAndSpeak
 * @property {() => Promise<void>} startListening
 * @property {() => Promise<string>} stopListening - Returns transcribed text
 * @property {(userName: string, moduleName: string) => Promise<void>} greetUser
 * @property {(summary: SessionSummary) => Promise<void>} summarizeSession
 * @property {() => boolean} isConnected
 * @property {() => Promise<void>} reconnect
 */
```ynthesizeAndSpeak(text: string): Promise<void>
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

**Key Methods:**
```javascript
/**
 * @typedef {Object} ImageService
 * @property {(question: string, context: string) => Promise<string>} generateImage - Returns image URL
 * @property {(questionId: string, imageUrl: string) => Promise<void>} cacheImage
 * @property {(questionId: string) => Promise<string | null>} getCachedImage
 */
```ache generated images

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

**Key Methods:**
```javascript
/**
 * @typedef {Object} CanvaService
 * @property {(topic: string, flashcardId?: string) => Promise<PresentationResult>} generatePresentation
 * @property {(presentationId: string) => Promise<string>} getPresentationLink
 */

/**
 * @typedef {Object} PresentationResult
 * @property {string} presentationId
 * @property {string} editLink
 * @property {string} viewLink
 * @property {'pending' | 'ready' | 'failed'} status
 */
```eneratePresentation(topic: string, flashcardId?: string): Promise<PresentationResult>
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
#### `users`
```javascript
/**
 * @typedef {Object} User
 * @property {string} id - Civic.ai user ID
 * @property {string} email
 * @property {string} name
 * @property {Timestamp} createdAt
 * @property {Timestamp} lastLoginAt
 * @property {Object} preferences
 * @property {'voice' | 'image' | 'mixed'} preferences.quizType
 * @property {number} preferences.speechRate - 0.5-2.0
 * @property {'light' | 'dark'} preferences.theme
 */
```erface User {
  id: string // Civic.ai user ID
#### `modules`
```javascript
/**
 * @typedef {Object} Module
 * @property {string} id
 * @property {string} userId
 * @property {string} name
 * @property {string} description
 * @property {Timestamp} createdAt
 * @property {Timestamp} updatedAt
 * @property {number} flashcardCount
 * @property {number} aggregateKnowledgeScore - Mean of all flashcard scores
 * @property {string} [color] - For UI categorization
 */
```typescript
#### `flashcards`
```javascript
/**
 * @typedef {Object} Flashcard
 * @property {string} id
 * @property {string} userId
 * @property {string} moduleId
 * @property {string} content - Raw OCR text from the card (single-sided; no separate question/answer fields)
 * @property {string[]} drawingDescriptions - Brief descriptions of any drawings/diagrams on the card
 * @property {number} knowledgeScore - 0-100, initialized to 0
 * @property {string} sourceImageUrl
 * @property {Timestamp} createdAt
 * @property {Timestamp} updatedAt
 * @property {Timestamp} [lastReviewedAt]
 * @property {number} reviewCount
 * @property {number} correctCount
 * @property {number} incorrectCount
 */
```serId: string
#### `quiz_sessions`
```javascript
/**
 * @typedef {Object} QuizSession
 * @property {string} id
 * @property {string} userId
 * @property {string} moduleId
 * @property {'voice' | 'image'} type
 * @property {Timestamp} startedAt
 * @property {Timestamp} [endedAt]
 * @property {'active' | 'paused' | 'completed' | 'abandoned'} status
 * @property {string[]} flashcardIds
 * @property {number} currentFlashcardIndex
 * @property {QuizResponse[]} responses
 * @property {Object.<string, number>} scoreChanges
 */

/**
 * @typedef {Object} QuizResponse
 * @property {string} flashcardId
 * @property {'free_recall' | 'multiple_choice' | 'fill_in_blank'} questionType
 * @property {string} userAnswer
 * @property {boolean} isCorrect
 * @property {number} scoreChange
 * @property {Timestamp} timestamp
 */
#### `presentations` (Canva)
```javascript
/**
 * @typedef {Object} Presentation
 * @property {string} id
 * @property {string} userId
 * @property {string} [flashcardId]
 * @property {string} topic
 * @property {string} canvaId
 * @property {string} editLink
 * @property {string} viewLink
 * @property {'pending' | 'ready' | 'failed'} status
 * @property {Timestamp} createdAt
 * @property {Timestamp} expiresAt
 */
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
- Tailwind CSS with shadcn/ui components: `Card`, `Button`, `Badge`, `Progress`, `Spinner`

#### 3. Module Detail
- Flashcard list with content display
- Knowledge score display per card
- Edit/delete buttons per card
- "Start Voice Quiz" button
- "Start Image Quiz" button
- "Request Help Presentation" button
- shadcn/ui components: `Card`, `Button`, `Badge`, `Progress`

#### 4. Voice Quiz Session
- Current question display
- Microphone indicator (listening/speaking)
- "Show Answer" toggle
- "Next" button
- Session progress indicator
- Real-time speech feedback
- shadcn/ui components: `Button`, `Spinner`, `CardContent`

#### 5. Image Quiz Session
- Question text
- AI-generated image
- Text input for answer
- Multiple choice options (if applicable)
- Feedback display
- Progress indicator
- shadcn/ui components: `Card`, `CardContent`, `Input`, `Button`, `Image`

#### 6. Quiz Results
- Session summary (cards reviewed, correct/incorrect)
- Knowledge score changes
- Module aggregate score update
- "Review Weak Cards" button
- "Return to Module" button
- shadcn/ui components: `Card`, `Button`, `Badge`

#### 7. Flashcard Editor
- Content text area (single-sided)
- Validation error display
- Save/Cancel buttons
- shadcn/ui components: `Textarea`, `Button`

#### 8. Upload Image
- Image picker/drag-and-drop zone
- Upload progress indicator
- Extracted flashcards preview
- Confirm/Edit/Cancel buttons
- shadcn/ui components: `Button`, `Spinner`, `CardContent`

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

*For any* extracted flashcard that a user confirms, querying the database should return the same flashcard with identical content and module assignment.

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

### Property 6: Flashcard Content Display

*For any* module, all flashcards should be displayed showing their full content text.

**Validates: Requirements 4.1, 4.2**

### Property 7: Flashcard Edit Validation and Persistence

*For any* flashcard edit with a non-empty content field, the edit should be persisted to the database; edits with empty content should be rejected with a validation error.

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

### Dual Testing Approach

This feature requires both unit/integration tests and property-based tests for comprehensive coverage:

- **Unit Tests**: Verify specific examples, edge cases, and error conditions
- **Property Tests**: Verify universal properties across all inputs
- **Together**: Comprehensive coverage (unit tests catch concrete bugs, property tests verify general correctness)

### Unit Testing

**Auth Service**
- Test login flow with valid Civic.ai credentials
- Test session validation and refresh
- Test logout and session invalidation
- Test error handling for failed auth

**Scanner Service**
- Test image upload with valid formats (JPEG, PNG, WEBP)
- Test rejection of unsupported formats
- Test rejection of files >20MB
- Test extraction with images containing recognizable content
- Test error handling when no content is found

**Classifier Service**
- Test module assignment for flashcards with ma
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

