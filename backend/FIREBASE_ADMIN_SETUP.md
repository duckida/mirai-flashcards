# Firebase Admin SDK Configuration Guide

## Overview

This guide explains how the Firebase Admin SDK is configured for the AI Flashcard Quizzer backend. The Admin SDK enables server-side operations with Firestore, including user management, flashcard persistence, quiz session tracking, and more.

## Current Configuration Status

✅ **Firebase Admin SDK is properly configured and tested**

- Firebase Admin SDK v12.0.0 is installed
- Service account credentials are loaded from environment variables
- Firestore connection is verified and working
- All CRUD operations are functional

## Environment Setup

### 1. Service Account Credentials

The Firebase Admin SDK requires service account credentials to authenticate with Firebase. These credentials are stored in the `FIREBASE_SERVICE_ACCOUNT_JSON` environment variable.

**Important:** The JSON must be a **single-line string** with no line breaks. This is critical for proper parsing.

### 2. Getting Service Account Credentials

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (mirai-flashcards)
3. Navigate to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. A JSON file will be downloaded

### 3. Converting to Single-Line Format

The downloaded JSON file has multiple lines. You need to convert it to a single line:

**Option A: Using jq (recommended)**
```bash
cat service-account.json | jq -c . > single-line.json
cat single-line.json
```

**Option B: Using Python**
```bash
python3 -c "import json; print(json.dumps(json.load(open('service-account.json'))))"
```

**Option C: Using Node.js**
```bash
node -e "console.log(JSON.stringify(require('./service-account.json')))"
```

### 4. Setting the Environment Variable

Copy the single-line JSON and add it to `.env.local`:

```bash
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"mirai-flashcards",...}
```

## Configuration Files

### admin.js
Located at: `backend/lib/firebase/admin.js`

This file handles Firebase Admin SDK initialization:
- Loads environment variables using dotenv
- Validates service account credentials
- Initializes the Firebase Admin app
- Provides helper functions to access Firestore, Auth, and Storage

**Key Functions:**
- `initializeAdmin()` - Initializes the Admin SDK
- `getFirestore()` - Returns Firestore database instance
- `getAuth()` - Returns Firebase Auth instance
- `getStorage()` - Returns Firebase Storage instance

### firestore.js
Located at: `backend/lib/firebase/firestore.js`

This file provides a service layer for Firestore operations:
- User management (create, read, update)
- Module management (CRUD operations)
- Flashcard management (CRUD operations)
- Quiz session management
- Presentation management
- Batch operations

**Key Class:**
- `FirestoreService` - Provides all Firestore operations

### test.js
Located at: `backend/lib/firebase/test.js`

This file tests the Firebase Admin SDK connection:
- Verifies environment variables are loaded
- Tests write, read, update, and delete operations
- Tests collection queries
- Provides detailed error messages for troubleshooting

**Run the test:**
```bash
cd backend
node lib/firebase/test.js
```

## Usage Examples

### Initialize Firebase Admin SDK

```javascript
import { initializeAdmin, getFirestore } from '@/lib/firebase/admin.js';

// Initialize (called automatically on first use)
const app = initializeAdmin();

// Get Firestore instance
const db = getFirestore();
```

### Using FirestoreService

```javascript
import firestoreService from '@/lib/firebase/firestore.js';

// Create a user
await firestoreService.createUser('user-id', {
  email: 'user@example.com',
  name: 'John Doe',
  preferences: {
    quizType: 'voice',
    speechRate: 1.0,
    theme: 'light',
  },
});

// Get a user
const user = await firestoreService.getUser('user-id');

// Create a module
const moduleId = await firestoreService.createModule('user-id', {
  name: 'Biology 101',
  description: 'Introduction to Biology',
});

// Get module flashcards
const flashcards = await firestoreService.getModuleFlashcards(moduleId);
```

### Using in API Routes

