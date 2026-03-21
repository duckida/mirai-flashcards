# Technology Stack and Build System

## Overview

This is a full-stack JavaScript application with a Next.js backend and React frontend, both deployed on Vercel.

## Backend Stack

**Framework**: Next.js 16.2 (App Router)
- Server-side rendering and API routes
- Serverless deployment on Vercel
- Built-in middleware support

**Runtime**: Node.js 18+

**Key Dependencies**:
- `react` 19.2.4 - UI library
- `react-dom` 19.2.4 - DOM rendering
- `firebase-admin` 12.0.0 - Firestore database and authentication
- `@vercel/blob` 0.23.4 - Image storage
- `dotenv` 17.3.1 - Environment variable management

**Styling**: Tailwind CSS 4 with PostCSS

**Linting**: ESLint 9 with Next.js config

**Type System**: JavaScript (no TypeScript)

## Frontend Stack

**Framework**: React 19 with Vite

**UI Components**: shadcn/ui + Tailwind CSS
- Utility-first CSS with Tailwind
- Copy-paste UI components (Button, Card, Badge, Progress, Input, etc.)
- Purple accent theme with rounded elements

**Build Tool**: Vite
- Fast HMR for development
- Optimized production builds with Rollup

**Styling**: Tailwind CSS v4
- Utility classes for all styling
- Custom theme with purple primary colors
- Responsive design with Tailwind breakpoints

**Module System**: ES Modules (both frontend and backend)

## External Services

**Authentication**: Civic.ai OAuth
- OAuth 2.0 flow
- Session management with HTTP-only cookies

**Database**: Firebase/Firestore
- Real-time NoSQL database
- Automatic scaling
- Security rules-based access control

**Storage**: Vercel Blob Storage
- Serverless file storage
- Automatic CDN distribution
- Token-based access

**Speech**: ElevenLabs Agent API
- WebSocket-based speech synthesis
- Speech recognition/transcription
- Multiple voice options

**AI Services**: Vercel AI APIs
- Qwen3.5 Flash for image analysis
- Gemini 2.5 Flash for image generation
- Qwen3.5 Flash for text classification

**Presentations**: Canva MCP (via Civic.ai)
- Model Context Protocol integration
- Async presentation generation

## Build Commands

### Backend (Next.js)

```bash
# Development server (http://localhost:3000)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Linting
npm run lint
```

### Frontend (React + Vite)

```bash
# Development server with hot reload (http://localhost:3001)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Environment Variables

### Backend (.env.local)

**Authentication**:
- `CIVIC_CLIENT_ID` - Civic.ai OAuth client ID
- `CIVIC_CLIENT_SECRET` - Civic.ai OAuth client secret
- `CIVIC_CALLBACK_URL` - OAuth callback URL (e.g., http://localhost:3000/api/auth/callback)
- `SESSION_SECRET` - Secret for session encryption

**AI Services**:
- `OPENAI_API_KEY` - OpenAI API key (vision, generation, classification)
- `CLASSIFICATION_API_KEY` - Alternative classification API key (if different)

**Speech**:
- `ELEVENLABS_API_KEY` - ElevenLabs API key
- `ELEVENLABS_VOICE_ID` - Default voice ID for speech synthesis

**Database**:
- `FIREBASE_SERVICE_ACCOUNT_JSON` - Firebase Admin SDK service account (JSON string)
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` - Firebase project ID
- `NEXT_PUBLIC_FIREBASE_API_KEY` - Firebase API key
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `NEXT_PUBLIC_FIREBASE_DATABASE_URL` - Firestore database URL
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` - Firebase storage bucket

**Storage**:
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage token (auto-set by Vercel)

**Canva Integration**:
- `CIVIC_MCP_GATEWAY_URL` - Civic.ai MCP gateway URL
- `CIVIC_MCP_API_KEY` - Civic.ai MCP API key

See `.env.local.example` for complete template.

### Frontend (.env or .env.local)

**API Configuration**:
- `VITE_API_URL` - Backend API URL (default: empty, uses same origin or Vite proxy)

## Project Structure

```
backend/
├── app/
│   ├── api/                    # API routes
│   │   ├── auth/              # Authentication endpoints
│   │   ├── flashcards/        # Flashcard CRUD
│   │   ├── modules/           # Module management
│   │   ├── quiz/              # Quiz session logic
│   │   └── canva/             # Canva integration
│   ├── layout.js              # Root layout
│   ├── page.js                # Home page
│   ├── globals.css            # Global styles
│   └── favicon.ico
├── lib/
│   ├── firebase/
│   │   ├── admin.js           # Firebase Admin SDK
│   │   ├── firestore.js       # Firestore client
│   │   └── test.js            # Firebase testing utilities
│   └── services/
│       ├── uploadService.js   # Image upload to Vercel Blob
│       ├── canvaService.js    # Canva MCP integration
│       └── [other services]   # Quiz, speech, image, etc.
├── public/                     # Static assets
├── .env.local                 # Environment variables (gitignored)
├── .env.local.example         # Environment template
├── next.config.mjs            # Next.js configuration
├── jsconfig.json              # JavaScript config
├── eslint.config.mjs          # ESLint configuration
├── postcss.config.mjs         # PostCSS configuration
├── tailwind.config.js         # Tailwind CSS configuration
├── vercel.json                # Vercel deployment configuration
├── package.json
└── README.md

