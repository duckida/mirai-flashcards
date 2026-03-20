/**
 * GET /api/quiz/[sessionId]/question
 * Get the next question for a quiz session
 * Returns null when session is complete
 */
import { getNextQuestion } from '@/lib/services/quizEngineService.js';

export async function GET(request, { params }) {
  try {
    const { sessionId } = params;

    if (!sessionId) {
      return Response.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const question = await getNextQuestion(sessionId);

    if (!question) {
      return Response.json({
        success: true,
        question: null,
        message: 'No more questions. Quiz session complete.',
      });
    }

    return Response.json({
      success: true,
      question,
    });
  } catch (error) {
    console.error('Get question error:', error);

    if (error.message === 'Session not found') {
      return Response.json(
        { success: false, error: 'Quiz session not found' },
        { status: 404 }
      );
    }

    if (error.message === 'Session is not complete') {
      return Response.json(
        { success: false, error: 'Quiz session is not active' },
        { status: 400 }
      );
    }

    return Response.json(
      { success: false, error: 'Failed to get next question', details: error.message },
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
