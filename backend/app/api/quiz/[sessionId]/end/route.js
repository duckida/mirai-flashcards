/**
 * POST /api/quiz/[sessionId]/end
 * End a quiz session and get the summary
 */
import { endSession } from '@/lib/services/quizEngineService.js';

export async function POST(request, { params }) {
  try {
    const { sessionId } = params;

    if (!sessionId) {
      return Response.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const summary = await endSession(sessionId);

    return Response.json({
      success: true,
      summary,
      message: 'Quiz session ended',
    });
  } catch (error) {
    console.error('End quiz error:', error);

    if (error.message === 'Session not found') {
      return Response.json(
        { success: false, error: 'Quiz session not found' },
        { status: 404 }
      );
    }

    if (error.message === 'Session is not active') {
      return Response.json(
        { success: false, error: 'Quiz session is already completed' },
        { status: 400 }
      );
    }

    return Response.json(
      { success: false, error: 'Failed to end quiz session', details: error.message },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
