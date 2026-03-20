/**
 * POST /api/quiz/[sessionId]/answer
 * Submit an answer for a quiz question
 * Expects JSON: { questionId, answer }
 */
import { evaluateResponse } from '@/lib/services/quizEngineService.js';

export async function POST(request, { params }) {
  try {
    const { sessionId } = params;

    if (!sessionId) {
      return Response.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { questionId, answer } = body;

    if (!questionId) {
      return Response.json(
        { success: false, error: 'Question ID is required' },
        { status: 400 }
      );
    }

    if (answer === undefined || answer === null || answer === '') {
      return Response.json(
        { success: false, error: 'Answer is required' },
        { status: 400 }
      );
    }

    const result = await evaluateResponse(sessionId, questionId, answer);

    return Response.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Submit answer error:', error);

    if (error.message === 'Session not found') {
      return Response.json(
        { success: false, error: 'Quiz session not found' },
        { status: 404 }
      );
    }

    if (error.message === 'Session is not active') {
      return Response.json(
        { success: false, error: 'Quiz session is not active' },
        { status: 400 }
      );
    }

    if (error.message.includes('Flashcard') && error.message.includes('not found')) {
      return Response.json(
        { success: false, error: 'Flashcard not found for this question' },
        { status: 404 }
      );
    }

    return Response.json(
      { success: false, error: 'Failed to evaluate answer', details: error.message },
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
