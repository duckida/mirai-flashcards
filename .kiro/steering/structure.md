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
├── frontend/                   # React Native Web frontend application
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
    ├── [presentationId]/
    │   ├── status/route.js     # GET /api/canva/[presentationId]/status
    │   └── link/route.js       # GET /api/canva/[presentationId]/link
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

### Documentation (`backend/`)

```
backend/
├── README.md                   # Backend overview and quick start
├── ENV_SETUP.md                # Detailed environment setup guide
├── QUICK_START.md              # Quick start guide
├── SETUP_CHECKLIST.md          # Setup verification checklist
├── FIREBASE_SETUP.md           # Firebase configuration guide
├── FIRESTORE_ARCHITECTURE.md   # Firestore schema documentation
├── VERCEL_DEPLOYMENT.md        # Vercel deployment guide
└── [other documentation]       # Additional guides and references
```

## Frontend Structure (`frontend/`)

### Source Code (`frontend/src/`)

```
frontend/src/
├── App.js                      # Root component
├── index.js                    # Entry point
├── screens/                    # Screen components
│   ├── AuthScreen.js           # Login screen
│   ├── DashboardScreen.js      # Module list
│   ├── ModuleDetailScreen.js   # Flashcard list
│   ├── FlashcardEditorScreen.js # Edit flashcard
│   ├── UploadImageScreen.js    # Scan notes
│   ├── VoiceQuizScreen.js      # Voice quiz session
│   ├── ImageQuizScreen.js      # Image quiz session
│   ├── QuizResultsScreen.js    # Quiz summary
│   └── SettingsScreen.js       # User preferences
├── components/                 # Reusable components
│   ├── Button.js               # Button component
│   ├── Card.js                 # Card component
│   ├── Input.js                # Text input component
│   ├── Badge.js                # Score badge
│   ├── Spinner.js              # Loading spinner
│   ├── Modal.js                # Modal dialog
│   └── [other components]      # Additional UI components
├── services/                   # Client-side services
│   ├── apiClient.js            # HTTP client for API calls
│   ├── authService.js          # Authentication client
│   ├── storageService.js       # Local storage utilities
│   └── [other services]        # Additional client services
├── hooks/                      # Custom React hooks
│   ├── useAuth.js              # Authentication hook
│   ├── useQuiz.js              # Quiz state hook
│   └── [other hooks]           # Additional hooks
├── utils/                      # Utility functions
│   ├── formatters.js           # Text formatting
│   ├── validators.js           # Input validation
│   └── [other utilities]       # Additional utilities
├── styles/                     # Global and component styles
│   ├── globals.css             # Global styles
│   └── theme.css               # Theme variables
└── constants/                  # Application constants
    ├── api.js                  # API endpoints
    ├── messages.js             # UI messages and strings
    └── config.js               # App configuration
```

### Configuration (`frontend/`)

```
frontend/
├── webpack.config.js           # Webpack build configuration
├── .babelrc.js                 # Babel transpiler configuration
├── tamagui.config.js           # Tamagui theme and design tokens
├── package.json                # Dependencies and scripts
└── .gitignore                  # Git ignore rules
```

### Public Assets (`frontend/public/`)

```
frontend/public/
├── index.html                  # HTML template
├── favicon.ico                 # Favicon
└── [other static assets]       # Images, fonts, etc.
```

## Specification Documents (`.kiro/specs/ai-flashcard-quizzer/`)

```
.kiro/specs/ai-flashcard-quizzer/
├── requirements.md             # Feature requirements and acceptance criteria
├── design.md                   # System architecture and design decisions
├── tasks.md                    # Implementation task list with dependencies
└── .config.kiro                # Spec metadata (auto-generated)
```

## Key Conventions

### File Naming

- **API routes**: `route.js` (Next.js convention)
- **Components**: PascalCase (e.g., `AuthScreen.js`, `Button.js`)
- **Services**: camelCase with "Service" suffix (e.g., `authService.js`)
- **Utilities**: camelCase (e.g., `formatters.js`)
- **Hooks**: camelCase with "use" prefix (e.g., `useAuth.js`)
- **Constants**: camelCase (e.g., `api.js`)

### Directory Organization

- **By feature**: Group related files (screens, services, components for a feature)
- **By type**: Separate concerns (screens, components, services, utils)
- **Flat structure**: Avoid deep nesting (max 3-4 levels)

### Import Paths

- Relative imports for same directory: `./Component.js`
- Relative imports for parent: `../services/authService.js`
- Absolute imports from root: `@/screens/AuthScreen.js` (if configured)

## Development Workflow

### Adding a New Feature

1. Create spec document in `.kiro/specs/ai-flashcard-quizzer/`
2. Create API route in `backend/app/api/`
3. Create service in `backend/lib/services/`
4. Create screen in `frontend/src/screens/`
5. Create components in `frontend/src/components/`
6. Add tests alongside implementation
7. Update documentation

### File Dependencies

```
Frontend Screen
    ↓
API Client (frontend/src/services/apiClient.js)
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
- **ES Modules (backend)**: Use `import/export` syntax
- **CommonJS (frontend)**: Use `require/module.exports` syntax
- **Environment variables**: Backend uses `.env.local`, frontend uses `NEXT_PUBLIC_*` prefix for client-side vars
- **Firestore collections**: Lowercase names (e.g., `users`, `modules`, `flashcards`)
- **API versioning**: Not currently used; consider adding if needed
- **Monorepo**: Backend and frontend are separate npm projects in same repo

## Quick Reference

| Task | Location |
|------|----------|
| Add API endpoint | `backend/app/api/*/route.js` |
| Add business logic | `backend/lib/services/*.js` |
| Add UI screen | `frontend/src/screens/*.js` |
| Add reusable component | `frontend/src/components/*.js` |
| Add utility function | `frontend/src/utils/*.js` or `backend/lib/utils/*.js` |
| Configure environment | `backend/.env.local` |
| Update theme | `frontend/tamagui.config.js` |
| Add Firestore collection | `backend/lib/firebase/firestore.js` |
| Write tests | `*.test.js` alongside source |
| Update documentation | `backend/*.md` or `frontend/README.md` |
