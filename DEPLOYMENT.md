# Deployment Runbook

## Overview

This runbook covers deploying the AI Flashcard Quizzer to Vercel (backend) and Vercel Static (frontend).

---

## Prerequisites

- Vercel account with CLI installed: `npm i -g vercel`
- Firebase project with Firestore enabled
- All API keys configured (see `.env.local.example`)

---

## Backend Deployment (Vercel)

### First-Time Setup

```bash
cd backend
vercel login
vercel link    # Link to your Vercel project
```

### Configure Environment Variables

In the Vercel dashboard (or via CLI), set these secrets:

```bash
vercel env add NODE_ENV
vercel env add NEXT_PUBLIC_APP_URL
vercel env add SESSION_SECRET
vercel env add CIVIC_CLIENT_ID
vercel env add CIVIC_CLIENT_SECRET
vercel env add CIVIC_CALLBACK_URL
vercel env add ELEVENLABS_API_KEY
vercel env add ELEVENLABS_AGENT_ID
vercel env add CIVIC_MCP_HUB_URL
vercel env add CIVIC_MCP_API_KEY
vercel env add AI_GATEWAY_API_KEY
vercel env add AI_GATEWAY_BASE_URL
vercel env add VISION_MODEL
vercel env add IMAGE_GENERATION_MODEL
vercel env add CLASSIFICATION_MODEL
vercel env add FIREBASE_SERVICE_ACCOUNT_JSON
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY
vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID
vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
vercel env add NEXT_PUBLIC_FIREBASE_APP_ID
vercel env add BLOB_READ_WRITE_TOKEN
vercel env add FRONTEND_URL
```

### Deploy

```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

### Verify Deployment

1. Check health: `curl https://your-app.vercel.app/api/health` (if exists)
2. Test auth flow: Visit the app URL and try logging in via Civic.ai
3. Check Vercel function logs for errors

---

## Frontend Deployment (Vercel Static)

### First-Time Setup

```bash
cd frontend
vercel link    # Link to a DIFFERENT Vercel project than backend
```

### Configure Environment Variables

```bash
vercel env add REACT_APP_API_URL
# Set to your deployed backend URL, e.g., https://your-backend.vercel.app
```

### Deploy

```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

### Verify Deployment

1. Visit the deployed URL
2. Confirm the app loads and can reach the backend API
3. Test the full flow: Login → Dashboard → Upload → Quiz

---

## Post-Deployment Checklist

- [ ] Backend API responds to requests
- [ ] Frontend loads and displays correctly
- [ ] CORS is working (frontend can call backend)
- [ ] Civic.ai OAuth login works end-to-end
- [ ] Image upload and scanning works
- [ ] Voice quiz connects to ElevenLabs
- [ ] Firestore reads/writes succeed
- [ ] Vercel Blob storage works for image uploads
- [ ] Rate limiting is functioning

---

## Rollback

### Backend
```bash
vercel rollback    # Roll back to previous deployment
```

### Frontend
```bash
cd frontend && vercel rollback
```

---

## Troubleshooting

### CORS Errors
- Verify `FRONTEND_URL` env var matches the deployed frontend URL exactly
- Check that `cors.js` is wrapping all API routes via `apiHandler`/`protectedHandler`

### Firebase Permission Errors
- Verify `FIREBASE_SERVICE_ACCOUNT_JSON` is set correctly (valid JSON, single line)
- Check Firestore security rules in Firebase console

### ElevenLabs Connection Failures
- Verify `ELEVENLABS_API_KEY` and `ELEVENLABS_AGENT_ID` are correct
- Check ElevenLabs dashboard for usage limits

### Build Failures
- Run `npm run build` locally first to catch errors
- Check Vercel build logs for specific errors
- Ensure all environment variables are set in Vercel dashboard

### Rate Limiting Issues
- In-memory rate limiting resets on serverless cold starts
- For production scale, consider migrating to Vercel KV or Redis

---

## Monitoring

- **Vercel Dashboard**: Function invocations, errors, bandwidth
- **Firebase Console**: Firestore reads/writes, authentication metrics
- **ElevenLabs Dashboard**: API usage, WebSocket connections

---

## Security Notes

- Never commit `.env.local` to git (already in `.gitignore`)
- Rotate API keys periodically
- CORS is configured to allow only the frontend origin (not wildcard)
- Security headers (X-Frame-Options, X-Content-Type-Options, etc.) are set via `vercel.json`
- API routes use rate limiting (100 requests/minute per user)
