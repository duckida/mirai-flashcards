/**
 * Property-based tests for VoiceQuizScreen
 *
 * Task 1.1: Tests that verify the bug condition.
 * The bug: session start is gated on a secondary module fetch
 * (useEffect triggers on [module, flashcard] — so startVoiceSession
 * is NOT called until the module fetch resolves, even when flashcard is ready).
 *
 * These tests should FAIL before the fix and PASS after.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import * as fc from 'fast-check'
import VoiceQuizScreen from './VoiceQuizScreen'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock @elevenlabs/client — we just need to track whether startSession was called
const mockStartSession = vi.fn()
vi.mock('@elevenlabs/client', () => ({
  Conversation: {
    startSession: mockStartSession,
  },
}))

// Mock moduleService so that the secondary fetch never resolves during the test
// (simulating the bug: session start is blocked until fetch completes)
vi.mock('@/services/moduleService', () => ({
  moduleService: {
    getModuleFlashcards: vi.fn(() => new Promise(() => {})), // never resolves
  },
}))

// Mock quizService (needed after fix)
vi.mock('@/services/quizService', () => ({
  quizService: {
    startSession: vi.fn().mockResolvedValue({ success: true, sessionId: 'sess-1' }),
    endSession: vi.fn().mockResolvedValue({ success: true }),
    getSessionSummary: vi.fn().mockResolvedValue({ success: true, summary: {} }),
  },
}))

// Mock apiClient so we don't need a real backend
vi.mock('@/services/apiClient', () => ({
  apiClient: {
    post: vi.fn().mockResolvedValue({ success: true, signedUrl: 'wss://fake' }),
    get: vi.fn().mockResolvedValue({ success: true }),
  },
}))

// Mock navigator.mediaDevices
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: { getUserMedia: vi.fn().mockResolvedValue({}) },
  writable: true,
})

// Mock dynamic import of @elevenlabs/client via the startSession path
vi.stubGlobal('importShim', undefined)

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const nonEmptyString = fc.string({ minLength: 1, maxLength: 200 })

const flashcardArbitrary = fc.record({
  id: fc.uuid(),
  content: nonEmptyString,
})

const moduleNameArbitrary = nonEmptyString

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('VoiceQuizScreen — Bug 1: session start gated on secondary fetch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Make startSession return a mock conversation object
    mockStartSession.mockResolvedValue({
      endSession: vi.fn(),
    })
  })

  it(
    'starts the voice session immediately when flashcard and moduleName are provided (no secondary fetch required)',
    async () => {
      await fc.assert(
        fc.asyncProperty(flashcardArbitrary, moduleNameArbitrary, async (flashcard, moduleName) => {
          vi.clearAllMocks()
          mockStartSession.mockResolvedValue({ endSession: vi.fn() })

          const onBack = vi.fn()
          const onComplete = vi.fn()

          let container
          await act(async () => {
            const result = render(
              <VoiceQuizScreen
                moduleId="mod-1"
                moduleName={moduleName}
                flashcard={flashcard}
                userId="user-1"
                onBack={onBack}
                onComplete={onComplete}
              />
            )
            container = result.container
          })

          // Allow microtasks to flush (dynamic import + async startSession)
          await act(async () => {
            await new Promise((r) => setTimeout(r, 0))
          })

          // After fix: startSession MUST be called even though moduleService never resolves.
          // Before fix: startSession is NOT called because the useEffect waits for `module`.
          expect(mockStartSession).toHaveBeenCalled()
        }),
        { numRuns: 5 }
      )
    }
  )
})

describe('VoiceQuizScreen — Bug 2: empty content guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does NOT start the session when flashcard content is empty or whitespace-only', async () => {
    // Generate strings composed only of whitespace characters
    const whitespaceArbitrary = fc.array(
      fc.constantFrom(' ', '\t', '\n'),
      { minLength: 0, maxLength: 20 }
    ).map((chars) => chars.join(''))

    await fc.assert(
      fc.asyncProperty(whitespaceArbitrary, async (content) => {
        vi.clearAllMocks()
        mockStartSession.mockResolvedValue({ endSession: vi.fn() })

        const flashcard = { id: 'fc-1', content }
        const onBack = vi.fn()

        await act(async () => {
          render(
            <VoiceQuizScreen
              moduleId="mod-1"
              moduleName="Test Module"
              flashcard={flashcard}
              userId="user-1"
              onBack={onBack}
              onComplete={vi.fn()}
            />
          )
        })

        await act(async () => {
          await new Promise((r) => setTimeout(r, 0))
        })

        // Session must NOT start when content is empty/whitespace
        expect(mockStartSession).not.toHaveBeenCalled()
      }),
      { numRuns: 5 }
    )
  })
})
