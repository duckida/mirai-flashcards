# Agent Instructions

## Project Specs

All product requirements, system design, and implementation tasks live in `.kiro/specs/ai-flashcard-quizzer/`:

- **Requirements**: `.kiro/specs/ai-flashcard-quizzer/requirements.md` — feature requirements and acceptance criteria
- **Design**: `.kiro/specs/ai-flashcard-quizzer/design.md` — architecture, data models, API routes, correctness properties
- **Tasks**: `.kiro/specs/ai-flashcard-quizzer/tasks.md` — phased implementation checklist with dependencies

## Steering Documents

Context and conventions live in `.kiro/steering/`:

- **Product**: `.kiro/steering/product.md` — product overview, user flows, value proposition
- **Tech**: `.kiro/steering/tech.md` — stack, build commands, environment variables, external services
- **Structure**: `.kiro/steering/structure.md` — folder layout, file naming, import conventions
- **Next.js**: `.kiro/steering/nextjs.md` — breaking changes warning for this Next.js version

## Rules

1. Read the relevant spec and steering docs before writing any code
2. Follow the task list in `tasks.md` — respect dependencies and phase ordering
3. Use JavaScript only (no TypeScript)
4. Backend uses ES Modules (`import/export`), frontend uses CommonJS (`require/module.exports`)
5. All UI must use React Native + Tamagui — no custom or third-party styling
6. Check `backend/AGENTS.md` for Next.js-specific caveats
7. After completing tasks, tick them off on the tasks md file, and commit all to github.

## Codebase Structure

### Overview
AI-powered flashcard learning web app that digitizes physical notes via image scanning and provides interactive quiz experiences via voice (ElevenLabs) and AI-generated images.

### Directory Structure
```
mirai-hackathon/
├── backend/          # Next.js 16 (App Router) - API routes, services, Firebase
│   ├── app/api/      # REST API endpoints
│   ├── lib/          # Firebase admin, services (auth, scanner, quiz engine, speech, etc.)
│   └── scripts/      # Database seeding, cleanup
├── frontend/         # React Native Web + Tamagui UI
│   ├── src/screens/  # 7 UI screens (Auth, Dashboard, Upload, Quiz, Results)
│   ├── src/services/ # API client, auth, flashcard, quiz services
│   └── src/hooks/    # useAuth, useQuiz, useSpeech
└── .kiro/            # Specs & steering docs
```

### Key Commands
```bash
# Backend
cd backend && npm run dev        # Start API server (port 3000)
npm run build && npm start       # Production build
npm test                         # Run Jest tests
npm run db:seed                  # Seed Firestore test data

# Frontend
cd frontend && npm start         # Start dev server (port 3001)
npm run build                    # Build to dist/
```

### Architecture Notes
- **Backend**: ES Modules, Firebase/Firestore, Vercel Blob, OpenAI via AI SDK
- **Frontend**: CommonJS, React Native Web, Tamagui styling
- **Auth**: Civic.ai OAuth (`/api/auth/[...civicauth]`)
- **API Routes**: `/api/flashcards`, `/api/modules`, `/api/quiz`, `/api/canva`
- **Collections**: `users`, `modules`, `flashcards`, `quiz_sessions`, `presentations`

### Environment Variables
Backend `.env.local`: Firebase credentials, Civic.ai keys, ElevenLabs API key, OpenAI API key
Frontend `REACT_APP_API_URL`: Backend API endpoint (default: http://localhost:3000)

### Key Backend Services
- **authService.js** - Civic.ai OAuth & session management
- **scannerService.js** - AI vision for flashcard extraction from images
- **classifierService.js** - AI classification of flashcards into modules
- **quizEngineService.js** - Quiz logic, question generation, scoring
- **speechService.js** - ElevenLabs speech synthesis/recognition
- **imageService.js** - AI image generation for quizzes

### API Endpoints
- `POST /api/flashcards/upload` - Upload image for scanning
- `POST /api/quiz/start` - Start quiz session
- `GET /api/auth/[...civicauth]` - Civic OAuth flow
- `POST /api/canva/generate` - Generate Canva presentation
