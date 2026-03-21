# Mirai Flashcard Quizzer

AI-powered flashcard learning app that digitizes physical notes via image scanning and provides interactive quiz experiences via voice and AI-generated images.

## Features

- **Image Scanning** — Upload photos of handwritten notes; AI extracts Q&A flashcards
- **Auto-Classification** — Flashcards are sorted into topic modules automatically
- **Voice Quiz** — Conversational quizzes powered by ElevenLabs speech synthesis
- **Image Quiz** — AI-generated visuals paired with quiz questions
- **Knowledge Scoring** — Track mastery per flashcard and per module (0-100)
- **Canva Integration** — Generate study presentations from your modules

## Quick Start

### Prerequisites

- Node.js 18+
- Firebase project with Firestore enabled
- ElevenLabs API key
- Civic.ai OAuth credentials
- Vercel AI Gateway key

### Setup

```bash
# Clone the repo
git clone https://github.com/duckida/mirai-flashcards.git
cd mirai-hackathon

# Backend
cd backend
cp .env.local.example .env.local
# Fill in your credentials in .env.local
npm install
npm run dev    # Starts on http://localhost:3000

# Frontend (in a separate terminal)
cd frontend
npm install
npm start      # Starts on http://localhost:3001
```

### Environment Variables

See `backend/.env.local.example` for all required variables with descriptions.

Key variables:
- `CIVIC_CLIENT_ID` / `CIVIC_CLIENT_SECRET` — Civic.ai OAuth
- `ELEVENLABS_API_KEY` / `ELEVENLABS_AGENT_ID` — Voice quiz
- `FIREBASE_SERVICE_ACCOUNT_JSON` — Firestore access
- `AI_GATEWAY_API_KEY` — Vercel AI Gateway for vision/generation

## Project Structure

```
mirai-hackathon/
├── backend/              # Next.js 16 API server
│   ├── app/api/          # REST API routes
│   ├── lib/              # Services, middleware, Firebase
│   └── scripts/          # DB seed/cleanup/backup
├── frontend/             # React Native Web + Tamagui
│   └── src/
│       ├── screens/      # UI screens
│       ├── services/     # API client
│       └── hooks/        # useAuth, useQuiz, useSpeech
├── .kiro/
│   ├── specs/            # Requirements, design, tasks
│   └── steering/         # Product, tech, structure docs
└── DEPLOYMENT.md         # Deployment runbook
```

## Tech Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Frontend    | React Native Web + Tamagui        |
| Backend     | Next.js 16 (App Router, ES Modules) |
| Database    | Firebase Firestore                |
| Auth        | Civic.ai OAuth                    |
| AI          | Vercel AI SDK + OpenAI            |
| Speech      | ElevenLabs WebSocket API          |
| Storage     | Vercel Blob                       |
| Deployment  | Vercel                            |

## Commands

```bash
# Backend
cd backend && npm run dev          # Dev server (port 3000)
npm run build && npm start         # Production
npm test                           # Jest tests
npm run test:coverage              # Tests with coverage
npm run db:seed                    # Seed test data

# Frontend
cd frontend && npm start           # Dev server (port 3001)
npm run build                      # Production build to dist/
```

## API Endpoints

| Method | Endpoint                          | Description              |
|--------|-----------------------------------|--------------------------|
| POST   | `/api/auth/login`                 | Initiate OAuth login     |
| GET    | `/api/auth/callback`              | OAuth callback           |
| POST   | `/api/auth/logout`                | Logout                   |
| GET    | `/api/auth/session`               | Check session            |
| POST   | `/api/flashcards/upload`          | Upload image for scanning|
| GET    | `/api/flashcards/:moduleId`       | Get flashcards by module |
| POST   | `/api/flashcards`                 | Create flashcard         |
| PATCH  | `/api/flashcards/:id`             | Update flashcard         |
| DELETE | `/api/flashcards/:id`             | Delete flashcard         |
| GET    | `/api/modules`                    | List user modules        |
| POST   | `/api/modules`                    | Create module            |
| GET    | `/api/modules/:id`                | Get module details       |
| POST   | `/api/quiz/start`                 | Start quiz session       |
| GET    | `/api/quiz/:sessionId/question`   | Get next question        |
| POST   | `/api/quiz/:sessionId/answer`     | Submit answer            |
| POST   | `/api/quiz/:sessionId/end`        | End quiz session         |
| GET    | `/api/quiz/:sessionId/summary`    | Get quiz summary         |
| POST   | `/api/canva/generate`             | Generate presentation    |
| GET    | `/api/canva/:id/status`           | Check presentation status|

## License

MIT
