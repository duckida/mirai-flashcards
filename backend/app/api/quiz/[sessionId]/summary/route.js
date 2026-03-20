/**
 * GET /api/quiz/[sessionId]/summary
 * Get the summary of a completed quiz session
 */
import { buildSessionSummary } from '@/lib/services/quizEngineService.js';

export async function GET(request, { params }) {
  try {
    const { sessionId } = params;

    if (!sessionId) {
      return Response.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const summary = await buildSessionSummary(sessionId);

    return Response.json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error('Get summary error:', error);

    if (error.message === 'Session not found') {
      return Response.json(
        { success: false, error: 'Quiz session not found' },
        { status: 404 }
      );
    }

    return Response.json(
      { success: false, error: 'Failed to get session summary', details: error.message },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
