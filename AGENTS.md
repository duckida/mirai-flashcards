# Agent Instructions

## Project Specs

All product requirements, system design, and implementation tasks live in `.kiro/specs/`:

- **AI Flashcard Quizzer**: `.kiro/specs/ai-flashcard-quizzer/` — original flashcard system
- **Gemini Voice Agent**: `.kiro/specs/gemini-voice-agent/` — Gemini Live API voice provider

Each spec has `requirements.md`, `design.md`, and `tasks.md`.

## Steering Documents

Context and conventions live in `.kiro/steering/`:

- **Product**: `.kiro/steering/product.md` — product overview, user flows, value proposition
- **Tech**: `.kiro/steering/tech.md` — stack, build commands, environment variables, external services
- **Structure**: `.kiro/steering/structure.md` — folder layout, file naming, import conventions

## Rules

1. Read the relevant spec and steering docs before writing any code
2. Follow the task list in `tasks.md` — respect dependencies and phase ordering
3. Use JavaScript only (no TypeScript)
4. Backend uses ES Modules (`import/export`), frontend uses ES Modules (`import/export`)
5. **All frontend UI must use Tailwind CSS with shadcn/ui components** — no inline styles, no custom CSS classes
6. After completing tasks, tick them off on the tasks md file, and commit all to github.

## Codebase Structure

### Overview
AI-powered flashcard learning web app that digitizes physical notes via image scanning and provides interactive quiz experiences via voice (ElevenLabs + Gemini Live API) and AI-generated images.

### Directory Structure
```
mirai-hackathon/
├── backend/          # Next.js 15 (App Router) - API routes, services, Firebase
│   ├── app/api/      # REST API endpoints
│   ├── lib/          # Firebase admin, services, voice providers
│   │   ├── firebase/       # admin.js, remoteConfig.js
│   │   ├── services/       # voiceProviderService.js, etc.
│   │   └── voiceProviders/ # VoiceProvider.js, ElevenLabsProvider.js, GeminiProvider.js
│   ├── middleware.js # CORS handling (MUST be named middleware.js for Next.js)
│   └── scripts/      # Database seeding, cleanup
├── frontend/         # React + Vite + Tailwind CSS + shadcn/ui
│   ├── src/screens/  # 8 UI screens (Auth, Dashboard, Upload, ModuleDetail, VoiceQuiz, ImageQuiz, QuizResults, Settings)
│   ├── src/components/ui/ # shadcn/ui components
│   ├── src/services/ # API client, auth, module, flashcard, quiz, voice services
│   └── src/hooks/    # useAuth, useQuiz
└── .kiro/            # Specs & steering docs
```

### Key Commands
```bash
# Local Development (single command — starts both services)
npm run dev                      # Backend (port 3000) + Frontend (port 3001)
npm run dev:backend              # Backend only
npm run dev:frontend             # Frontend only
npm run install:all              # Install deps for both projects

# Backend
cd backend && npm run dev        # Start API server (port 3000)
npm run build && npm start       # Production build
npm test                         # Run Jest tests
npm run db:seed                  # Seed Firestore test data

# Frontend
cd frontend && npm run dev       # Start dev server (port 3001)
npm run build                    # Build to dist/
```

### Local Dev Setup
- `npm run dev` from root starts both services via `concurrently`
- `frontend/.env.local` overrides `VITE_API_URL` to empty, so API calls go through Vite's dev proxy (`localhost:3001/api/*` → `localhost:3000/api/*`)
- `FRONTEND_URL` in `backend/.env.local` supports comma-separated origins for CORS
- The root `package.json` is orchestration-only — `backend/` and `frontend/` remain independent projects with separate `node_modules`

Always use the Vercel CLI for Vercel operations.

### Architecture Notes
- **Backend**: Next.js 15, ES Modules, Firebase/Firestore, Vercel Blob, OpenAI via AI SDK, Google GenAI SDK
- **Frontend**: ES Modules, React, Vite, Tailwind CSS, shadcn/ui components
- **Auth**: Civic.ai OAuth (`/api/auth/[...civicauth]`)
- **Voice Providers**: ElevenLabs (default) + Gemini 2.5 Flash Native Audio, selected via Firebase Remote Config
- **API Routes**: `/api/flashcards`, `/api/modules`, `/api/quiz`, `/api/quiz/speech-token`, `/api/quiz/gemini-live`, `/api/canva`
- **Collections**: `users`, `modules`, `flashcards` (single-sided: `content` field), `quiz_sessions`, `presentations`

