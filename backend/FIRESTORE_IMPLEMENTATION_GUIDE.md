# Firestore Implementation Guide

This guide explains how to use the Firestore service layer in your API routes and services.

## Overview

The Firestore setup includes:
- **Firebase Admin SDK** (`lib/firebase/admin.js`) - Initializes Firebase with service account credentials
- **Firestore Service** (`lib/firebase/firestore.js`) - Provides common database operations
- **Test Script** (`lib/firebase/test.js`) - Verifies Firestore connection

## Quick Start

### 1. Import the Firestore Service

```javascript
import firestoreService from '@/lib/firebase/firestore.js';
```

### 2. Use Common Operations

```javascript
// Create a user
const userId = 'user-123';
await firestoreService.createUser(userId, {
  email: 'user@example.com',
  name: 'John Doe',
  preferences: {
    quizType: 'voice',
    speechRate: 1.0,
    theme: 'light',
  },
});

// Get a user
const user = await firestoreService.getUser(userId);

// Update a user
await firestoreService.updateUser(userId, {
  preferences: { quizType: 'image' },
});
```

## API Reference

### Users Collection

#### `createUser(userId, userData)`
Create a new user document.

**Parameters:**
- `userId` (string): User's Civic.ai ID
- `userData` (object): User data (email, name, preferences, etc.)

**Returns:** Promise<void>

**Example:**
```javascript
await firestoreService.createUser('civic-user-123', {
  email: 'user@example.com',
  name: 'Jane Smith',
  preferences: {
    quizType: 'mixed',
    speechRate: 1.2,
    theme: 'dark',
  },
});
```

#### `getUser(userId)`
Get user document by ID.

**Parameters:**
- `userId` (string): User ID

**Returns:** Promise<Object|null>

**Example:**
```javascript
const user = await firestoreService.getUser('civic-user-123');
if (user) {
  console.log(user.email, user.name);
}
```

#### `updateUser(userId, updates)`
Update user document.

**Parameters:**
- `userId` (string): User ID
- `updates` (object): Fields to update

**Returns:** Promise<void>

**Example:**
```javascript
await firestoreService.updateUser('civic-user-123', {
  preferences: { theme: 'dark' },
  lastLoginAt: new Date(),
});
```

### Modules Collection

#### `createModule(userId, moduleData)`
Create a new module.

**Parameters:**
- `userId` (string): Owner's user ID
- `moduleData` (object): Module data (name, description, color, etc.)

**Returns:** Promise<string> - Module ID

**Example:**
```javascript
const moduleId = await firestoreService.createModule('user-123', {
  name: 'Biology 101',
  description: 'Introduction to Biology',
  color: 'blue',
});
```

#### `getModule(moduleId)`
Get module by ID.

**Parameters:**
- `moduleId` (string): Module ID

**Returns:** Promise<Object|null>

**Example:**
```javascript
const module = await firestoreService.getModule('module-456');
console.log(module.name, module.flashcardCount);
```

#### `getUserModules(userId)`
Get all modules for a user.

**Parameters:**
- `userId` (string): User ID

**Returns:** Promise<Array>

**Example:**
```javascript
const modules = await firestoreService.getUserModules('user-123');
modules.forEach(module => {
  console.log(module.name, module.aggregateKnowledgeScore);
});
```

#### `updateModule(moduleId, updates)`
Update module.

**Parameters:**
- `moduleId` (string): Module ID
- `updates` (object): Fields to update

**Returns:** Promise<void>

**Example:**
```javascript
await firestoreService.updateModule('module-456', {
  name: 'Biology 102',
  aggregateKnowledgeScore: 75,
});
```

#### `deleteModule(moduleId)`
Delete module.

**Parameters:**
- `moduleId` (string): Module ID

**Returns:** Promise<void>

**Example:**
```javascript
await firestoreService.deleteModule('module-456');
```

### Flashcards Collection

#### `createFlashcard(userId, flashcardData)`
Create a new flashcard.

**Parameters:**
- `userId` (string): Owner's user ID
- `flashcardData` (object): Flashcard data (question, answer, moduleId, sourceImageUrl, etc.)

**Returns:** Promise<string> - Flashcard ID

**Example:**
```javascript
const flashcardId = await firestoreService.createFlashcard('user-123', {
  moduleId: 'module-456',
  question: 'What is photosynthesis?',
  answer: 'The process by which plants convert light into chemical energy',
  sourceImageUrl: 'https://example.com/image.jpg',
});
```

#### `getFlashcard(flashcardId)`
Get flashcard by ID.

**Parameters:**
- `flashcardId` (string): Flashcard ID

**Returns:** Promise<Object|null>

**Example:**
```javascript
const flashcard = await firestoreService.getFlashcard('flashcard-789');
console.log(flashcard.question, flashcard.knowledgeScore);
```

