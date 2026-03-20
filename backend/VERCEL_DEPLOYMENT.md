# Vercel Deployment Quick Reference

This guide provides step-by-step instructions for deploying the AI Flashcard Quizzer backend to Vercel.

## Prerequisites

- [ ] All environment variables configured locally (see [ENV_SETUP.md](./ENV_SETUP.md))
- [ ] Code pushed to GitHub repository
- [ ] Vercel account created at [vercel.com](https://vercel.com)

---

## Deployment Methods

### Method 1: Vercel Dashboard (Recommended for First Deployment)

#### Step 1: Import Project

1. Go to [Vercel Dashboard](https://vercel.com/new)
2. Click "Add New..." > "Project"
3. Import your GitHub repository
4. Select the `backend` folder as the root directory
5. Framework Preset: Next.js (auto-detected)
6. Click "Deploy" (initial deployment will fail without environment variables - this is expected)

#### Step 2: Configure Environment Variables

1. Go to your project in Vercel Dashboard
2. Navigate to **Settings** > **Environment Variables**
3. Add each variable from your `.env.local` file:

**Critical Variables (Add First):**
```
SESSION_SECRET
CIVIC_CLIENT_ID
CIVIC_CLIENT_SECRET
CIVIC_CALLBACK_URL (use https://your-project.vercel.app/api/auth/callback)
OPENAI_API_KEY
ELEVENLABS_API_KEY
FIREBASE_SERVICE_ACCOUNT_JSON
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_PROJECT_ID
```

**For each variable:**
- Name: Variable name (e.g., `SESSION_SECRET`)
- Value: Your actual value
- Environment: Select **Production**, **Preview**, and **Development**
- Click "Save"

**Tip:** You can paste multiple variables at once using the "Paste .env" option.

#### Step 3: Enable Vercel Blob Storage

1. In your project dashboard, go to **Storage** tab
2. Click "Create Database"
3. Select "Blob"
4. Click "Create"
5. Vercel automatically adds `BLOB_READ_WRITE_TOKEN` to your environment variables

#### Step 4: Redeploy

1. Go to **Deployments** tab
2. Click the three dots on the latest deployment
3. Click "Redeploy"
4. Your app should now deploy successfully

#### Step 5: Update OAuth Callback

1. Copy your production URL (e.g., `https://your-project.vercel.app`)
2. Go to [Civic.ai Developer Portal](https://civic.ai/developers)
3. Update your app's OAuth callback URL to:
   ```
   https://your-project.vercel.app/api/auth/callback
   ```
4. Update `CIVIC_CALLBACK_URL` in Vercel environment variables to match

---

### Method 2: Vercel CLI (For Subsequent Deployments)

#### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

#### Step 2: Login to Vercel

```bash
vercel login
```

#### Step 3: Link Project

```bash
cd backend
vercel link
```

Follow the prompts:
- Set up and deploy? **Y**
- Which scope? Select your account
- Link to existing project? **Y** (if you created one via dashboard) or **N** (to create new)
- What's your project's name? `ai-flashcard-quizzer` (or your preferred name)
- In which directory is your code located? `./`

#### Step 4: Add Environment Variables (First Time Only)

```bash
# Add variables one by one
vercel env add SESSION_SECRET production
vercel env add CIVIC_CLIENT_ID production
vercel env add CIVIC_CLIENT_SECRET production
# ... continue for all variables

# Or pull from .env.local
vercel env pull .env.production
```

**Note:** You'll need to add variables for each environment (production, preview, development).

#### Step 5: Deploy

```bash
# Deploy to preview (staging)
vercel

# Deploy to production
vercel --prod
```

#### Step 6: Enable Blob Storage

Follow Step 3 from Method 1 (must be done via dashboard).

---

## Environment-Specific Configuration

### Production Environment Variables

Update these variables for production:

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
CIVIC_CALLBACK_URL=https://your-project.vercel.app/api/auth/callback
```

### Preview Environment Variables

Preview deployments (from pull requests) can use the same variables as production, or you can set up separate test credentials.

---

## Post-Deployment Checklist

- [ ] Application loads at production URL
- [ ] OAuth login flow works (redirects to Civic.ai and back)
- [ ] Image upload works (Blob storage configured)
- [ ] Firestore connection works (can create/read data)
- [ ] ElevenLabs speech synthesis works (voice quiz functional)
- [ ] OpenAI vision works (image scanning functional)
- [ ] DALL-E image generation works (image quiz functional)
- [ ] Canva MCP integration works (presentation generation functional)
- [ ] All API routes return expected responses
- [ ] No console errors in browser
- [ ] Environment variables are set for all environments

---

## Vercel Project Settings

### Build & Development Settings

These are configured in `vercel.json` but can be overridden in the dashboard:

- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next` (auto-detected)
- **Install Command**: `npm install`
- **Development Command**: `npm run dev`

### Root Directory

If your repository has multiple folders (frontend/backend), set:
- **Root Directory**: `backend`

### Node.js Version

Vercel uses Node.js 18.x by default. To specify a version, add to `package.json`:

```json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

## Monitoring and Logs

### View Deployment Logs

1. Go to **Deployments** tab
2. Click on a deployment
3. View **Build Logs** and **Function Logs**

### Real-Time Logs

```bash
vercel logs --follow
```

### Enable Vercel Analytics

1. Go to **Analytics** tab
2. Click "Enable Analytics"
3. Analytics are automatically tracked (no code changes needed)

---

## Troubleshooting

### Build Fails

**Error: Missing environment variables**
- Solution: Add all required variables in Settings > Environment Variables
- Ensure variables are set for the correct environment (Production/Preview/Development)

**Error: Module not found**
- Solution: Check `package.json` dependencies
- Run `npm install` locally to verify
- Clear Vercel build cache: Settings > General > Clear Build Cache

### Runtime Errors

**Error: Firebase connection failed**
- Solution: Verify `FIREBASE_SERVICE_ACCOUNT_JSON` is valid JSON
- Check Firestore security rules allow authenticated access
- Ensure Firebase project is active

**Error: OAuth callback failed**
- Solution: Verify `CIVIC_CALLBACK_URL` matches production URL
- Update callback URL in Civic.ai app settings
- Check `CIVIC_CLIENT_ID` and `CIVIC_CLIENT_SECRET` are correct

**Error: Image upload failed**
- Solution: Ensure Vercel Blob Storage is enabled
- Check `BLOB_READ_WRITE_TOKEN` is set (auto-added by Vercel)
- Verify file size limits in environment variables

### Performance Issues

**Slow API responses**
- Solution: Check Firestore query performance
- Enable Firestore indexes for complex queries
- Monitor external API latency (OpenAI, ElevenLabs)

**Cold start delays**
- Solution: Upgrade to Vercel Pro for faster cold starts
- Implement API route warming (periodic health checks)

---

## Updating Environment Variables

### Via Dashboard

1. Go to Settings > Environment Variables
2. Find the variable to update
3. Click "Edit"
4. Update value
5. Click "Save"
6. Redeploy for changes to take effect

### Via CLI

```bash
# Remove old variable
vercel env rm VARIABLE_NAME production

# Add new variable
vercel env add VARIABLE_NAME production
```

**Important:** After updating environment variables, you must redeploy:

```bash
vercel --prod
```

---

## Custom Domain Setup

### Add Custom Domain

1. Go to **Settings** > **Domains**
2. Click "Add"
3. Enter your domain (e.g., `flashcards.yourdomain.com`)
4. Follow DNS configuration instructions
5. Wait for DNS propagation (up to 48 hours)

### Update OAuth Callback

After adding a custom domain, update:
1. `NEXT_PUBLIC_APP_URL` in Vercel environment variables
2. `CIVIC_CALLBACK_URL` in Vercel environment variables
3. OAuth callback URL in Civic.ai app settings

---

## Rollback Deployment

### Via Dashboard

1. Go to **Deployments** tab
2. Find a previous successful deployment
3. Click three dots > "Promote to Production"

### Via CLI

```bash
# List deployments
vercel ls

# Promote a specific deployment
vercel promote <deployment-url>
```

---

## CI/CD Integration

Vercel automatically deploys:
- **Production**: Commits to `main` branch
- **Preview**: Pull requests and other branches

### Disable Auto-Deploy

If you want manual control:
1. Go to Settings > Git
2. Disable "Production Branch" auto-deploy
3. Deploy manually via CLI or dashboard

---

## Cost Optimization

### Vercel Pricing Tiers

- **Hobby (Free)**: 
  - 100 GB bandwidth/month
  - Unlimited deployments
  - Serverless function execution: 100 GB-hours
  - Good for hackathons and demos

- **Pro ($20/month)**:
  - 1 TB bandwidth/month
  - Faster builds and cold starts
  - Advanced analytics
  - Recommended for production

### Reduce Costs

1. **Optimize images**: Use Next.js Image component
2. **Cache API responses**: Implement caching headers
3. **Limit external API calls**: Cache AI-generated content
4. **Monitor usage**: Check Analytics and Logs regularly

---

## Security Best Practices

1. **Rotate secrets regularly**: Update API keys every 90 days
2. **Use environment-specific keys**: Separate dev/prod credentials
3. **Enable Vercel Authentication**: Protect preview deployments
4. **Set up Firestore security rules**: Restrict data access
5. **Monitor logs**: Check for suspicious activity
6. **Enable HTTPS only**: Vercel enforces this by default

---

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Vercel CLI Reference](https://vercel.com/docs/cli)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vercel Blob Storage](https://vercel.com/docs/storage/vercel-blob)

---

## Support

For deployment issues:
1. Check [Vercel Status](https://www.vercel-status.com/)
2. Review [Vercel Community](https://github.com/vercel/vercel/discussions)
3. Contact Vercel Support (Pro plan)
4. Check hackathon Discord/Slack for team support
