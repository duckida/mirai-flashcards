# Firestore Project Setup Guide

This guide walks through setting up a Firebase project with Firestore database and configuring the Firebase Admin SDK for the AI Flashcard Quizzer backend.

## Overview

Firestore is used for:
- User data persistence (users collection)
- Flashcard storage (flashcards collection)
- Module organization (modules collection)
- Quiz session tracking (quiz_sessions collection)
- Canva presentation metadata (presentations collection)

## Prerequisites

- Google account
- Access to [Firebase Console](https://console.firebase.google.com)
- Node.js and npm installed locally
- Backend project initialized (already done)

---

## Step 1: Create a Firebase Project

### Via Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Add project"** or **"Create a project"**
3. Enter project name: `mirai-flashcards` (or your preferred name)
4. Accept the terms and click **"Continue"**
5. Choose whether to enable Google Analytics (optional, recommended for production)
6. Click **"Create project"**
7. Wait for project creation to complete (1-2 minutes)

### Project ID

Once created, note your **Project ID** (visible in project settings). This is used in environment variables.

---

## Step 2: Create a Firestore Database

### Enable Firestore

1. In Firebase Console, go to **Build** section (left sidebar)
2. Click **"Firestore Database"**
3. Click **"Create database"**
4. Choose **"Native mode"** (recommended for this app)
5. Select a region (recommended: closest to your users, e.g., `us-central1`)
6. Click **"Create"**
7. Wait for database initialization (1-2 minutes)

### Database Location

Once created, note your **Database Location** (e.g., `us-central1`). This is used in Firestore security rules.

---

## Step 3: Create a Service Account for Backend

The Firebase Admin SDK uses a service account to authenticate with Firestore from your backend.

### Generate Service Account Key

1. In Firebase Console, go to **Project Settings** (gear icon, top right)
2. Click **"Service Accounts"** tab
3. Ensure **"Node.js"** is selected in the SDK dropdown
4. Click **"Generate new private key"**
5. A JSON file will download automatically
6. **Keep this file secure** - it contains sensitive credentials

### Service Account JSON Structure

The downloaded JSON file contains:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

---

## Step 4: Configure Environment Variables

### Local Development Setup

1. Copy the service account JSON content
2. Update `backend/.env.local`:

**Option A: Full JSON (Recommended)**
```env
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"your-project-id",...}
```

**Option B: Individual Fields**
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"
```

### Web App Configuration

1. In Firebase Console, go to **Project Settings** > **General**
2. Scroll to **"Your apps"** section
3. Click **"Add app"** > **Web** (</> icon)
4. Register your app with name `mirai-flashcards-web`
5. Copy the Firebase config

### Update Environment Variables

Add to `backend/.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

---

## Step 5: Install Firebase Admin SDK

### Install Dependencies

```bash
cd backend
npm install firebase-admin
```

This adds the Firebase Admin SDK to your project.

---

## Step 6: Create Firebase Admin Initialization Module

Create `backend/lib/firebase/admin.js`:

```javascript
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
let adminApp;

export function initializeAdmin() {
  if (adminApp) {
    return adminApp;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  
  if (!serviceAccountJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set');
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch (error) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON');
  }

  adminApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });

  return adminApp;
}

export function getFirestore() {
  const app = initializeAdmin();
  return admin.firestore(app);
}

export function getAuth() {
  const app = initializeAdmin();
  return admin.auth(app);
}

export default {
  initializeAdmin,
  getFirestore,
  getAuth,
};
```

---

## Step 7: Configure Firestore Security Rules

Firestore security rules control who can read/write data. Set up rules to ensure users can only access their own data.

### Update Security Rules

1. In Firebase Console, go to **Firestore Database**
2. Click **"Rules"** tab
3. Replace the default rules with:

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

4. Click **"Publish"** to apply the rules

### Security Rules Explanation

- **Authentication Check**: `request.auth != null` ensures user is authenticated
- **User Isolation**: `request.auth.uid == userId` ensures users can only access their own documents
- **Create Validation**: `request.resource.data.userId == request.auth.uid` ensures users can only create documents for themselves

---

## Step 8: Create Firestore Collections and Indexes

### Collections Overview

The app uses five main collections:

#### 1. `users` Collection
Stores user profile information.

**Document ID**: User's Civic.ai ID
**Fields**:
- `id` (string): Civic.ai user ID
- `email` (string): User email
- `name` (string): User name
- `createdAt` (timestamp): Account creation time
- `lastLoginAt` (timestamp): Last login time
- `preferences` (object):
  - `quizType` (string): 'voice' | 'image' | 'mixed'
  - `speechRate` (number): 0.5-2.0
  - `theme` (string): 'light' | 'dark'

#### 2. `modules` Collection
Stores topic-based groupings of flashcards.

**Document ID**: Auto-generated
**Fields**:
- `id` (string): Document ID
- `userId` (string): Owner's user ID
- `name` (string): Module name
- `description` (string): Module description
- `createdAt` (timestamp): Creation time
- `updatedAt` (timestamp): Last update time
- `flashcardCount` (number): Number of flashcards
- `aggregateKnowledgeScore` (number): Mean of all flashcard scores
- `color` (string): UI categorization color

#### 3. `flashcards` Collection
Stores individual flashcard data.

**Document ID**: Auto-generated
**Fields**:
- `id` (string): Document ID
- `userId` (string): Owner's user ID
- `moduleId` (string): Parent module ID
- `question` (string): Question text
- `answer` (string): Answer text
- `knowledgeScore` (number): 0-100, initialized to 0
- `sourceImageUrl` (string): URL of source image
- `createdAt` (timestamp): Creation time
- `updatedAt` (timestamp): Last update time
- `lastReviewedAt` (timestamp): Last quiz review time
- `reviewCount` (number): Total reviews
- `correctCount` (number): Correct answers
- `incorrectCount` (number): Incorrect answers

#### 4. `quiz_sessions` Collection
Stores quiz session data and responses.

**Document ID**: Auto-generated
**Fields**:
- `id` (string): Document ID
- `userId` (string): User who took the quiz
- `moduleId` (string): Module being quizzed
- `type` (string): 'voice' | 'image'
- `startedAt` (timestamp): Session start time
- `endedAt` (timestamp): Session end time
- `status` (string): 'active' | 'paused' | 'completed' | 'abandoned'
- `flashcardIds` (array): IDs of flashcards in session
- `currentFlashcardIndex` (number): Current position
- `responses` (array): Array of response objects
- `scoreChanges` (object): Map of flashcardId → score change

#### 5. `presentations` Collection
Stores Canva presentation metadata.

**Document ID**: Auto-generated
**Fields**:
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

### Create Indexes

Firestore automatically creates single-field indexes. For composite queries, create these indexes:

1. **modules**: `userId` + `createdAt` (for listing user's modules)
2. **flashcards**: `userId` + `moduleId` + `knowledgeScore` (for quiz selection)
3. **quiz_sessions**: `userId` + `status` + `startedAt` (for session history)

**To create indexes**:
1. In Firebase Console, go to **Firestore Database** > **Indexes**
2. Click **"Create Index"**
3. Select collection, fields, and sort order
4. Click **"Create"**

Or Firestore will prompt you to create indexes when you run queries that need them.

---

## Step 9: Set Up Vercel Environment Variables

### Add to Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your `backend` project
3. Go to **Settings** > **Environment Variables**
4. Add each Firebase variable:
   - `FIREBASE_SERVICE_ACCOUNT_JSON`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`

5. Set environment to **Production** and **Preview**
6. Click **"Save"**

### Via Vercel CLI

```bash
cd backend
vercel env add FIREBASE_SERVICE_ACCOUNT_JSON
vercel env add FIREBASE_PROJECT_ID
# ... repeat for each variable
```

---

## Step 10: Test Firestore Connection

### Create Test Script

Create `backend/lib/firebase/test.js`:

```javascript
import { getFirestore } from './admin.js';

async function testFirestoreConnection() {
  try {
    const db = getFirestore();
    
    // Test write
    const testRef = db.collection('test').doc('connection-test');
    await testRef.set({
      message: 'Firestore connection successful',
      timestamp: new Date(),
    });
    
    console.log('✓ Write test passed');
    
    // Test read
    const doc = await testRef.get();
    if (doc.exists) {
      console.log('✓ Read test passed');
      console.log('Document data:', doc.data());
    }
    
    // Clean up
    await testRef.delete();
    console.log('✓ Delete test passed');
    
    console.log('\n✓ All Firestore tests passed!');
  } catch (error) {
    console.error('✗ Firestore test failed:', error.message);
    process.exit(1);
  }
}

testFirestoreConnection();
```

### Run Test

```bash
cd backend
node lib/firebase/test.js
```

Expected output:
```
✓ Write test passed
✓ Read test passed
✓ Delete test passed

✓ All Firestore tests passed!
```

---

## Step 11: Create Firestore Service Layer

Create `backend/lib/firebase/firestore.js` for common Firestore operations:

```javascript
import { getFirestore } from './admin.js';

export class FirestoreService {
  constructor() {
    this.db = getFirestore();
  }

  // Users
  async createUser(userId, userData) {
    await this.db.collection('users').doc(userId).set({
      id: userId,
      ...userData,
      createdAt: new Date(),
      lastLoginAt: new Date(),
    });
  }

  async getUser(userId) {
    const doc = await this.db.collection('users').doc(userId).get();
    return doc.exists ? doc.data() : null;
  }

  async updateUser(userId, updates) {
    await this.db.collection('users').doc(userId).update({
      ...updates,
      updatedAt: new Date(),
    });
  }

  // Modules
  async createModule(userId, moduleData) {
    const ref = await this.db.collection('modules').add({
      userId,
      ...moduleData,
      flashcardCount: 0,
      aggregateKnowledgeScore: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return ref.id;
  }

  async getModule(moduleId) {
    const doc = await this.db.collection('modules').doc(moduleId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  async getUserModules(userId) {
    const snapshot = await this.db
      .collection('modules')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  // Flashcards
  async createFlashcard(userId, flashcardData) {
    const ref = await this.db.collection('flashcards').add({
      userId,
      ...flashcardData,
      knowledgeScore: 0,
      reviewCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return ref.id;
  }

  async getFlashcard(flashcardId) {
    const doc = await this.db.collection('flashcards').doc(flashcardId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  async getModuleFlashcards(moduleId) {
    const snapshot = await this.db
      .collection('flashcards')
      .where('moduleId', '==', moduleId)
      .orderBy('knowledgeScore', 'asc')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async updateFlashcard(flashcardId, updates) {
    await this.db.collection('flashcards').doc(flashcardId).update({
      ...updates,
      updatedAt: new Date(),
    });
  }

  async deleteFlashcard(flashcardId) {
    await this.db.collection('flashcards').doc(flashcardId).delete();
  }

  // Quiz Sessions
  async createQuizSession(userId, sessionData) {
    const ref = await this.db.collection('quiz_sessions').add({
      userId,
      ...sessionData,
      status: 'active',
      responses: [],
      scoreChanges: {},
      startedAt: new Date(),
    });
    return ref.id;
  }

  async getQuizSession(sessionId) {
    const doc = await this.db.collection('quiz_sessions').doc(sessionId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  async updateQuizSession(sessionId, updates) {
    await this.db.collection('quiz_sessions').doc(sessionId).update(updates);
  }

  // Presentations
  async createPresentation(userId, presentationData) {
    const ref = await this.db.collection('presentations').add({
      userId,
      ...presentationData,
      status: 'pending',
      createdAt: new Date(),
    });
    return ref.id;
  }

  async getPresentation(presentationId) {
    const doc = await this.db.collection('presentations').doc(presentationId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  async updatePresentation(presentationId, updates) {
    await this.db.collection('presentations').doc(presentationId).update(updates);
  }
}

export default new FirestoreService();
```

---

## Step 12: Verify Setup

### Checklist

- [ ] Firebase project created
- [ ] Firestore database created (Native mode)
- [ ] Service account key generated and downloaded
- [ ] Environment variables configured in `.env.local`
- [ ] Firebase Admin SDK installed (`npm install firebase-admin`)
- [ ] Firebase admin initialization module created
- [ ] Firestore security rules published
- [ ] Firestore connection test passed
- [ ] Firestore service layer created
- [ ] Environment variables added to Vercel dashboard

---

## Troubleshooting

### "FIREBASE_SERVICE_ACCOUNT_JSON is not set"

**Cause**: Environment variable not configured

**Solution**:
1. Verify `.env.local` contains `FIREBASE_SERVICE_ACCOUNT_JSON`
2. Restart development server: `npm run dev`
3. Check that JSON is valid (no line breaks in middle of string)

### "Permission denied" errors

**Cause**: Firestore security rules blocking access

**Solution**:
1. Verify security rules are published
2. Check that `userId` in data matches `request.auth.uid`
3. Ensure user is authenticated before accessing Firestore

### "Composite index not found"

**Cause**: Query requires an index that doesn't exist

**Solution**:
1. Firebase will provide a link to create the index
2. Click the link or manually create in Firebase Console
3. Wait for index to build (1-5 minutes)
4. Retry the query

### "Service account key is invalid"

**Cause**: JSON is malformed or corrupted

**Solution**:
1. Generate a new service account key
2. Verify JSON is valid (use JSON validator)
3. Ensure private key includes newlines: `\n`
4. Update environment variable

---

## Next Steps

1. **Implement Authentication Service**: Use Civic.ai OAuth with Firestore user creation
2. **Implement Scanner Service**: Upload images and extract flashcards
3. **Implement Classifier Service**: Assign flashcards to modules
4. **Implement Quiz Engine**: Create quiz sessions and evaluate responses
5. **Implement Speech Service**: Integrate ElevenLabs for voice quizzes
6. **Implement Image Service**: Generate contextual images for image quizzes

---

## References

- [Firebase Console](https://console.firebase.google.com)
- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/database/admin/start)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firestore Indexes](https://firebase.google.com/docs/firestore/query-data/index-overview)
- [Firebase Pricing](https://firebase.google.com/pricing)

</content>
