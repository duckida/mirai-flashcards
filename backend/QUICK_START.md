# Quick Start Guide - AI Flashcard Quizzer

Get up and running in 5 minutes! This guide covers the absolute essentials.

## 🚀 Local Development (5 minutes)

### Step 1: Install Dependencies (1 min)
```bash
cd backend
npm install
```

### Step 2: Set Up Environment Variables (2 min)
```bash
# Copy the example file
cp .env.local.example .env.local

# Generate session secret
openssl rand -base64 32
```

Edit `.env.local` and add your credentials:
- **SESSION_SECRET**: Paste the generated secret
- **CIVIC_CLIENT_ID** & **CIVIC_CLIENT_SECRET**: From [civic.ai/developers](https://civic.ai/developers)
- **ELEVENLABS_API_KEY**: From [elevenlabs.io](https://elevenlabs.io/app/settings/api-keys)
- **OPENAI_API_KEY**: From [platform.openai.com](https://platform.openai.com/api-keys)
- **FIREBASE_***: From [Firebase Console](https://console.firebase.google.com)

### Step 3: Run Development Server (1 min)
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

---

## ☁️ Deploy to Vercel (10 minutes)

### Option A: Via Dashboard (Easiest)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your repository
   - Set root directory to `backend`
   - Click Deploy (will fail - expected)

3. **Add Environment Variables**
   - Go to Settings > Environment Variables
   - Copy all variables from `.env.local`
   - Update `NEXT_PUBLIC_APP_URL` to your Vercel URL
   - Update `CIVIC_CALLBACK_URL` to `https://your-app.vercel.app/api/auth/callback`

4. **Enable Blob Storage**
   - Go to Storage tab
   - Create Blob database

5. **Redeploy**
   - Go to Deployments tab
   - Click Redeploy on latest deployment

### Option B: Via CLI (Faster for subsequent deploys)

```bash
# Install Vercel CLI
npm install -g vercel

# Login and deploy
vercel login
vercel --prod
```

---

## 📋 Essential Environment Variables

**Minimum required for basic functionality:**

```env
# Application
SESSION_SECRET=your-generated-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Authentication
CIVIC_CLIENT_ID=your-civic-client-id
CIVIC_CLIENT_SECRET=your-civic-client-secret
CIVIC_CALLBACK_URL=http://localhost:3000/api/auth/callback

# AI Services
OPENAI_API_KEY=your-openai-api-key
ELEVENLABS_API_KEY=your-elevenlabs-api-key

# Firebase
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
```

**See [ENV_SETUP.md](./ENV_SETUP.md) for complete list and instructions.**

---

## 🔑 Where to Get API Keys

| Service | URL | Purpose |
|---------|-----|---------|
| Civic.ai | [civic.ai/developers](https://civic.ai/developers) | Authentication |
| ElevenLabs | [elevenlabs.io](https://elevenlabs.io/app/settings/api-keys) | Voice synthesis |
| OpenAI | [platform.openai.com](https://platform.openai.com/api-keys) | Vision, images, classification |
| Firebase | [console.firebase.google.com](https://console.firebase.google.com) | Database |
| Vercel | [vercel.com](https://vercel.com) | Hosting |

---

## ✅ Verify Setup

After setup, test these features:

1. **Authentication**: Can you log in via Civic.ai?
2. **Image Upload**: Can you upload an image?
3. **Flashcard Creation**: Are flashcards extracted from images?
4. **Voice Quiz**: Does speech synthesis work?
5. **Image Quiz**: Do AI-generated images appear?

---

## 🆘 Common Issues

### "Missing environment variable" error
- Check `.env.local` has all required variables
- Restart dev server: `npm run dev`

### OAuth callback fails
- Verify `CIVIC_CALLBACK_URL` matches URL in Civic.ai app settings
- Check `CIVIC_CLIENT_ID` and `CIVIC_CLIENT_SECRET` are correct

### Firebase connection error
- Verify `FIREBASE_SERVICE_ACCOUNT_JSON` is valid JSON
- Check Firestore is enabled in Firebase Console

### Image upload fails
- For local dev: Vercel Blob Storage requires deployment
- For production: Ensure Blob Storage is enabled in Vercel

---

## 📚 Full Documentation

- **[ENV_SETUP.md](./ENV_SETUP.md)** - Detailed credential setup guide
- **[VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)** - Complete deployment guide
- **[SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md)** - Comprehensive setup checklist
- **[README.md](./README.md)** - Full project documentation

---

## 🎯 Next Steps

1. ✅ Complete local setup
2. ✅ Deploy to Vercel
3. ✅ Test all features
4. 🚀 Start building!

**Need help?** Check [ENV_SETUP.md](./ENV_SETUP.md) troubleshooting section or contact your team.
