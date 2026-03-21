/**
 * Bug Condition Exploration Test — Premature Disconnect Shows Dialog
 *
 * Property 1: Bug Condition
 * When `onDisconnect` fires before `onConnect` has ever fired (i.e.,
 * `hasConnectedRef.current === false` and `userEndedRef.current === false`),
 * the disconnect dialog MUST NOT be shown.
 *
 * This test is EXPECTED TO FAIL on unfixed code — failure confirms the bug exists.
 * It will PASS after the fix is applied.
 *
 * Validates: Requirements 1.2, 1.3
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import * as fc from 'fast-check'
import VoiceQuizScreen from '../VoiceQuizScreen'

// ---------------------------------------------------------------------------
// Controllable session handle — lets us capture and invoke callbacks directly
// ---------------------------------------------------------------------------

let capturedOnDisconnect = null
let capturedOnConnect = null

const mockEndSession = vi.fn()

const mockStartSession = vi.fn(async (opts) => {
  capturedOnConnect = opts.onConnect
  capturedOnDisconnect = opts.onDisconnect
  return { endSession: mockEndSession }
})

vi.mock('@elevenlabs/client', () => ({
  Conversation: {
    startSession: mockStartSession,
  },
}))

vi.mock('@/services/apiClient', () => ({
  apiClient: {
    post: vi.fn().mockResolvedValue({ success: true, signedUrl: 'wss://fake' }),
    get: vi.fn().mockResolvedValue({ success: true }),
  },
}))

vi.mock('@/services/quizService', () => ({
  quizService: {
    startSession: vi.fn().mockResolvedValue({ success: true, sessionId: 'sess-1' }),
    endSession: vi.fn().mockResolvedValue({ success: true }),
    getSessionSummary: vi.fn().mockResolvedValue({ success: true, summary: {} }),
  },
}))

Object.defineProperty(global.navigator, 'mediaDevices', {
  value: { getUserMedia: vi.fn().mockResolvedValue({}) },
  writable: true,
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const validFlashcard = { id: 'fc-1', content: 'What is photosynthesis?' }

async function mountAndWaitForSession(flashcard = validFlashcard) {
  capturedOnDisconnect = null
  capturedOnConnect = null

  const onBack = vi.fn()
  const onComplete = vi.fn()

  await act(async () => {
    render(
      <VoiceQuizScreen
        moduleId="mod-1"
        moduleName="Biology"
        flashcard={flashcard}
        userId="user-1"
        onBack={onBack}
        onComplete={onComplete}
      />
    )
  })

  // Flush the setTimeout(0) defer and the async startSession call
  await act(async () => {
    await new Promise((r) => setTimeout(r, 50))
  })

  return { onBack, onComplete }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('VoiceQuizScreen — Bug Condition: Premature Disconnect Shows Dialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedOnDisconnect = null
    capturedOnConnect = null
    mockEndSession.mockResolvedValue(undefined)
  })

  /**
   * Property 1: Bug Condition — Premature Disconnect Does NOT Surface Dialog
   *
   * For all cases where onDisconnect fires before onConnect
   * (userEnded=false, hasConnected=false), the disconnect dialog
   * MUST NOT be shown.
   *
   * On UNFIXED code: this test FAILS because the dialog IS shown.
   * On FIXED code: this test PASSES because the dialog is NOT shown.
   *
   * Validates: Requirements 1.2, 1.3
   */
  it(
    'Property 1: onDisconnect before onConnect (userEnded=false) must NOT show disconnect dialog',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Scope: userEnded is always false (the bug condition)
          fc.constant(false),
          async (userEnded) => {
            vi.clearAllMocks()
            capturedOnDisconnect = null
            capturedOnConnect = null
            mockEndSession.mockResolvedValue(undefined)

            // Mount the component and wait for startSession to be called
            await mountAndWaitForSession()

            // Verify startSession was called and we captured the callback
            expect(mockStartSession).toHaveBeenCalled()
            expect(capturedOnDisconnect).toBeTypeOf('function')

            // Simulate: onDisconnect fires BEFORE onConnect has ever fired
            // (hasConnectedRef.current === false, userEndedRef.current === false)
            // This is the bug condition — StrictMode cleanup or rapid unmount scenario
            await act(async () => {
              capturedOnDisconnect()
            })

            // ASSERTION: The disconnect dialog MUST NOT be shown
            // On UNFIXED code: "Disconnected" heading IS in the document → test FAILS
            // On FIXED code: "Disconnected" heading is NOT in the document → test PASSES
            const dialogHeading = screen.queryByText('Disconnected')
            expect(dialogHeading).not.toBeInTheDocument()
          }
        ),
        { numRuns: 1 }
      )
    }
  )

  /**
   * Concrete failing case — direct assertion without property wrapper
   * Documents the exact counterexample:
   *   onDisconnect() called before onConnect → dialog appears immediately
   */
  it(
    'concrete case: onDisconnect fires before onConnect → dialog must NOT appear (FAILS on unfixed code)',
    async () => {
      await mountAndWaitForSession()

      expect(mockStartSession).toHaveBeenCalled()
      expect(capturedOnDisconnect).toBeTypeOf('function')

      // onConnect has NOT been called — hasConnectedRef.current is false
      // userEndedRef.current is also false
      // Invoking onDisconnect now is the exact bug condition
      await act(async () => {
        capturedOnDisconnect()
      })

      // The "Disconnected" dialog heading must NOT be visible
      // BUG: on unfixed code, setShowDisconnectDialog(true) is called unconditionally
      // when !userEndedRef.current, so this assertion FAILS
      expect(screen.queryByText('Disconnected')).not.toBeInTheDocument()
    }
  )
})

