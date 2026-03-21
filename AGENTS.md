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
4. Backend uses ES Modules (`import/export`), frontend uses ES Modules (`import/export`)
5. **All frontend UI must use Tailwind CSS with shadcn/ui components** — no inline styles, no custom CSS classes
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
├── frontend/         # React + Vite + Tailwind CSS + shadcn/ui
│   ├── src/screens/  # 8 UI screens (Auth, Dashboard, Upload, ModuleDetail, VoiceQuiz, ImageQuiz, QuizResults, Settings)
│   ├── src/components/ui/ # shadcn/ui components (Button, Card, Badge, Progress, Spinner, Input, Textarea)
│   ├── src/services/ # API client, auth, module, flashcard, quiz services
│   └── src/hooks/    # useAuth, useQuiz
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
cd frontend && npm run dev       # Start dev server (port 3001)
npm run build                    # Build to dist/
```

### Architecture Notes
- **Backend**: ES Modules, Firebase/Firestore, Vercel Blob, OpenAI via AI SDK
- **Frontend**: ES Modules, React, Vite, Tailwind CSS, shadcn/ui components
- **Auth**: Civic.ai OAuth (`/api/auth/[...civicauth]`)
- **API Routes**: `/api/flashcards`, `/api/modules`, `/api/quiz`, `/api/canva`
- **Collections**: `users`, `modules`, `flashcards`, `quiz_sessions`, `presentations`

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
Backend `.env.local`: Firebase credentials, Civic.ai keys, ElevenLabs API key, OpenAI API key
Frontend `VITE_API_URL`: Backend API endpoint (default: http://localhost:3000)

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
