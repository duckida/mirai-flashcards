# Environment Variables Setup Guide

This guide explains how to obtain and configure all required environment variables for the AI Flashcard Quizzer application.

## Quick Start

1. Copy the example file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Follow the sections below to obtain credentials for each service

3. Update `.env.local` with your actual values

4. Never commit `.env.local` to version control (already in `.gitignore`)

---

## Required Services and Credentials

### 1. Application Configuration

#### `SESSION_SECRET`
**Purpose:** Encrypts session cookies for secure authentication

**How to obtain:**
```bash
openssl rand -base64 32
```

**Example:**
```
SESSION_SECRET=Xk7mP9qR2sT5vW8yZ1aC4dF6gH9jK0lN3oP6qR9sT2u
```

---

### 2. Civic.ai Authentication

**Purpose:** OAuth-based user authentication

**How to obtain:**
1. Visit [Civic.ai Developer Portal](https://civic.ai/developers)
2. Create a new application
3. Configure OAuth redirect URI: `http://localhost:3000/api/auth/callback` (development) or `https://your-domain.vercel.app/api/auth/callback` (production)
4. Copy Client ID and Client Secret

**Required variables:**
```env
CIVIC_CLIENT_ID=your-civic-client-id
CIVIC_CLIENT_SECRET=your-civic-client-secret
CIVIC_CALLBACK_URL=http://localhost:3000/api/auth/callback
```

**API Endpoints (standard):**
```env
CIVIC_AUTH_URL=https://auth.civic.ai/oauth/authorize
CIVIC_TOKEN_URL=https://auth.civic.ai/oauth/token
CIVIC_USER_INFO_URL=https://auth.civic.ai/oauth/userinfo
```

---

### 3. ElevenLabs Real-Time Speech

**Purpose:** Voice synthesis and transcription for voice-based quizzes

**How to obtain:**
1. Visit [ElevenLabs](https://elevenlabs.io)
2. Sign up or log in
3. Navigate to Settings > API Keys
4. Generate a new API key
5. Choose a voice from the Voice Library and copy its Voice ID

**Required variables:**
```env
ELEVENLABS_API_KEY=your-elevenlabs-api-key
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM  # Example: Rachel voice
ELEVENLABS_WS_URL=wss://api.elevenlabs.io/v1/text-to-speech/stream
```

**Popular Voice IDs:**
- Rachel: `21m00Tcm4TlvDq8ikWAM`
- Adam: `pNInz6obpgDQGcFmaJgB`
- Bella: `EXAVITQu4vr4xnSDxMaL`

**Documentation:** [ElevenLabs API Docs](https://elevenlabs.io/docs)

---

### 4. Canva MCP Integration

**Purpose:** Generate explanation presentations via Civic.ai gateway

**How to obtain:**
1. Contact Civic.ai support for MCP gateway access
2. Request Canva MCP integration credentials
3. Obtain gateway URL and API key

**Required variables:**
```env
CIVIC_MCP_GATEWAY_URL=https://mcp.civic.ai/canva
CIVIC_MCP_API_KEY=your-civic-mcp-api-key
```

**Note:** This is a specialized integration. Contact Civic.ai for hackathon access.

---

### 5. AI Vision API (Image Scanning)

**Purpose:** Extract text and Q&A pairs from uploaded images

**Option A: OpenAI GPT-4 Vision (Recommended)**

**How to obtain:**
1. Visit [OpenAI Platform](https://platform.openai.com)
2. Sign up or log in
3. Navigate to API Keys
4. Create a new API key

**Required variables:**
```env
OPENAI_API_KEY=sk-proj-...your-key-here
```

**Option B: Anthropic Claude Vision**

**How to obtain:**
1. Visit [Anthropic Console](https://console.anthropic.com)
2. Sign up or log in
3. Generate an API key

**Required variables:**
```env
ANTHROPIC_API_KEY=sk-ant-...your-key-here
```

**Documentation:**
- [OpenAI Vision API](https://platform.openai.com/docs/guides/vision)
- [Anthropic Claude Vision](https://docs.anthropic.com/claude/docs/vision)

---

### 6. AI Image Generation

**Purpose:** Generate contextual images for image-based quizzes

**How to obtain:**
1. Use the same OpenAI API key from step 5
2. Ensure your account has access to DALL-E 3

**Required variables:**
```env
OPENAI_IMAGE_API_KEY=sk-proj-...your-key-here
IMAGE_GENERATION_MODEL=dall-e-3
```

**Models:**
- `dall-e-3`: Higher quality, slower (recommended)
- `dall-e-2`: Faster, lower cost

**Documentation:** [DALL-E API](https://platform.openai.com/docs/guides/images)

---

### 7. AI Classification API

**Purpose:** Assign flashcards to topic modules automatically

**How to obtain:**
1. Use the same OpenAI API key from step 5
2. Choose a model optimized for classification

**Required variables:**
```env
CLASSIFICATION_API_KEY=sk-proj-...your-key-here
CLASSIFICATION_MODEL=gpt-4-turbo-preview
```

**Recommended models:**
- `gpt-4-turbo-preview`: Best accuracy
- `gpt-3.5-turbo`: Faster, lower cost

---

### 8. Firebase / Firestore

**Purpose:** Database for users, flashcards, modules, and quiz sessions

**How to obtain:**

#### Step 1: Create Firebase Project
1. Visit [Firebase Console](https://console.firebase.google.com)
2. Click "Add project"
3. Follow the setup wizard
4. Enable Firestore Database (Native mode)

#### Step 2: Get Service Account Credentials (Server-side)
1. In Firebase Console, go to Project Settings > Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Copy the entire JSON content to `FIREBASE_SERVICE_ACCOUNT_JSON`

**OR** extract individual fields:
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

#### Step 3: Get Web App Config (Client-side)
1. In Firebase Console, go to Project Settings > General
2. Scroll to "Your apps" section
3. Click "Add app" > Web (</>) icon
4. Register your app
5. Copy the config values

**Required variables:**
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

#### Step 4: Configure Firestore Security Rules
In Firestore Console, set up security rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /modules/{moduleId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    match /flashcards/{flashcardId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
    
    match /quiz_sessions/{sessionId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
  }
}
```

**Documentation:** [Firebase Setup Guide](https://firebase.google.com/docs/web/setup)

---

### 9. Vercel Storage (Blob Storage)

**Purpose:** Store uploaded images and generated images

**How to obtain:**
1. Deploy your project to Vercel (see Vercel Deployment section below)
2. In Vercel Dashboard, go to your project
3. Navigate to Storage tab
4. Click "Create Database" > "Blob"
5. Vercel automatically provides the `BLOB_READ_WRITE_TOKEN` environment variable

**No manual configuration needed** - Vercel handles this automatically when you enable Blob Storage.

**Documentation:** [Vercel Blob Storage](https://vercel.com/docs/storage/vercel-blob)

---

### 10. Optional: Monitoring and Analytics

#### Sentry (Error Tracking)

**How to obtain:**
1. Visit [Sentry.io](https://sentry.io)
2. Create a new project
3. Copy the DSN from project settings
4. Generate an auth token for source maps

**Required variables:**
```env
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
SENTRY_AUTH_TOKEN=your-sentry-auth-token
```

#### Vercel Analytics

**No configuration needed** - automatically enabled for Vercel projects.

---

## Vercel Deployment Setup

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Link Project to Vercel
```bash
cd backend
vercel link
```

Follow the prompts to:
- Select your Vercel account
- Link to an existing project or create a new one
- Confirm the project settings

### Step 3: Add Environment Variables to Vercel

**Option A: Via Vercel Dashboard**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Navigate to Settings > Environment Variables
4. Add each variable from `.env.local.example`
5. Set the appropriate environment (Production, Preview, Development)

**Option B: Via Vercel CLI**
```bash
# Add a single variable
vercel env add SESSION_SECRET

# Add from .env.local file (interactive)
vercel env pull .env.local
```

**Important:** Add all variables to both Production and Preview environments.

### Step 4: Deploy to Vercel
```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Step 5: Enable Vercel Blob Storage
1. In Vercel Dashboard, go to your project
2. Navigate to Storage tab
3. Click "Create Database" > "Blob"
4. Vercel automatically adds `BLOB_READ_WRITE_TOKEN` to your environment

---

## Environment-Specific Configuration

### Development (Local)
- Use `http://localhost:3000` for `NEXT_PUBLIC_APP_URL`
- Use `http://localhost:3000/api/auth/callback` for `CIVIC_CALLBACK_URL`
- Set `NODE_ENV=development`

### Production (Vercel)
- Use your Vercel domain for `NEXT_PUBLIC_APP_URL` (e.g., `https://your-app.vercel.app`)
- Use `https://your-app.vercel.app/api/auth/callback` for `CIVIC_CALLBACK_URL`
- Set `NODE_ENV=production`
- Ensure all API keys are added to Vercel environment variables

---

## Security Best Practices

1. **Never commit `.env.local`** - it's already in `.gitignore`
2. **Rotate API keys regularly** - especially after hackathons or public demos
3. **Use environment-specific keys** - separate keys for development and production
4. **Restrict API key permissions** - use least-privilege access
5. **Monitor API usage** - set up billing alerts for external services
6. **Use Vercel's environment variable encryption** - all variables are encrypted at rest

---

## Troubleshooting

### "Missing environment variable" errors
- Ensure all required variables are set in `.env.local`
- Restart the Next.js dev server after adding variables
- Check for typos in variable names

### OAuth callback errors
- Verify `CIVIC_CALLBACK_URL` matches the URL registered in Civic.ai
- Ensure the callback URL uses the correct protocol (http vs https)
- Check that the Civic.ai app is approved and active

### Firebase connection errors
- Verify `FIREBASE_SERVICE_ACCOUNT_JSON` is valid JSON
- Check that Firestore is enabled in Firebase Console
- Ensure service account has necessary permissions

### Vercel deployment errors
- Verify all environment variables are added to Vercel
- Check build logs for missing dependencies
- Ensure `NODE_ENV=production` is set for production builds

---

## Cost Estimates (Approximate)

| Service | Free Tier | Estimated Monthly Cost |
|---------|-----------|------------------------|
| Civic.ai | Varies | Contact for pricing |
| ElevenLabs | 10,000 characters/month | $5-$22/month |
| OpenAI (GPT-4 Vision) | $5 credit | $10-$50/month |
| OpenAI (DALL-E 3) | None | $0.04/image |
| Firebase (Firestore) | 1GB storage, 50K reads/day | $0-$25/month |
| Vercel | Hobby plan free | $0-$20/month |
| Sentry | 5K errors/month | Free tier sufficient |

**Total estimated cost for hackathon:** $20-$100/month

---

## Support and Resources

- **Civic.ai:** [Developer Portal](https://civic.ai/developers)
- **ElevenLabs:** [Documentation](https://elevenlabs.io/docs)
- **OpenAI:** [API Reference](https://platform.openai.com/docs)
- **Firebase:** [Documentation](https://firebase.google.com/docs)
- **Vercel:** [Documentation](https://vercel.com/docs)

For hackathon-specific support, contact the organizing team or check the hackathon Discord/Slack.
