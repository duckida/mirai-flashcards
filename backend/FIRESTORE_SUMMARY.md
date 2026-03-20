# Firestore Setup Summary

## Task 1.2: Set up Firestore project and authentication

This document summarizes the Firestore setup for the AI Flashcard Quizzer backend.

## What Was Completed

### 1. Documentation Created

- **FIRESTORE_SETUP.md** - Complete step-by-step guide for setting up Firebase and Firestore
- **FIRESTORE_SETUP_CHECKLIST.md** - Interactive checklist for tracking setup progress
- **FIRESTORE_IMPLEMENTATION_GUIDE.md** - Developer guide for using Firestore in code
- **FIRESTORE_SUMMARY.md** - This file

### 2. Backend Infrastructure

#### Firebase Admin SDK Module (`lib/firebase/admin.js`)
- Initializes Firebase Admin SDK with service account credentials
- Provides functions to get Firestore, Auth, and Storage instances
- Includes error handling and validation

#### Firestore Service Layer (`lib/firebase/firestore.js`)
- Provides common database operations for all collections
- Implements CRUD operations for:
  - Users collection
  - Modules collection
  - Flashcards collection
  - Quiz Sessions collection
  - Presentations collection
- Includes batch operations support

#### Test Script (`lib/firebase/test.js`)
- Tests Firestore connection with write, read, update, delete operations
- Provides clear success/failure feedback
- Includes troubleshooting guidance

#### Example API Route (`app/api/firestore-example/route.js`)
- Demonstrates how to use Firestore service in API routes
- Shows CRUD operations for users
- Can be removed in production

### 3. Dependencies

Updated `package.json` to include:
- `firebase-admin@^12.0.0` - Firebase Admin SDK for Node.js

## Setup Instructions

### Quick Start (5 minutes)

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create new project named `mirai-flashcards`
   - Create Firestore database (Native mode)

2. **Generate Service Account Key**
   - In Firebase Console: Project Settings > Service Accounts
   - Generate new private key (Node.js)
   - Download JSON file

3. **Configure Environment Variables**
   - Copy service account JSON to `FIREBASE_SERVICE_ACCOUNT_JSON` in `.env.local`
   - Add web app config variables (NEXT_PUBLIC_FIREBASE_*)

4. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

5. **Test Connection**
   ```bash
   node lib/firebase/test.js
   ```

### Detailed Setup

Follow the step-by-step guide in **FIRESTORE_SETUP.md** for:
- Creating Firebase project
- Setting up Firestore database
- Generating service account credentials
- Configuring security rules
- Creating collections and indexes
- Setting up Vercel environment variables

## Environment Variables Required

### Service Account (choose one method)

**Method 1: Full JSON (Recommended)**
```env
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}
```

**Method 2: Individual Fields**
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Web App Configuration
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

## Firestore Collections

### 1. `users` Collection
Stores user profile information.

**Fields:**
- `id` (string): Civic.ai user ID
- `email` (string): User email
- `name` (string): User name
- `preferences` (object): User preferences
- `createdAt` (timestamp): Account creation time
- `lastLoginAt` (timestamp): Last login time

### 2. `modules` Collection
Stores topic-based groupings of flashcards.

**Fields:**
- `id` (string): Document ID
- `userId` (string): Owner's user ID
- `name` (string): Module name
- `description` (string): Module description
- `flashcardCount` (number): Number of flashcards
- `aggregateKnowledgeScore` (number): Mean of all flashcard scores
- `color` (string): UI categorization color
- `createdAt` (timestamp): Creation time
- `updatedAt` (timestamp): Last update time

### 3. `flashcards` Collection
Stores individual flashcard data.

**Fields:**
- `id` (string): Document ID
- `userId` (string): Owner's user ID
- `moduleId` (string): Parent module ID
- `question` (string): Question text
- `answer` (string): Answer text
- `knowledgeScore` (number): 0-100, initialized to 0
- `sourceImageUrl` (string): URL of source image
- `reviewCount` (number): Total reviews
- `correctCount` (number): Correct answers
- `incorrectCount` (number): Incorrect answers
- `createdAt` (timestamp): Creation time
- `updatedAt` (timestamp): Last update time
- `lastReviewedAt` (timestamp): Last quiz review time

### 4. `quiz_sessions` Collection
Stores quiz session data and responses.

**Fields:**
- `id` (string): Document ID
- `userId` (string): User who took the quiz
- `moduleId` (string): Module being quizzed
- `type` (string): 'voice' | 'image'
- `status` (string): 'active' | 'paused' | 'completed' | 'abandoned'
- `flashcardIds` (array): IDs of flashcards in session
- `currentFlashcardIndex` (number): Current position
- `responses` (array): Array of response objects
- `scoreChanges` (object): Map of flashcardId → score change
- `startedAt` (timestamp): Session start time
- `endedAt` (timestamp): Session end time

### 5. `presentations` Collection
Stores Canva presentation metadata.

**Fields:**
- `id` (string): Document ID
- `userId` (string): User who requested presentation
- `flashcardId` (string, optional): Associated flashcard
- `topic` (string): Presentation topic
- `canvaId` (string): Canva presentation ID
- `editLink` (string): Canva edit link
- `viewLink` (string): Canva view link
- `status` (string): 'pending' | 'ready' | 'failed'
- `createdAt` (timestamp): Creation time
- `expiresAt` (timestamp): Link expiration time

