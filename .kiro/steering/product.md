# AI Flashcard Quizzer - Product Overview

## What is it?

AI Flashcard Quizzer is an AI-powered learning platform that digitizes physical notes through image scanning and provides interactive quiz experiences. Users photograph their handwritten or printed notes, the system extracts flashcards using AI vision, automatically organizes them into topics, and then delivers personalized quizzes through voice, images, or text.

## Core Value Proposition

- **Digitize instantly**: Scan photos of notes → automatic flashcard extraction
- **Learn interactively**: Voice-based quizzes, AI-generated images, and adaptive exercises
- **Track progress**: Knowledge scoring system that identifies weak topics
- **Get help**: AI-generated presentations for difficult concepts via Canva

## Key Features

1. **Image Scanning**: Extract Q&A pairs from photos of notes using AI vision
2. **Auto-Classification**: AI organizes flashcards into modules by topic
3. **Voice Quizzes**: Interactive quizzing with speech synthesis and recognition
4. **Image Quizzes**: Visual learning with AI-generated contextual images
5. **Knowledge Scoring**: Track progress with 0-100 score per flashcard
6. **Canva Presentations**: Generate explanation presentations for weak topics
7. **Secure Auth**: OAuth-based authentication via Civic.ai

## User Flows

### Primary Flow: Scan → Learn → Quiz
1. User uploads photo of notes
2. AI extracts flashcards and previews them
3. User confirms or edits extracted cards
4. System auto-classifies into modules
5. User takes voice or image quiz
6. Knowledge scores update based on performance
7. User can request AI-generated presentation for difficult topics

### Secondary Flow: Manual Management
- Create/edit/delete flashcards manually
- Organize into custom modules
- Review and update knowledge scores
- Browse module statistics

## Target Users

- Students studying for exams
- Language learners
- Professional certification candidates
- Anyone using flashcards for learning

## Success Metrics

- User engagement: Quiz completion rate, session frequency
- Learning effectiveness: Knowledge score improvements
- Feature adoption: Voice quiz usage, presentation generation requests
- System reliability: Uptime, error rates, latency

## Technical Constraints

- Backend: Next.js on Vercel (serverless)
- Frontend: React Native Web with Tamagui (cross-platform)
- Database: Firestore (real-time, scalable)
- Storage: Vercel Blob (image uploads)
- External APIs: OpenAI (vision, generation), ElevenLabs (speech), Canva (presentations)