// ---------------------------------------------------------------------------
// Preservation Tests — Property 2: Genuine Unexpected Disconnect Still Shows Dialog
//
// These tests observe UNFIXED code behavior that must be PRESERVED after the fix.
// EXPECTED OUTCOME: Tests PASS on unfixed code (baseline behavior confirmed).
//
// Validates: Requirements 3.1, 3.2, 3.3
// ---------------------------------------------------------------------------

describe('VoiceQuizScreen — Preservation: Genuine Disconnect Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedOnDisconnect = null
    capturedOnConnect = null
    mockEndSession.mockResolvedValue(undefined)
  })

  /**
   * Property 2a: Genuine Unexpected Disconnect Shows Dialog
   *
   * For all cases where onConnect fires first (hasConnected=true) and then
   * onDisconnect fires with userEnded=false, the disconnect dialog MUST be shown.
   *
   * Validates: Requirements 3.1, 3.3
   */
  it(
    'Property 2a: onConnect then onDisconnect (userEnded=false) MUST show disconnect dialog',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Scope: userEnded is always false (genuine unexpected disconnect)
          fc.constant(false),
          async (_userEnded) => {
            vi.clearAllMocks()
            capturedOnDisconnect = null
            capturedOnConnect = null
            mockEndSession.mockResolvedValue(undefined)

            await mountAndWaitForSession()

            expect(mockStartSession).toHaveBeenCalled()
            expect(capturedOnConnect).toBeTypeOf('function')
            expect(capturedOnDisconnect).toBeTypeOf('function')

            // Step 1: Fire onConnect — simulates a successful connection
            await act(async () => {
              capturedOnConnect()
            })

            // Step 2: Fire onDisconnect — simulates a genuine unexpected disconnect
            // userEndedRef.current is still false (user did not click End)
            await act(async () => {
              capturedOnDisconnect()
            })

            // ASSERTION: The disconnect dialog MUST be shown
            // This is the preserved behavior — genuine disconnects always show the dialog
            const dialogHeading = screen.queryByText('Disconnected')
            expect(dialogHeading).toBeInTheDocument()
          }
        ),
        { numRuns: 1 }
      )
    }
  )

  /**
   * Concrete case for Property 2a — direct assertion without property wrapper
   */
  it(
    'concrete case: onConnect then onDisconnect (userEnded=false) → dialog MUST appear',
    async () => {
      await mountAndWaitForSession()

      expect(mockStartSession).toHaveBeenCalled()
      expect(capturedOnConnect).toBeTypeOf('function')
      expect(capturedOnDisconnect).toBeTypeOf('function')

      // Simulate successful connection
      await act(async () => {
        capturedOnConnect()
      })

      // Simulate genuine unexpected disconnect (network drop, server-side close)
      await act(async () => {
        capturedOnDisconnect()
      })

      // The "Disconnected" dialog heading MUST be visible
      expect(screen.queryByText('Disconnected')).toBeInTheDocument()
    }
  )

  /**
   * Property 2b: Intentional End Does NOT Show Dialog
   *
   * For all cases where onConnect fires first and then the user clicks "End"
   * (setting userEndedRef.current = true) before onDisconnect fires,
   * the disconnect dialog MUST NOT be shown.
   *
   * Validates: Requirements 3.2
   */
  it(
    'Property 2b: onConnect then user clicks End then onDisconnect (userEnded=true) must NOT show dialog',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Scope: userEnded is always true (intentional end)
          fc.constant(true),
          async (_userEnded) => {
            vi.clearAllMocks()
            capturedOnDisconnect = null
            capturedOnConnect = null
            mockEndSession.mockResolvedValue(undefined)

            await mountAndWaitForSession()

            expect(mockStartSession).toHaveBeenCalled()
            expect(capturedOnConnect).toBeTypeOf('function')
            expect(capturedOnDisconnect).toBeTypeOf('function')

            // Step 1: Fire onConnect — simulates a successful connection
            await act(async () => {
              capturedOnConnect()
            })

            // Step 2: User clicks "End Quiz" button (only visible after onConnect)
            // This sets userEndedRef.current = true and calls endSession() internally
            const endButton = screen.getByRole('button', { name: 'End Quiz' })
            await act(async () => {
              endButton.click()
            })

            // Step 3: onDisconnect fires as a result of endSession()
            if (capturedOnDisconnect) {
              await act(async () => {
                capturedOnDisconnect()
              })
            }

            // ASSERTION: The disconnect dialog MUST NOT be shown
            // userEndedRef.current is true, so the dialog is skipped
            const dialogHeading = screen.queryByText('Disconnected')
            expect(dialogHeading).not.toBeInTheDocument()
          }
        ),
        { numRuns: 1 }
      )
    }
  )

  /**
   * Concrete case for Property 2b — direct assertion without property wrapper
   * Uses direct ref manipulation to simulate userEnded=true without UI interaction
   */
  it(
    'concrete case: onConnect then onDisconnect with userEnded=true → dialog must NOT appear',
    async () => {
      await mountAndWaitForSession()

      expect(mockStartSession).toHaveBeenCalled()
      expect(capturedOnConnect).toBeTypeOf('function')
      expect(capturedOnDisconnect).toBeTypeOf('function')

      // Simulate successful connection
      await act(async () => {
        capturedOnConnect()
      })

      // Simulate intentional end: the "End Quiz" button is only visible after onConnect
      // Click it to set userEndedRef.current = true
      const endButton = screen.getByRole('button', { name: 'End Quiz' })
      await act(async () => {
        endButton.click()
      })

      // onDisconnect fires as a result of endSession()
      if (capturedOnDisconnect) {
        await act(async () => {
          capturedOnDisconnect()
        })
      }

      // The "Disconnected" dialog heading MUST NOT be visible
      expect(screen.queryByText('Disconnected')).not.toBeInTheDocument()
    }
  )
})
