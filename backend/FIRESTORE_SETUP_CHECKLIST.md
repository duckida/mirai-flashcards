# Firestore Setup Checklist

This checklist guides you through setting up Firestore for the AI Flashcard Quizzer application.

## Phase 1: Firebase Project Creation

- [ ] **Create Firebase Project**
  - Go to [Firebase Console](https://console.firebase.google.com)
  - Click "Add project"
  - Enter project name: `mirai-flashcards`
  - Accept terms and create project
  - Note your **Project ID** (e.g., `mirai-flashcards-abc123`)

- [ ] **Create Firestore Database**
  - In Firebase Console, go to **Build** > **Firestore Database**
  - Click "Create database"
  - Select **Native mode**
  - Choose region (e.g., `us-central1`)
  - Click "Create"
  - Wait for initialization (1-2 minutes)

## Phase 2: Service Account Configuration

- [ ] **Generate Service Account Key**
  - In Firebase Console, go to **Project Settings** (gear icon)
  - Click **Service Accounts** tab
  - Ensure **Node.js** is selected
  - Click **"Generate new private key"**
  - Save the downloaded JSON file securely

- [ ] **Extract Service Account Credentials**
  - Open the downloaded JSON file
  - Copy the entire JSON content
  - Note the following fields:
    - `project_id`
    - `private_key`
    - `client_email`

## Phase 3: Environment Variables Setup

- [ ] **Update `.env.local`**
  - Open `backend/.env.local`
  - Add Firebase service account JSON:
    ```env
    FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}
    ```
  - Or use individual fields:
    ```env
    FIREBASE_PROJECT_ID=your-project-id
    FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
    FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
    ```

- [ ] **Get Web App Configuration**
  - In Firebase Console, go to **Project Settings** > **General**
  - Scroll to **"Your apps"** section
  - Click **"Add app"** > **Web** (</> icon)
  - Register app with name `mirai-flashcards-web`
  - Copy the Firebase config

- [ ] **Add Web App Config to `.env.local`**
  ```env
  NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
  NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
  NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
  ```

## Phase 4: Firestore Security Rules

- [ ] **Configure Security Rules**
  - In Firebase Console, go to **Firestore Database** > **Rules**
  - Replace default rules with:
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
  - Click **"Publish"**

## Phase 5: Backend Setup

- [ ] **Install Firebase Admin SDK**
  ```bash
  cd backend
  npm install firebase-admin
  ```

- [ ] **Verify Firebase Admin Module**
  - Check that `backend/lib/firebase/admin.js` exists
  - Check that `backend/lib/firebase/firestore.js` exists
  - Check that `backend/lib/firebase/test.js` exists

- [ ] **Test Firestore Connection**
  ```bash
  cd backend
  node lib/firebase/test.js
  ```
  - Expected output: "✅ All Firestore tests passed!"
  - If test fails, check troubleshooting section below

## Phase 6: Vercel Deployment Setup

- [ ] **Add Environment Variables to Vercel**
  - Go to [Vercel Dashboard](https://vercel.com/dashboard)
  - Select `backend` project
  - Go to **Settings** > **Environment Variables**
  - Add each Firebase variable:
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
  - Set environment to **Production** and **Preview**
  - Click **"Save"**

- [ ] **Verify Vercel Deployment**
  - Deploy to Vercel: `vercel --prod`
  - Check deployment logs for Firebase initialization
  - Verify no errors in Vercel dashboard

## Phase 7: Firestore Collections and Indexes

- [ ] **Create Collections** (auto-created on first write)
  - `users` - User profiles
  - `modules` - Topic-based groupings
  - `flashcards` - Individual flashcards
  - `quiz_sessions` - Quiz session data
  - `presentations` - Canva presentation metadata

- [ ] **Create Composite Indexes** (if needed)
  - `modules`: `userId` + `createdAt`
  - `flashcards`: `userId` + `moduleId` + `knowledgeScore`
  - `quiz_sessions`: `userId` + `status` + `startedAt`
  - Note: Firestore will prompt you to create indexes when needed

## Phase 8: Verification

- [ ] **Local Development**
  - Start dev server: `npm run dev`
  - Check for Firebase initialization errors
  - Verify no console errors related to Firestore

- [ ] **Production Deployment**
  - Deploy to Vercel: `vercel --prod`
  - Check Vercel deployment logs
  - Verify Firestore connection in production

- [ ] **Firebase Console Verification**
  - Go to Firebase Console
  - Navigate to **Firestore Database**
  - Verify database is active and accessible
  - Check **Rules** tab to confirm security rules are published

## Troubleshooting

### "FIREBASE_SERVICE_ACCOUNT_JSON is not set"

**Cause**: Environment variable not configured

**Solution**:
1. Verify `.env.local` contains `FIREBASE_SERVICE_ACCOUNT_JSON`
2. Ensure JSON is on a single line (no line breaks)
3. Restart development server: `npm run dev`
4. Run test again: `node lib/firebase/test.js`

### "Permission denied" errors

**Cause**: Firestore security rules blocking access

**Solution**:
1. Verify security rules are published in Firebase Console
2. Check that `userId` in data matches `request.auth.uid`
3. Ensure user is authenticated before accessing Firestore
4. Review security rules for typos or logic errors

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
1. Generate a new service account key in Firebase Console
2. Verify JSON is valid (use JSON validator)
3. Ensure private key includes newlines: `\n`
4. Update environment variable with new JSON

### "Cannot find module 'firebase-admin'"

**Cause**: Firebase Admin SDK not installed

**Solution**:
1. Install firebase-admin: `npm install firebase-admin`
2. Verify it's in `package.json` dependencies
3. Run `npm install` again to ensure all dependencies are installed

### "Firestore database not found"

**Cause**: Firestore database not created in Firebase Console

**Solution**:
1. Go to Firebase Console
2. Navigate to **Build** > **Firestore Database**
3. Click **"Create database"**
4. Select **Native mode** and choose region
5. Wait for initialization

## Next Steps

Once Firestore is set up and verified:

1. **Implement Authentication Service** - Use Civic.ai OAuth with Firestore user creation
2. **Implement Scanner Service** - Upload images and extract flashcards
3. **Implement Classifier Service** - Assign flashcards to modules
4. **Implement Quiz Engine** - Create quiz sessions and evaluate responses
5. **Implement Speech Service** - Integrate ElevenLabs for voice quizzes
6. **Implement Image Service** - Generate contextual images for image quizzes

## References

- [Firebase Console](https://console.firebase.google.com)
- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/database/admin/start)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firestore Indexes](https://firebase.google.com/docs/firestore/query-data/index-overview)
- [Firebase Pricing](https://firebase.google.com/pricing)

---

## Quick Reference

### Environment Variables Needed

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

### Test Command

```bash
cd backend
node lib/firebase/test.js
```

### Collections Schema

| Collection | Purpose | Key Fields |
|-----------|---------|-----------|
| `users` | User profiles | `id`, `email`, `name`, `preferences` |
| `modules` | Topic groupings | `userId`, `name`, `flashcardCount`, `aggregateKnowledgeScore` |
| `flashcards` | Individual cards | `userId`, `moduleId`, `question`, `answer`, `knowledgeScore` |
| `quiz_sessions` | Quiz data | `userId`, `moduleId`, `type`, `status`, `responses` |
| `presentations` | Canva data | `userId`, `topic`, `canvaId`, `status` |

