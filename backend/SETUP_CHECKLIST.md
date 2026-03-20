# Setup Checklist - AI Flashcard Quizzer

Use this checklist to ensure you have completed all setup steps for the AI Flashcard Quizzer backend.

## Local Development Setup

### 1. Prerequisites
- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] Git installed and repository cloned
- [ ] Code editor (VS Code recommended)

### 2. Environment Variables
- [ ] Copied `.env.local.example` to `.env.local`
- [ ] Generated `SESSION_SECRET` using `openssl rand -base64 32`
- [ ] Obtained Civic.ai OAuth credentials (client ID, client secret)
- [ ] Obtained ElevenLabs API key and voice ID
- [ ] Obtained OpenAI API key (for vision, image generation, classification)
- [ ] Created Firebase project and obtained credentials
- [ ] Configured all environment variables in `.env.local`
- [ ] Verified `.env.local` is gitignored (should not appear in `git status`)

### 3. Firebase Setup
- [ ] Created Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
- [ ] Enabled Firestore Database (Native mode)
- [ ] Downloaded service account JSON
- [ ] Configured Firestore security rules
- [ ] Added Firebase web app config to `.env.local`

### 4. External Service Accounts
- [ ] Created Civic.ai developer account
- [ ] Registered OAuth application in Civic.ai
- [ ] Set OAuth callback URL to `http://localhost:3000/api/auth/callback`
- [ ] Created ElevenLabs account and generated API key
- [ ] Created OpenAI account and generated API key
- [ ] Requested Canva MCP access via Civic.ai (optional for initial development)

### 5. Local Development
- [ ] Ran `npm install` successfully
- [ ] Ran `npm run dev` successfully
- [ ] Application loads at `http://localhost:3000`
- [ ] No console errors in terminal or browser
- [ ] Can access Next.js welcome page

---

## Vercel Deployment Setup