## Security Rules

Firestore security rules ensure users can only access their own data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Modules: users can only access their own modules
    match /modules/{moduleId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }
    
    // Flashcards: users can only access their own flashcards
    match /flashcards/{flashcardId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }
    
    // Quiz Sessions: users can only access their own sessions
    match /quiz_sessions/{sessionId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }
    
    // Presentations: users can only access their own presentations
    match /presentations/{presentationId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
    }
  }
}
```

## Using Firestore in Code

### Import the Service

```javascript
import firestoreService from '@/lib/firebase/firestore.js';
```

### Common Operations

```javascript
// Create a user
await firestoreService.createUser('user-123', {
  email: 'user@example.com',
  name: 'John Doe',
});

// Get a user
const user = await firestoreService.getUser('user-123');

// Create a module
const moduleId = await firestoreService.createModule('user-123', {
  name: 'Biology 101',
  description: 'Introduction to Biology',
});

// Create a flashcard
const flashcardId = await firestoreService.createFlashcard('user-123', {
  moduleId,
  question: 'What is photosynthesis?',
  answer: 'The process by which plants convert light into chemical energy',
});

// Get module flashcards (ordered by knowledge score)
const flashcards = await firestoreService.getModuleFlashcards(moduleId);

// Update flashcard knowledge score
await firestoreService.updateFlashcard(flashcardId, {
  knowledgeScore: 75,
  reviewCount: 5,
});
```

See **FIRESTORE_IMPLEMENTATION_GUIDE.md** for complete API reference.

## Testing

### Test Firestore Connection

```bash
cd backend
node lib/firebase/test.js
```

Expected output:
```
🔍 Testing Firestore connection...

✓ Firebase Admin SDK initialized

📝 Test 1: Write operation
✓ Successfully wrote test document

📖 Test 2: Read operation
✓ Successfully read test document
  Document data: { message: '...', timestamp: ... }

✏️  Test 3: Update operation
✓ Successfully updated test document
  Updated data: { message: 'Updated message', ... }

🗑️  Test 4: Delete operation
✓ Successfully deleted test document

🔍 Test 5: Collection query
✓ Successfully queried collection (found 0 documents)

==================================================
✅ All Firestore tests passed!
==================================================
```

### Test API Routes

```bash
# Start development server
npm run dev

# Create a user
curl -X POST http://localhost:3000/api/firestore-example/user \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-123","email":"test@example.com","name":"Test User"}'

# Get a user
curl http://localhost:3000/api/firestore-example/user?userId=test-123
```

## Deployment to Vercel

1. **Add Environment Variables**
   - Go to Vercel Dashboard > Project Settings > Environment Variables
   - Add all Firebase variables
   - Set to Production and Preview environments

2. **Deploy**
   ```bash
   vercel --prod
   ```

3. **Verify**
   - Check Vercel deployment logs
   - Verify no Firebase initialization errors

## Troubleshooting

### "FIREBASE_SERVICE_ACCOUNT_JSON is not set"
- Verify `.env.local` contains the variable
- Ensure JSON is on a single line (no line breaks)
- Restart development server

### "Permission denied" errors
- Verify security rules are published in Firebase Console
- Check that `userId` in data matches `request.auth.uid`
- Ensure user is authenticated before accessing Firestore

### "Composite index not found"
- Firebase will provide a link to create the index
- Click the link or manually create in Firebase Console
- Wait for index to build (1-5 minutes)

### "Cannot find module 'firebase-admin'"
- Run `npm install` to install dependencies
- Verify `firebase-admin` is in `package.json`

See **FIRESTORE_SETUP.md** for more troubleshooting tips.

## Next Steps

1. **Implement Authentication Service** - Use Civic.ai OAuth with Firestore user creation
2. **Implement Scanner Service** - Upload images and extract flashcards
3. **Implement Classifier Service** - Assign flashcards to modules
4. **Implement Quiz Engine** - Create quiz sessions and evaluate responses
5. **Implement Speech Service** - Integrate ElevenLabs for voice quizzes
6. **Implement Image Service** - Generate contextual images for image quizzes

## Files Created

- `backend/FIRESTORE_SETUP.md` - Complete setup guide
- `backend/FIRESTORE_SETUP_CHECKLIST.md` - Interactive checklist
- `backend/FIRESTORE_IMPLEMENTATION_GUIDE.md` - Developer guide
- `backend/FIRESTORE_SUMMARY.md` - This file
- `backend/lib/firebase/admin.js` - Firebase Admin SDK initialization
- `backend/lib/firebase/firestore.js` - Firestore service layer
- `backend/lib/firebase/test.js` - Connection test script
- `backend/app/api/firestore-example/route.js` - Example API route

## References

- [Firebase Console](https://console.firebase.google.com)
- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/database/admin/start)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firestore Indexes](https://firebase.google.com/docs/firestore/query-data/index-overview)
- [Firebase Pricing](https://firebase.google.com/pricing)

---

**Status:** ✅ Firestore project setup and authentication infrastructure complete

**Ready for:** Next phase - Authentication Service Implementation (Task 2.1)

