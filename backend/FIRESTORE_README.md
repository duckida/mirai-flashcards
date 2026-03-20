# Firestore Setup - Complete Guide

## Overview

This directory contains the complete Firestore setup for the AI Flashcard Quizzer backend. Firestore is used as the primary database for storing users, modules, flashcards, quiz sessions, and presentations.

## Quick Start (5 minutes)

### 1. Create Firebase Project

```bash
# Go to Firebase Console
# https://console.firebase.google.com

# Create new project: "mirai-flashcards"
# Create Firestore database (Native mode)
# Choose region: us-central1
```

### 2. Generate Service Account Key

```bash
# In Firebase Console:
# Project Settings > Service Accounts > Generate new private key
# Download JSON file
```

### 3. Configure Environment Variables

```bash
# Copy service account JSON to .env.local
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

# Add web app config
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Test Connection

```bash
node lib/firebase/test.js
```

Expected output: `✅ All Firestore tests passed!`

## Documentation

### Setup Guides

- **[FIRESTORE_SETUP.md](./FIRESTORE_SETUP.md)** - Complete step-by-step setup guide
  - Create Firebase project
  - Set up Firestore database
  - Generate service account credentials
  - Configure security rules
  - Create collections and indexes
  - Deploy to Vercel

- **[FIRESTORE_SETUP_CHECKLIST.md](./FIRESTORE_SETUP_CHECKLIST.md)** - Interactive setup checklist
  - Track setup progress
  - Verify each step
  - Troubleshooting guide

### Developer Guides

- **[FIRESTORE_IMPLEMENTATION_GUIDE.md](./FIRESTORE_IMPLEMENTATION_GUIDE.md)** - How to use Firestore in code
  - API reference for all operations
  - Usage examples
  - Error handling
  - Performance tips

- **[FIRESTORE_ARCHITECTURE.md](./FIRESTORE_ARCHITECTURE.md)** - System architecture overview
  - Data flow diagrams
  - Collection relationships
  - Security model
  - Performance optimization
  - Monitoring and observability

- **[FIRESTORE_SUMMARY.md](./FIRESTORE_SUMMARY.md)** - Executive summary
  - What was completed
  - Quick reference
  - Next steps

## File Structure

```
backend/
├── lib/firebase/
│   ├── admin.js              # Firebase Admin SDK initialization
│   ├── firestore.js          # Firestore service layer
│   └── test.js               # Connection test script
├── app/api/
│   └── firestore-example/
│       └── route.js          # Example API route
├── FIRESTORE_SETUP.md        # Setup guide
├── FIRESTORE_SETUP_CHECKLIST.md # Setup checklist
├── FIRESTORE_IMPLEMENTATION_GUIDE.md # Developer guide
├── FIRESTORE_ARCHITECTURE.md # Architecture overview
├── FIRESTORE_SUMMARY.md      # Summary
└── FIRESTORE_README.md       # This file
```

## Core Components

### Firebase Admin SDK (`lib/firebase/admin.js`)

Initializes Firebase with service account credentials.

```javascript
import { getFirestore, getAuth, getStorage } from '@/lib/firebase/admin.js';

const db = getFirestore();
const auth = getAuth();
const storage = getStorage();
```

### Firestore Service (`lib/firebase/firestore.js`)

Provides common database operations.

```javascript
import firestoreService from '@/lib/firebase/firestore.js';

// Create user
await firestoreService.createUser('user-123', {
  email: 'user@example.com',
  name: 'John Doe',
});

// Get user
const user = await firestoreService.getUser('user-123');

// Create module
const moduleId = await firestoreService.createModule('user-123', {
  name: 'Biology 101',
});

// Create flashcard
const flashcardId = await firestoreService.createFlashcard('user-123', {
  moduleId,
  question: 'What is photosynthesis?',
  answer: 'The process by which plants convert light into chemical energy',
});
```

### Test Script (`lib/firebase/test.js`)

Tests Firestore connection with write, read, update, delete operations.

```bash
node lib/firebase/test.js
```

## Collections

### 1. `users`
User profile information.

**Fields:** id, email, name, preferences, createdAt, lastLoginAt

### 2. `modules`
Topic-based groupings of flashcards.

**Fields:** id, userId, name, description, flashcardCount, aggregateKnowledgeScore, color, createdAt, updatedAt

### 3. `flashcards`
Individual flashcard data.

**Fields:** id, userId, moduleId, question, answer, knowledgeScore, sourceImageUrl, reviewCount, correctCount, incorrectCount, createdAt, updatedAt, lastReviewedAt

### 4. `quiz_sessions`
Quiz session data and responses.

**Fields:** id, userId, moduleId, type, status, flashcardIds, currentFlashcardIndex, responses, scoreChanges, startedAt, endedAt

### 5. `presentations`
Canva presentation metadata.

**Fields:** id, userId, flashcardId, topic, canvaId, editLink, viewLink, status, createdAt, expiresAt

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

## Environment Variables

### Required

```env
# Service Account (choose one method)
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
# OR
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Web App Config
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

## Testing

### Test Firestore Connection

```bash
cd backend
node lib/firebase/test.js
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

## Deployment

### Add to Vercel

1. Go to Vercel Dashboard > Project Settings > Environment Variables
2. Add all Firebase variables
3. Set to Production and Preview environments
4. Deploy: `vercel --prod`

## Troubleshooting

### "FIREBASE_SERVICE_ACCOUNT_JSON is not set"

**Solution:**
1. Verify `.env.local` contains the variable
2. Ensure JSON is on a single line (no line breaks)
3. Restart development server: `npm run dev`

### "Permission denied" errors

**Solution:**
1. Verify security rules are published in Firebase Console
2. Check that `userId` in data matches `request.auth.uid`
3. Ensure user is authenticated before accessing Firestore

### "Composite index not found"

**Solution:**
1. Firebase will provide a link to create the index
2. Click the link or manually create in Firebase Console
3. Wait for index to build (1-5 minutes)

### "Cannot find module 'firebase-admin'"

**Solution:**
1. Run `npm install` to install dependencies
2. Verify `firebase-admin` is in `package.json`

See [FIRESTORE_SETUP_CHECKLIST.md](./FIRESTORE_SETUP_CHECKLIST.md) for more troubleshooting.

## Next Steps

1. **Implement Authentication Service** - Use Civic.ai OAuth with Firestore user creation
2. **Implement Scanner Service** - Upload images and extract flashcards
3. **Implement Classifier Service** - Assign flashcards to modules
4. **Implement Quiz Engine** - Create quiz sessions and evaluate responses
5. **Implement Speech Service** - Integrate ElevenLabs for voice quizzes
6. **Implement Image Service** - Generate contextual images for image quizzes

## References

- [Firebase Console](https://console.firebase.google.com)
- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/database/admin/start)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firestore Indexes](https://firebase.google.com/docs/firestore/query-data/index-overview)
- [Firebase Pricing](https://firebase.google.com/pricing)

## Support

For issues or questions:
1. Check [FIRESTORE_SETUP_CHECKLIST.md](./FIRESTORE_SETUP_CHECKLIST.md) troubleshooting section
2. Review [FIRESTORE_IMPLEMENTATION_GUIDE.md](./FIRESTORE_IMPLEMENTATION_GUIDE.md) for usage examples
3. Check Firebase Console for errors and logs
4. Review Firestore security rules for permission issues

---

**Status:** ✅ Firestore setup complete and ready for use

**Last Updated:** 2024