frontend/
├── src/
│   ├── App.jsx                # Root component
│   ├── index.css              # Global styles with Tailwind
│   ├── screens/               # Screen components
│   │   ├── AuthScreen.jsx
│   │   ├── DashboardScreen.jsx
│   │   ├── UploadImageScreen.jsx
│   │   ├── ModuleDetailScreen.jsx
│   │   ├── VoiceQuizScreen.jsx
│   │   ├── ImageQuizScreen.jsx
│   │   ├── QuizResultsScreen.jsx
│   │   └── SettingsScreen.jsx
│   ├── components/
│   │   └── ui/                # shadcn/ui components
│   │       ├── button.jsx
│   │       ├── card.jsx
│   │       ├── badge.jsx
│   │       ├── progress.jsx
│   │       ├── spinner.jsx
│   │       ├── input.jsx
│   │       └── textarea.jsx
│   ├── services/              # API client and services
│   │   ├── apiClient.js
│   │   ├── authService.js
│   │   ├── moduleService.js
│   │   ├── flashcardService.js
│   │   ├── quizService.js
│   │   └── canvaService.js
│   ├── hooks/                 # Custom React hooks
│   │   ├── useAuth.js
│   │   └── useQuiz.js
│   └── lib/
│       └── utils.js           # cn() utility for class merging
├── public/                    # Static assets
│   └── index.html             # HTML template
├── vite.config.js             # Vite configuration
├── vercel.json                # Vercel deployment configuration
├── package.json
└── README.md
```

## Code Style and Conventions

**JavaScript**:
- ES6+ syntax (arrow functions, destructuring, template literals)
- Async/await for asynchronous operations
- Consistent naming: camelCase for variables/functions, PascalCase for components/classes

**React Components**:
- Functional components with hooks
- Props destructuring
- Consistent component structure
- JSX with Tailwind CSS classes

**Tailwind CSS**:
- Use utility classes for all styling
- Custom theme colors: `primary`, `success`, `warning`, `error`
- Custom sizing: `text-text-primary`, `text-text-secondary`, `text-text-muted`
- Rounded corners: `rounded-xl`, `rounded-2xl`, `rounded-3xl`
- Responsive with mobile-first approach

**shadcn/ui Components**:
- Import from `@/components/ui/*`
- Use variant props for styling (`variant="default|secondary|destructive|outline"`)
- Size props: `size="sm|default|lg|icon"`

**API Routes**:
- RESTful conventions (GET, POST, PATCH, DELETE)
- Consistent error response format
- Request validation and sanitization
- Authentication middleware on protected routes

**Firestore**:
- Collection names in lowercase (e.g., `users`, `modules`, `flashcards`)
- Document IDs auto-generated or user-based
- Denormalization for performance (e.g., module aggregate scores)
- Security rules enforce access control

## Testing

**Unit Tests**: Jest (if configured)
- Test services, utilities, and business logic
- Mock external dependencies

**Integration Tests**: 
- Test API routes with mock Firestore
- Test service interactions

**Property-Based Tests**:
- Validate correctness properties
- Use fast-check or similar library

## Deployment

**Backend**: Vercel
- Automatic deployment on git push
- Environment variables configured in Vercel dashboard
- Vercel Blob storage for images
- Serverless functions for API routes

**Frontend**: Vercel
- Vite build output to `dist/`
- SPA routing with rewrites to `index.html`
- Deploys on git push

## Performance Considerations

- **Code Splitting**: Vite handles automatic code splitting
- **Image Optimization**: Compress and resize images before upload
- **Caching**: Cache API responses and generated images
- **Firestore Queries**: Use indexes for efficient queries
- **Speech Latency**: Connection pooling and codec optimization
- **Bundle Size**: Monitor and optimize JavaScript bundle

## Security Best Practices

- HTTPS enforcement
- CORS configuration
- Rate limiting on API routes
- Input validation and sanitization
- CSRF protection
- Secure session management (HTTP-only cookies)
- Firebase security rules
- API key rotation
- Environment variable protection

## Monitoring and Debugging

- Vercel Analytics for performance
- Console logging for development
- Firebase console for database monitoring
- Network tab for API debugging
- React DevTools for component debugging