### Voice Provider Architecture
```
speech-token API → VoiceProviderService → Remote Config / env default
                         ↓
              ElevenLabsProvider  or  GeminiProvider
                         ↓
              getSignedUrl() → frontend connects to provider
```

- **ElevenLabs**: Signed URL via API, `@elevenlabs/client` SDK in browser
- **Gemini Live**: API key returned via `/api/quiz/gemini-live`, raw WebSocket to `wss://generativelanguage.googleapis.com/ws/...BidiGenerateContent?key=API_KEY`
- **Gemini Audio Format**: PCM 16-bit, 16kHz input / 24kHz output, mono
- **Fallback**: If primary provider fails, automatically falls back to `elevenlabs`

### Frontend Tech Stack
- **React 19** with Vite for fast builds
- **Tailwind CSS v4** for utility-first styling
- **shadcn/ui** components (Button, Card, Badge, Progress, Spinner, Input, Textarea)
- **Vite aliases**: `@/` maps to `src/` (e.g., `@/components/ui/button`)

### Frontend Component Usage
```jsx
// Button variants
<Button variant="default" size="lg">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="destructive">Danger</Button>
<Button variant="outline">Outline</Button>

// Card components
<Card>
  <CardHeader><CardTitle>Title</CardTitle></CardHeader>
  <CardContent>Content</CardContent>
</Card>

// Badge variants (for scores)
<Badge variant="success">70%</Badge>
<Badge variant="warning">50%</Badge>
<Badge variant="error">30%</Badge>

// Progress bar
<Progress value={75} indicatorClassName="bg-success" />

// Spinner
<Spinner size="lg" />

// Input / Textarea
<Input placeholder="Type here..." />
<Textarea placeholder="Multi-line..." rows={3} />
```

### Tailwind CSS Theme
Custom colors available:
- `primary` / `primary-hover` / `primary-active` / `primary-lighter` / `primary-light`
- `success` / `success-light`
- `warning` / `warning-light`
- `error` / `error-light`
- `text-primary` / `text-secondary` / `text-muted`
- `bg` / `bg-hover` / `bg-muted`
- `border` / `border-hover`

### Environment Variables
Backend `.env.local`:
- Firebase credentials (`FIREBASE_SERVICE_ACCOUNT_JSON`)
- Civic.ai keys (`CIVIC_CLIENT_ID`, `CIVIC_CLIENT_SECRET`)
- ElevenLabs (`ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`)
- Gemini (`GEMINI_API_KEY`, `GEMINI_PROJECT_ID`)
- OpenAI (`OPENAI_API_KEY`)
- Voice config (`FIREBASE_REMOTE_CONFIG_ENABLED`, `VOICE_PROVIDER_DEFAULT`)

Frontend `.env.local`: `VITE_API_URL` (empty for local proxy, or set to backend URL)
Frontend `.env`: `VITE_API_URL` (production default), `VITE_CIVIC_CLIENT_ID`
Backend `FRONTEND_URL`: Comma-separated allowed CORS origins (e.g., `http://localhost:3001,https://mirai-flashcards-frontend.vercel.app`)

### Key Backend Services
- **authService.js** - Civic.ai OAuth & session management
- **scannerService.js** - AI vision for raw content extraction from flashcard images (single-sided: `content` field, no `question`/`answer`)
- **classifierService.js** - AI classification of flashcards into modules
- **quizEngineService.js** - Quiz logic, question generation, scoring
- **speechService.js** - ElevenLabs speech synthesis/recognition
- **voiceProviderService.js** - Voice provider selection, caching, fallback (uses Firebase Remote Config)
- **imageService.js** - AI image generation for quizzes

### API Endpoints
- `POST /api/flashcards/upload` - Upload image for scanning
- `POST /api/quiz/start` - Start quiz session
- `GET /api/quiz/speech-token` - Get voice provider config + signed URL
- `GET /api/quiz/gemini-live` - Get Gemini API key for Live API WebSocket
- `GET /api/quiz/test-voice-provider?provider=elevenlabs|gemini` - Validate provider connectivity
- `GET /api/auth/[...civicauth]` - Civic OAuth flow
- `POST /api/canva/generate` - Generate Canva presentation

### Deployment
- Backend: `vercel --prod` from `backend/` → https://mirai-flashcards-backend.vercel.app
- Frontend: `vercel --prod` from `frontend/` → https://mirai-flashcards-frontend.vercel.app
- Environment variables managed via `vercel env add/rm/ls`
- Middleware MUST be at `backend/middleware.js` (not `proxy.js`) for Next.js 15 to recognize it