### 1. Vercel Account
- [ ] Created Vercel account at [vercel.com](https://vercel.com)
- [ ] Connected GitHub account to Vercel
- [ ] Installed Vercel CLI (`npm install -g vercel`)
- [ ] Logged in to Vercel CLI (`vercel login`)

### 2. Project Setup
- [ ] Pushed code to GitHub repository
- [ ] Imported project to Vercel (via dashboard or CLI)
- [ ] Set root directory to `backend` (if monorepo)
- [ ] Verified framework preset is Next.js

### 3. Environment Variables (Production)
- [ ] Added all environment variables from `.env.local` to Vercel
- [ ] Updated `NEXT_PUBLIC_APP_URL` to production URL
- [ ] Updated `CIVIC_CALLBACK_URL` to production callback URL
- [ ] Set `NODE_ENV=production`
- [ ] Configured variables for Production, Preview, and Development environments

### 4. Vercel Blob Storage
- [ ] Enabled Vercel Blob Storage in project dashboard
- [ ] Verified `BLOB_READ_WRITE_TOKEN` was auto-added to environment variables

### 5. OAuth Configuration
- [ ] Updated Civic.ai OAuth callback URL to production URL
- [ ] Tested OAuth login flow on production
- [ ] Verified session persistence works

### 6. Deployment Verification
- [ ] Initial deployment completed successfully
- [ ] Application loads at production URL
- [ ] No build errors in deployment logs
- [ ] No runtime errors in function logs

---

## Post-Deployment Testing

### Authentication
- [ ] Can access login page
- [ ] OAuth redirect to Civic.ai works
- [ ] OAuth callback returns to app successfully
- [ ] User session persists across page refreshes
- [ ] Logout works correctly

### Image Upload & Scanning
- [ ] Can upload JPEG images
- [ ] Can upload PNG images
- [ ] Can upload WEBP images
- [ ] Images larger than 20MB are rejected
- [ ] Unsupported formats are rejected
- [ ] AI vision extracts text from images
- [ ] Extracted flashcards are displayed for review

### Flashcard Management
- [ ] Can create flashcards manually
- [ ] Can edit flashcard question and answer
- [ ] Can delete flashcards
- [ ] Flashcards persist to Firestore
- [ ] Knowledge scores display correctly

### Module Management
- [ ] Flashcards are automatically classified into modules
- [ ] Can view all modules on dashboard
- [ ] Module flashcard counts are accurate
- [ ] Can manually reassign flashcards to different modules
- [ ] Module aggregate scores calculate correctly

### Voice Quiz
- [ ] Can start voice quiz session
- [ ] ElevenLabs speech synthesis works
- [ ] Microphone access works (browser permission granted)
- [ ] Voice transcription works
- [ ] Quiz engine evaluates responses correctly
- [ ] Knowledge scores update after quiz
- [ ] Session summary displays correctly

### Image Quiz
- [ ] Can start image quiz session
- [ ] AI-generated images display correctly
- [ ] Quiz questions are distinct from original flashcard text
- [ ] Can submit text answers
- [ ] Quiz continues if image generation fails
- [ ] Knowledge scores update after quiz
- [ ] Session summary displays correctly

### Canva Integration (Optional)
- [ ] Can request help presentation
- [ ] Canva MCP generates presentation
- [ ] Presentation links are accessible
- [ ] Error handling works if generation fails

---

## Performance Verification

### Page Load Times
- [ ] Dashboard loads within 3 seconds
- [ ] Module detail page loads within 3 seconds
- [ ] Quiz session starts within 3 seconds

### Speech Latency
- [ ] Speech synthesis latency < 1 second
- [ ] Voice transcription latency < 1 second

### API Response Times
- [ ] Flashcard CRUD operations < 500ms
- [ ] Module list retrieval < 500ms
- [ ] Quiz question generation < 1 second

---

## Security Verification

### Environment Variables
- [ ] `.env.local` is not committed to git
- [ ] No API keys visible in client-side code
- [ ] All sensitive variables use server-side only (no `NEXT_PUBLIC_` prefix)

### Firestore Security
- [ ] Firestore security rules are configured
- [ ] Users can only access their own data
- [ ] Unauthenticated requests are rejected

### Authentication
- [ ] Session cookies are HTTP-only
- [ ] Session cookies are secure (HTTPS only in production)
- [ ] Session expiry works correctly
- [ ] Logout invalidates session

---

## Monitoring Setup

### Error Tracking
- [ ] Sentry configured (optional)
- [ ] Error tracking works in production
- [ ] Error notifications configured

### Analytics
- [ ] Vercel Analytics enabled
- [ ] Page view tracking works
- [ ] Performance metrics visible in dashboard

### Logging
- [ ] Can view deployment logs in Vercel
- [ ] Can view function logs in Vercel
- [ ] Can view real-time logs via CLI (`vercel logs --follow`)

---

## Documentation

### Code Documentation
- [ ] README.md updated with project information
- [ ] ENV_SETUP.md contains all credential instructions
- [ ] VERCEL_DEPLOYMENT.md contains deployment steps
- [ ] API routes documented in README.md

### Team Documentation
- [ ] Team members have access to Vercel project
- [ ] Team members have access to Firebase project
- [ ] Shared credential storage configured (e.g., 1Password, LastPass)
- [ ] Deployment process documented for team

---

## Optional Enhancements

### Custom Domain
- [ ] Custom domain purchased
- [ ] Domain added to Vercel project
- [ ] DNS configured correctly
- [ ] SSL certificate issued
- [ ] OAuth callback URL updated for custom domain

### CI/CD
- [ ] GitHub Actions configured (optional)
- [ ] Automated tests run on pull requests
- [ ] Automated deployment on merge to main

### Monitoring
- [ ] Uptime monitoring configured (e.g., UptimeRobot)
- [ ] Performance monitoring configured
- [ ] Cost alerts configured for external APIs

---

## Troubleshooting Resources

If you encounter issues, refer to:
- [ENV_SETUP.md](./ENV_SETUP.md) - Credential setup and troubleshooting
- [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) - Deployment troubleshooting
- [Design Document](../.kiro/specs/ai-flashcard-quizzer/design.md) - Architecture details
- Vercel deployment logs
- Browser console errors
- Firestore logs in Firebase Console

---

## Support Contacts

- **Vercel Support**: [vercel.com/support](https://vercel.com/support)
- **Firebase Support**: [firebase.google.com/support](https://firebase.google.com/support)
- **Civic.ai Support**: [civic.ai/developers](https://civic.ai/developers)
- **ElevenLabs Support**: [elevenlabs.io/docs](https://elevenlabs.io/docs)
- **OpenAI Support**: [platform.openai.com/docs](https://platform.openai.com/docs)
- **Hackathon Team**: [Your team Discord/Slack]

---

## Completion

Once all items are checked:
- [ ] Local development environment is fully functional
- [ ] Production deployment is live and tested
- [ ] All features work as expected
- [ ] Team members can access and deploy
- [ ] Documentation is complete

**Ready to build! 🚀**