```javascript
// backend/app/api/example/route.js
import firestoreService from '@/lib/firebase/firestore.js';

export async function GET(request) {
  try {
    const userId = request.headers.get('x-user-id');
    const modules = await firestoreService.getUserModules(userId);
    
    return Response.json({
      success: true,
      modules,
    });
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

## Firestore Collections

The following collections are used by the application:

### users
- Stores user profiles and preferences
- Document ID: Civic.ai user ID
- Fields: email, name, preferences, createdAt, lastLoginAt

### modules
- Stores topic-based groupings of flashcards
- Fields: userId, name, description, flashcardCount, aggregateKnowledgeScore, createdAt, updatedAt

### flashcards
- Stores individual flashcards
- Fields: userId, moduleId, question, answer, knowledgeScore, sourceImageUrl, createdAt, updatedAt, reviewCount, correctCount, incorrectCount

### quiz_sessions
- Stores quiz session data
- Fields: userId, moduleId, type, status, flashcardIds, responses, scoreChanges, startedAt, endedAt

### presentations
- Stores Canva presentation metadata
- Fields: userId, flashcardId, topic, canvaId, editLink, viewLink, status, createdAt, expiresAt

## Firestore Indexes

The following composite indexes are recommended for optimal query performance:

1. **modules**: userId + createdAt (for listing user's modules)
2. **flashcards**: userId + moduleId + knowledgeScore (for quiz selection)
3. **quiz_sessions**: userId + status + startedAt (for session history)

These indexes are automatically created by Firestore when you run queries that require them.

## Error Handling

### Common Errors

**Error: FIREBASE_SERVICE_ACCOUNT_JSON is not set**
- Solution: Ensure `.env.local` file exists and contains the FIREBASE_SERVICE_ACCOUNT_JSON variable

**Error: FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON**
- Solution: Ensure the JSON is on a single line with no line breaks. Use the conversion tools mentioned above.

**Error: Missing required fields in service account**
- Solution: Verify the service account JSON contains: type, project_id, private_key, client_email

**Error: Permission denied when accessing Firestore**
- Solution: Check Firestore security rules in Firebase Console. For development, you can use:
  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /{document=**} {
        allow read, write: if request.auth != null;
      }
    }
  }
  ```

## Development vs Production

### Development (.env.local)
- Uses service account credentials from `.env.local`
- dotenv automatically loads environment variables
- Suitable for local development and testing

### Production (Vercel)
- Set environment variables in Vercel dashboard
- Navigate to: Project Settings → Environment Variables
- Add `FIREBASE_SERVICE_ACCOUNT_JSON` with the single-line JSON value
- Vercel will automatically provide these to the deployed application

## Security Best Practices

1. **Never commit .env.local to version control** - It contains sensitive credentials
2. **Use .gitignore** - Ensure `.env.local` is in `.gitignore`
3. **Rotate service account keys regularly** - Generate new keys periodically
4. **Use Firestore security rules** - Restrict access based on user authentication
5. **Enable audit logging** - Monitor access to Firestore in Firebase Console
6. **Use environment variables** - Never hardcode credentials in code

## Testing

### Run the Connection Test

```bash
cd backend
npm install  # If not already installed
node lib/firebase/test.js
```

Expected output:
```
✓ Firebase Admin SDK initialized
✓ Successfully wrote test document
✓ Successfully read test document
✓ Successfully updated test document
✓ Successfully deleted test document
✓ Successfully queried collection
✅ All Firestore tests passed!
```

### Test in API Route

```bash
# Start the development server
npm run dev

# In another terminal, test the API
curl http://localhost:3000/api/firestore-example/test
```

## Next Steps

1. ✅ Firebase Admin SDK is configured
2. ✅ Firestore connection is verified
3. Next: Implement authentication service (Phase 2)
4. Next: Implement image upload and scanning (Phase 3)
5. Next: Implement flashcard management (Phase 5)

## References

- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Console](https://console.firebase.google.com)
- [Service Account Setup](https://firebase.google.com/docs/admin/setup#initialize_the_sdk)

## Support

For issues or questions:
1. Check the error messages in the test output
2. Review the troubleshooting section above
3. Check Firebase Console for any service issues
4. Review Firestore security rules
5. Verify environment variables are correctly set