#### `getModuleFlashcards(moduleId)`
Get all flashcards in a module, ordered by knowledge score (ascending).

**Parameters:**
- `moduleId` (string): Module ID

**Returns:** Promise<Array>

**Example:**
```javascript
const flashcards = await firestoreService.getModuleFlashcards('module-456');
// Flashcards are ordered by knowledge score (lowest first)
flashcards.forEach(card => {
  console.log(card.question, card.knowledgeScore);
});
```

#### `getUserFlashcards(userId)`
Get all flashcards for a user.

**Parameters:**
- `userId` (string): User ID

**Returns:** Promise<Array>

**Example:**
```javascript
const allFlashcards = await firestoreService.getUserFlashcards('user-123');
console.log(`User has ${allFlashcards.length} flashcards`);
```

#### `updateFlashcard(flashcardId, updates)`
Update flashcard.

**Parameters:**
- `flashcardId` (string): Flashcard ID
- `updates` (object): Fields to update

**Returns:** Promise<void>

**Example:**
```javascript
await firestoreService.updateFlashcard('flashcard-789', {
  knowledgeScore: 75,
  reviewCount: 5,
  correctCount: 4,
  lastReviewedAt: new Date(),
});
```

#### `deleteFlashcard(flashcardId)`
Delete flashcard.

**Parameters:**
- `flashcardId` (string): Flashcard ID

**Returns:** Promise<void>

**Example:**
```javascript
await firestoreService.deleteFlashcard('flashcard-789');
```

#### `deleteModuleFlashcards(moduleId)`
Delete all flashcards in a module.

**Parameters:**
- `moduleId` (string): Module ID

**Returns:** Promise<number> - Number of deleted flashcards

**Example:**
```javascript
const deletedCount = await firestoreService.deleteModuleFlashcards('module-456');
console.log(`Deleted ${deletedCount} flashcards`);
```

### Quiz Sessions Collection

#### `createQuizSession(userId, sessionData)`
Create a new quiz session.

**Parameters:**
- `userId` (string): User ID
- `sessionData` (object): Session data (moduleId, type, flashcardIds, etc.)

**Returns:** Promise<string> - Session ID

**Example:**
```javascript
const sessionId = await firestoreService.createQuizSession('user-123', {
  moduleId: 'module-456',
  type: 'voice',
  flashcardIds: ['card-1', 'card-2', 'card-3'],
  currentFlashcardIndex: 0,
});
```

#### `getQuizSession(sessionId)`
Get quiz session by ID.

**Parameters:**
- `sessionId` (string): Session ID

**Returns:** Promise<Object|null>

**Example:**
```javascript
const session = await firestoreService.getQuizSession('session-123');
console.log(session.status, session.responses.length);
```

#### `getUserQuizSessions(userId)`
Get all quiz sessions for a user.

**Parameters:**
- `userId` (string): User ID

**Returns:** Promise<Array>

**Example:**
```javascript
const sessions = await firestoreService.getUserQuizSessions('user-123');
sessions.forEach(session => {
  console.log(session.moduleId, session.status);
});
```

#### `updateQuizSession(sessionId, updates)`
Update quiz session.

**Parameters:**
- `sessionId` (string): Session ID
- `updates` (object): Fields to update

**Returns:** Promise<void>

**Example:**
```javascript
await firestoreService.updateQuizSession('session-123', {
  status: 'completed',
  endedAt: new Date(),
  scoreChanges: { 'card-1': 5, 'card-2': -2 },
});
```

#### `addQuizResponse(sessionId, response)`
Add a response to a quiz session.

**Parameters:**
- `sessionId` (string): Session ID
- `response` (object): Response object

**Returns:** Promise<void>

**Example:**
```javascript
await firestoreService.addQuizResponse('session-123', {
  flashcardId: 'card-1',
  questionType: 'free_recall',
  userAnswer: 'The process of photosynthesis',
  isCorrect: true,
  scoreChange: 5,
  timestamp: new Date(),
});
```

### Presentations Collection

#### `createPresentation(userId, presentationData)`
Create a new presentation.

**Parameters:**
- `userId` (string): User ID
- `presentationData` (object): Presentation data (topic, flashcardId, canvaId, editLink, viewLink, etc.)

**Returns:** Promise<string> - Presentation ID

**Example:**
```javascript
const presentationId = await firestoreService.createPresentation('user-123', {
  topic: 'Photosynthesis',
  flashcardId: 'card-789',
  canvaId: 'canva-123',
  editLink: 'https://canva.com/edit/...',
  viewLink: 'https://canva.com/view/...',
});
```

#### `getPresentation(presentationId)`
Get presentation by ID.

**Parameters:**
- `presentationId` (string): Presentation ID

**Returns:** Promise<Object|null>

