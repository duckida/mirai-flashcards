# Technology Stack and Build System

## Overview

This is a full-stack JavaScript application with a Next.js backend and React Native Web frontend, both deployed on Vercel.

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

**Framework**: React 19.2.4 with React Native Web

**UI Library**: Tamagui 2.0.0-rc.29
- Cross-platform component library
- Built on React Native Web
- Supports web, iOS, and Android

**Build Tool**: Webpack 5
- Development server with hot reload
- Production bundling

**Transpiler**: Babel 7
- `@babel/core` 7.29.0
- `@babel/preset-env` 7.29.2
- `@babel/preset-react` 7.28.5
- `@tamagui/babel-plugin` 2.0.0-rc.29 - Tamagui optimization

**Module System**: CommonJS (frontend), ES Modules (backend)

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

**Speech**: ElevenLabs Real-Time API
- WebSocket-based speech synthesis
- Speech recognition/transcription
- Multiple voice options

**AI Services**: OpenAI APIs
- GPT-4 Vision for image analysis
- DALL-E 3 for image generation
- GPT-4 for text classification

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

### Frontend (React Native Web)

```bash
# Development server with hot reload (http://localhost:8080)
npm start

# Production build
npm run build

# Linting (if configured)
npm run lint
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
├── package.json
└── README.md

frontend/
├── src/
│   ├── App.js                 # Root component
│   └── index.js               # Entry point
├── public/
│   └── index.html             # HTML template
├── webpack.config.js          # Webpack configuration
├── .babelrc.js                # Babel configuration
├── tamagui.config.js          # Tamagui theme and tokens
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

**Tamagui Components**:
- Use `YStack` and `XStack` for layouts
- Use theme tokens for colors, spacing, sizing
- Responsive design with `$sm`, `$md`, `$lg` breakpoints

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

**Frontend**: Can be deployed separately or as part of backend
- Webpack build output to `dist/`
- Deploy to Vercel, Netlify, or other static host

## Performance Considerations

- **Code Splitting**: Lazy load screens and heavy components
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

- Sentry for error tracking
- Vercel Analytics for performance
- Console logging for development
- Firebase console for database monitoring
- Network tab for API debugging
- React DevTools for component debugging
