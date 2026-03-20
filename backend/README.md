# AI Flashcard Quizzer - Backend

This is the backend Next.js application for the AI Flashcard Quizzer, an AI-powered flashcard learning app that digitizes physical notes through image scanning and provides interactive voice and visual quiz experiences.

## Features

- **AI-Powered Image Scanning**: Extract flashcards from photos of notes
- **Automatic Topic Classification**: AI organizes flashcards into modules
- **Voice-Based Quizzes**: Interactive quizzing with real-time speech synthesis
- **Image-Assisted Quizzes**: Visual learning with AI-generated contextual images
- **Knowledge Scoring**: Track progress and identify weak topics
- **Canva Presentations**: Generate explanation presentations for difficult topics
- **Civic.ai Authentication**: Secure OAuth-based user authentication

## Prerequisites

- Node.js 18+ and npm
- Firebase/Firestore project
- Civic.ai developer account
- ElevenLabs API key
- OpenAI API key (for vision, image generation, and classification)
- Vercel account (for deployment)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy the example environment file and configure your credentials:

```bash
cp .env.local.example .env.local
```

Then edit `.env.local` with your actual API keys and credentials. See [ENV_SETUP.md](./ENV_SETUP.md) for detailed instructions on obtaining each credential.

**Required services:**
- Civic.ai (authentication)
- ElevenLabs (speech synthesis)
- OpenAI (vision, image generation, classification)
- Firebase/Firestore (database)
- Vercel Storage (image storage)

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### 4. Build for Production

```bash
npm run build
npm start
```

## Environment Variables

All required environment variables are documented in `.env.local.example`. Key variables include:

- **Authentication**: `CIVIC_CLIENT_ID`, `CIVIC_CLIENT_SECRET`, `SESSION_SECRET`
- **Speech**: `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`
- **AI Services**: `OPENAI_API_KEY`, `CLASSIFICATION_API_KEY`
- **Database**: `FIREBASE_SERVICE_ACCOUNT_JSON`, `NEXT_PUBLIC_FIREBASE_*`
- **Canva**: `CIVIC_MCP_GATEWAY_URL`, `CIVIC_MCP_API_KEY`

For detailed setup instructions, see [ENV_SETUP.md](./ENV_SETUP.md).

## Deploy to Vercel

### Option 1: Deploy via Vercel Dashboard

1. Push your code to GitHub
2. Visit [Vercel Dashboard](https://vercel.com/new)
3. Import your repository
4. Configure environment variables (copy from `.env.local`)
5. Deploy

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Link project
vercel link

# Add environment variables
vercel env add SESSION_SECRET
vercel env add CIVIC_CLIENT_ID
# ... add all other variables

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Post-Deployment Steps

1. **Enable Vercel Blob Storage**:
   - Go to your project in Vercel Dashboard
   - Navigate to Storage tab
   - Create a Blob storage database
   - Vercel automatically adds `BLOB_READ_WRITE_TOKEN`

2. **Update OAuth Callback URL**:
   - Update `CIVIC_CALLBACK_URL` in Vercel environment variables to your production URL
   - Update the callback URL in your Civic.ai app settings

3. **Configure Firebase Security Rules**:
   - See [ENV_SETUP.md](./ENV_SETUP.md) for recommended Firestore security rules

## Project Structure

```
backend/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── flashcards/   # Flashcard CRUD
│   │   ├── modules/      # Module management
│   │   ├── quiz/         # Quiz session logic
│   │   └── canva/        # Canva integration
│   ├── layout.js         # Root layout
│   └── page.js           # Home page
├── lib/                   # Utility libraries
│   ├── auth.js           # Auth service
│   ├── scanner.js        # Image scanning
│   ├── classifier.js     # Topic classification
│   ├── quiz-engine.js    # Quiz logic
│   ├── speech.js         # ElevenLabs integration
│   ├── image.js          # Image generation
│   └── firebase.js       # Firestore client
├── .env.local.example    # Environment variable template
├── .env.local            # Local environment variables (gitignored)
├── ENV_SETUP.md          # Detailed setup guide
├── vercel.json           # Vercel configuration
└── package.json          # Dependencies
```

## API Routes

### Authentication
- `POST /api/auth/login` - Initiate Civic.ai OAuth flow
- `GET /api/auth/callback` - Handle OAuth callback
- `POST /api/auth/logout` - Sign out user
- `GET /api/auth/session` - Validate session

### Flashcards
- `POST /api/flashcards/upload` - Upload and scan image
- `GET /api/flashcards/:moduleId` - List flashcards in module
- `POST /api/flashcards` - Create flashcard
- `PATCH /api/flashcards/:id` - Update flashcard
- `DELETE /api/flashcards/:id` - Delete flashcard

### Modules
- `GET /api/modules` - List user's modules
- `POST /api/modules` - Create module
- `GET /api/modules/:id` - Get module details
- `PATCH /api/modules/:id` - Update module

### Quiz
- `POST /api/quiz/start` - Start quiz session
- `GET /api/quiz/:sessionId/question` - Get next question
- `POST /api/quiz/:sessionId/answer` - Submit answer
- `POST /api/quiz/:sessionId/end` - End session

### Canva
- `POST /api/canva/generate` - Generate presentation
- `GET /api/canva/:presentationId/status` - Check status

## Technology Stack

- **Framework**: Next.js 16.2 (App Router)
- **Authentication**: Civic.ai OAuth
- **Database**: Firebase/Firestore
- **Storage**: Vercel Blob Storage
- **Speech**: ElevenLabs Real-Time API
- **AI Vision**: OpenAI GPT-4 Vision
- **Image Generation**: DALL-E 3
- **Classification**: OpenAI GPT-4
- **Deployment**: Vercel
- **Styling**: Tailwind CSS

## Development

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Type Checking

```bash
npm run type-check
```

## Documentation

- [Environment Setup Guide](./ENV_SETUP.md) - Detailed instructions for obtaining all credentials
- [Design Document](../.kiro/specs/ai-flashcard-quizzer/design.md) - System architecture and design
- [Requirements](../.kiro/specs/ai-flashcard-quizzer/requirements.md) - Feature requirements and acceptance criteria

## Support

For issues or questions:
- Check [ENV_SETUP.md](./ENV_SETUP.md) for setup troubleshooting
- Review the [Design Document](../.kiro/specs/ai-flashcard-quizzer/design.md) for architecture details
- Contact the development team or hackathon organizers

## License

This project is built for a hackathon. License TBD.