**Example:**
```javascript
const presentation = await firestoreService.getPresentation('pres-123');
console.log(presentation.topic, presentation.status);
```

#### `getUserPresentations(userId)`
Get all presentations for a user.

**Parameters:**
- `userId` (string): User ID

**Returns:** Promise<Array>

**Example:**
```javascript
const presentations = await firestoreService.getUserPresentations('user-123');
presentations.forEach(pres => {
  console.log(pres.topic, pres.status);
});
```

#### `updatePresentation(presentationId, updates)`
Update presentation.

**Parameters:**
- `presentationId` (string): Presentation ID
- `updates` (object): Fields to update

**Returns:** Promise<void>

**Example:**
```javascript
await firestoreService.updatePresentation('pres-123', {
  status: 'ready',
  editLink: 'https://canva.com/edit/...',
});
```

#### `deletePresentation(presentationId)`
Delete presentation.

**Parameters:**
- `presentationId` (string): Presentation ID

**Returns:** Promise<void>

**Example:**
```javascript
await firestoreService.deletePresentation('pres-123');
```

## Usage in API Routes

### Example: Create Module Endpoint

```javascript
// app/api/modules/route.js
import firestoreService from '@/lib/firebase/firestore.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, name, description } = body;

    // Validate input
    if (!userId || !name) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create module
    const moduleId = await firestoreService.createModule(userId, {
      name,
      description,
    });

    return Response.json({
      success: true,
      moduleId,
      message: 'Module created successfully',
    });
  } catch (error) {
    console.error('Error creating module:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### Example: Get Module Flashcards Endpoint

```javascript
// app/api/modules/[moduleId]/flashcards/route.js
import firestoreService from '@/lib/firebase/firestore.js';

export async function GET(request, { params }) {
  try {
    const { moduleId } = params;

    // Get flashcards
    const flashcards = await firestoreService.getModuleFlashcards(moduleId);

    return Response.json({
      success: true,
      flashcards,
      count: flashcards.length,
    });
  } catch (error) {
    console.error('Error fetching flashcards:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### Example: Update Flashcard Knowledge Score

```javascript
// app/api/flashcards/[flashcardId]/score/route.js
import firestoreService from '@/lib/firebase/firestore.js';

export async function PATCH(request, { params }) {
  try {
    const { flashcardId } = params;
    const body = await request.json();
    const { scoreChange } = body;

    // Get current flashcard
    const flashcard = await firestoreService.getFlashcard(flashcardId);
    if (!flashcard) {
      return Response.json(
        { error: 'Flashcard not found' },
        { status: 404 }
      );
    }

    // Calculate new score (0-100)
    const newScore = Math.max(0, Math.min(100, flashcard.knowledgeScore + scoreChange));

    // Update flashcard
    await firestoreService.updateFlashcard(flashcardId, {
      knowledgeScore: newScore,
      reviewCount: flashcard.reviewCount + 1,
      correctCount: scoreChange > 0 ? flashcard.correctCount + 1 : flashcard.correctCount,
      incorrectCount: scoreChange < 0 ? flashcard.incorrectCount + 1 : flashcard.incorrectCount,
      lastReviewedAt: new Date(),
    });

    return Response.json({
      success: true,
      flashcardId,
      newScore,
      scoreChange,
    });
  } catch (error) {
    console.error('Error updating score:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

## Error Handling

All Firestore operations may throw errors. Always wrap calls in try-catch:

```javascript
try {
  const user = await firestoreService.getUser(userId);
} catch (error) {
  console.error('Firestore error:', error);
  // Handle error appropriately
  return Response.json(
    { error: 'Database error' },
    { status: 500 }
  );
}
```

Common errors:
- **Permission denied**: User doesn't have access to document
- **Not found**: Document doesn't exist
- **Invalid argument**: Invalid query or data
- **Unavailable**: Firestore service temporarily unavailable

## Performance Tips

1. **Use Indexes**: Create composite indexes for complex queries
2. **Batch Operations**: Use `getBatch()` for multiple writes
3. **Limit Results**: Use `.limit()` in queries to reduce data transfer
4. **Cache Results**: Cache frequently accessed data in memory
5. **Denormalize Data**: Store aggregate scores on modules to avoid aggregation queries

## Testing

Test Firestore connection:

```bash
cd backend
node lib/firebase/test.js
```

Test API routes:

```bash
# Create a user
curl -X POST http://localhost:3000/api/firestore-example/user \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-123","email":"test@example.com","name":"Test User"}'

# Get a user
curl http://localhost:3000/api/firestore-example/user?userId=test-123
```

## Next Steps

1. Implement authentication service with Civic.ai
2. Implement scanner service for image processing
3. Implement classifier service for module assignment
4. Implement quiz engine for quiz sessions
5. Implement speech service for voice quizzes
6. Implement image service for image generation

