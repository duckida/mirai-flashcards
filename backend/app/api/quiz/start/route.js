/**
 * POST /api/quiz/start
 * Start a new quiz session for a module
 * Expects JSON: { userId, moduleId, type ('voice' | 'image'), cardCount? }
 */
import { startSession } from '@/lib/services/quizEngineService.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, moduleId, type, cardCount } = body;

    if (!userId) {
      return Response.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!moduleId) {
      return Response.json(
        { success: false, error: 'Module ID is required' },
        { status: 400 }
      );
    }

    if (!type || !['voice', 'image'].includes(type)) {
      return Response.json(
        { success: false, error: 'Quiz type must be "voice" or "image"' },
        { status: 400 }
      );
    }

    const session = await startSession(userId, moduleId, type, cardCount || 10);

    return Response.json(
      {
        success: true,
        session,
        message: 'Quiz session started',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Start quiz error:', error);

    if (error.message === 'No flashcards found in this module') {
      return Response.json(
        { success: false, error: 'No flashcards found in this module. Add some flashcards first.' },
        { status: 400 }
      );
    }

    return Response.json(
      { success: false, error: 'Failed to start quiz session', details: error.message },
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
