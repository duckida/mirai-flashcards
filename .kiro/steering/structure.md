# Project Organization and Folder Structure

## Repository Layout

```
mirai-flashcards/
├── .git/                       # Git repository
├── .github/                    # GitHub configuration (CI/CD, templates)
├── .kiro/                      # Kiro IDE configuration
│   ├── specs/                  # Specification documents
│   │   └── ai-flashcard-quizzer/
│   │       ├── requirements.md # Feature requirements
│   │       ├── design.md       # System design and architecture
│   │       └── tasks.md        # Implementation task list
│   └── steering/               # AI assistant guidance (this folder)
│       ├── product.md          # Product overview
│       ├── tech.md             # Technology stack and build system
│       └── structure.md        # This file
├── .vscode/                    # VS Code settings
├── backend/                    # Next.js backend application
├── frontend/                   # React + Vite frontend application
├── .gitignore                  # Git ignore rules
└── README.md                   # Repository root documentation
```

## Backend Structure (`backend/`)

### API Routes (`backend/app/api/`)

API routes follow Next.js App Router conventions. Each route is a folder with a `route.js` file.

```
backend/app/api/
├── auth/
│   ├── login/route.js          # POST /api/auth/login - Initiate OAuth
│   ├── callback/route.js       # GET /api/auth/callback - OAuth callback
│   ├── logout/route.js         # POST /api/auth/logout - Sign out
│   └── session/route.js        # GET /api/auth/session - Validate session
├── flashcards/
│   ├── upload/route.js         # POST /api/flashcards/upload - Scan image
│   ├── [moduleId]/route.js     # GET /api/flashcards/[moduleId] - List by module
│   ├── route.js                # POST /api/flashcards - Create
│   └── [id]/route.js           # PATCH/DELETE /api/flashcards/[id]
├── modules/
│   ├── route.js                # GET /api/modules - List all
│   ├── route.js                # POST /api/modules - Create
│   └── [id]/route.js           # GET/PATCH/DELETE /api/modules/[id]
├── quiz/
│   ├── start/route.js          # POST /api/quiz/start - Start session
│   ├── [sessionId]/
│   │   ├── question/route.js   # GET /api/quiz/[sessionId]/question
│   │   ├── answer/route.js     # POST /api/quiz/[sessionId]/answer
│   │   ├── end/route.js        # POST /api/quiz/[sessionId]/end
│   │   └── summary/route.js    # GET /api/quiz/[sessionId]/summary
└── canva/
    ├── generate/route.js       # POST /api/canva/generate
    └── [presentationId]/
        ├── status/route.js     # GET /api/canva/[presentationId]/status
        └── link/route.js       # GET /api/canva/[presentationId]/link
```

### Services (`backend/lib/services/`)

Business logic and external service integrations.

```
backend/lib/services/
├── authService.js              # Civic.ai OAuth and session management
├── uploadService.js            # Vercel Blob image upload
├── scannerService.js           # OpenAI Vision image analysis
├── classifierService.js        # OpenAI GPT-4 topic classification
├── quizEngineService.js        # Quiz logic and question generation
├── speechService.js            # ElevenLabs speech synthesis/recognition
├── imageService.js             # DALL-E 3 image generation
├── canvaService.js             # Canva MCP integration
└── scoringService.js           # Knowledge score calculations
```

### Firebase (`backend/lib/firebase/`)

Firebase and Firestore integration.

```
backend/lib/firebase/
├── admin.js                    # Firebase Admin SDK initialization
├── firestore.js                # Firestore client and utilities
└── test.js                     # Testing utilities and mocks
```

### Pages and Layout (`backend/app/`)

```
backend/app/
├── layout.js                   # Root layout (HTML structure)
├── page.js                     # Home page (/)
├── globals.css                 # Global styles
├── favicon.ico                 # Favicon
└── api/                        # API routes (see above)
```

### Configuration Files (`backend/`)

```
backend/
├── next.config.mjs             # Next.js configuration
├── jsconfig.json               # JavaScript compiler options
├── eslint.config.mjs           # ESLint rules
├── postcss.config.mjs          # PostCSS configuration
├── tailwind.config.js          # Tailwind CSS theme and tokens
├── vercel.json                 # Vercel deployment configuration
├── .env.local.example          # Environment variable template
└── package.json                # Dependencies and scripts
```

## Frontend Structure (`frontend/`)

### Source Code (`frontend/src/`)

```
frontend/src/
├── App.jsx                     # Root component with routing
├── index.css                   # Global styles with Tailwind CSS
├── screens/                    # Screen components
│   ├── AuthScreen.jsx          # Login screen with Civic.ai OAuth
│   ├── DashboardScreen.jsx     # Module list and overview stats
│   ├── ModuleDetailScreen.jsx  # Flashcard list with expand/collapse
│   ├── UploadImageScreen.jsx   # Drag & drop image upload
│   ├── VoiceQuizScreen.jsx     # Voice-based quiz session
│   ├── ImageQuizScreen.jsx     # Image quiz (MCQ, free recall, fill-in-blank)
│   ├── QuizResultsScreen.jsx   # Quiz summary and score breakdown
│   └── SettingsScreen.jsx      # User preferences
├── components/
│   └── ui/                     # shadcn/ui components
│       ├── button.jsx          # Button with variants
│       ├── card.jsx            # Card, CardHeader, CardTitle, CardContent
│       ├── badge.jsx           # Score badges (success, warning, error)
│       ├── progress.jsx        # Progress bars
│       ├── spinner.jsx         # Loading spinner
│       ├── input.jsx           # Form inputs
│       └── textarea.jsx        # Multi-line text inputs
├── services/                   # Client-side services
│   ├── apiClient.js            # HTTP client for API calls
│   ├── authService.js          # Authentication client
│   ├── moduleService.js        # Module API calls
│   ├── flashcardService.js     # Flashcard API calls
│   ├── quizService.js          # Quiz session API calls
│   ├── speechService.js        # Speech token API
│   └── canvaService.js         # Canva presentation API
├── hooks/                      # Custom React hooks
│   ├── useAuth.js              # Authentication state and actions
│   └── useQuiz.js              # Quiz state management
└── lib/
    └── utils.js                # Utility functions (cn for class merging)
```

### Configuration (`frontend/`)

```
frontend/
├── vite.config.js              # Vite build configuration with path aliases
├── tailwind.config.js          # Tailwind CSS theme and custom colors
├── vercel.json                 # Vercel deployment configuration
├── package.json                # Dependencies and scripts
└── .gitignore                  # Git ignore rules
```

### Public Assets (`frontend/public/`)

```
frontend/public/
├── index.html                  # HTML template with Tailwind CDN
├── favicon.ico                 # Favicon
└── [other static assets]       # Images, fonts, etc.
```

## Specification Documents (`.kiro/specs/ai-flashcard-quizzer/`)

```
.kiro/specs/ai-flashcard-quizzer/
├── requirements.md             # Feature requirements and acceptance criteria
├── design.md                   # System architecture and design decisions
└── tasks.md                    # Implementation task list with dependencies
```

## Key Conventions

### File Naming

- **API routes**: `route.js` (Next.js convention)
- **Components**: PascalCase (e.g., `AuthScreen.jsx`, `Button.jsx`)
- **Services**: camelCase with "Service" suffix (e.g., `authService.js`)
- **Utilities**: camelCase (e.g., `utils.js`)
- **Hooks**: camelCase with "use" prefix (e.g., `useAuth.js`)
- **Constants**: camelCase (e.g., `api.js`)

### Directory Organization

- **By feature**: Group related files (screens, services, components for a feature)
- **By type**: Separate concerns (screens, components, services, utils)
- **Flat structure**: Avoid deep nesting (max 3-4 levels)

### Import Paths

- Relative imports for same directory: `./Component.jsx`
- Relative imports for parent: `../services/authService.js`
- Absolute imports from root: `@/screens/AuthScreen` (configured in vite.config.js)

### Component Patterns

**shadcn/ui Components**:
```jsx
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

<Button variant="default" size="lg">
  Click me
</Button>
```

**Tailwind Styling**:
```jsx
<div className="flex items-center gap-4 p-6 bg-white rounded-2xl border border-border shadow-sm">
  <span className="text-text-primary font-semibold">Content</span>
</div>
```

## Development Workflow

### Adding a New Feature

1. Create spec document in `.kiro/specs/ai-flashcard-quizzer/`
2. Create API route in `backend/app/api/`
3. Create service in `backend/lib/services/`
4. Create screen in `frontend/src/screens/`
5. Create reusable components in `frontend/src/components/ui/`
6. Add hooks in `frontend/src/hooks/` if needed
7. Update documentation

### File Dependencies

```
Frontend Screen (screens/*.jsx)
    ↓
API Client (services/apiClient.js)
    ↓
API Route (backend/app/api/*/route.js)
    ↓
Service (backend/lib/services/*.js)
    ↓
Firebase/External APIs
```

### Testing Structure

- Unit tests: Alongside source files (e.g., `service.test.js`)
- Integration tests: In `backend/tests/integration/`
- E2E tests: In `frontend/tests/e2e/`

## Important Notes

- **No TypeScript**: This project uses JavaScript only
- **ES Modules**: Both frontend and backend use `import/export` syntax
- **Tailwind CSS**: All styling via utility classes - no custom CSS files
- **shadcn/ui**: Copy-paste components - no bundled dependencies
- **Environment variables**: Backend uses `.env.local`, frontend uses `VITE_` prefix
- **Firestore collections**: Lowercase names (e.g., `users`, `modules`, `flashcards`)
- **API versioning**: Not currently used; consider adding if needed
- **Monorepo**: Backend and frontend are separate npm projects in same repo

## Quick Reference

| Task | Location |
|------|----------|
| Add API endpoint | `backend/app/api/*/route.js` |
| Add business logic | `backend/lib/services/*.js` |
| Add UI screen | `frontend/src/screens/*.jsx` |
| Add reusable component | `frontend/src/components/ui/*.jsx` |
| Add custom hook | `frontend/src/hooks/*.js` |
| Add utility function | `frontend/src/lib/utils.js` |
| Configure environment | `backend/.env.local` or `frontend/.env` |
| Update theme | `frontend/tailwind.config.js` or inline Tailwind config |
| Add Firestore collection | `backend/lib/firebase/firestore.js` |
| Write tests | `*.test.js` alongside source |
| Update documentation | `backend/*.md` or `frontend/README.md` |
