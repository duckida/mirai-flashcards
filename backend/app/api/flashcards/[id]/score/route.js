/**
 * Flashcard Score API Routes
 * POST   /api/flashcards/:id/score - Update flashcard knowledge score
 * GET    /api/flashcards/:id/score - Get flashcard score and stats
 */

import {
  updateFlashcardScore,
  getFlashcardStats,
  getScoreHistory,
} from '@/lib/services/scoringService.js';

/**
 * POST handler - Update flashcard knowledge score
 * Expects JSON: { isCorrect: boolean, confidence?: number (0-1) }
 */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return Response.json(
        { success: false, error: 'Flashcard ID is required' },
        { status: 400 }
      );
    }

    const { isCorrect, confidence = 0.5 } = body;

    if (typeof isCorrect !== 'boolean') {
      return Response.json(
        { success: false, error: 'isCorrect (boolean) is required' },
        { status: 400 }
      );
    }

    if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
      return Response.json(
        { success: false, error: 'confidence must be a number between 0 and 1' },
        { status: 400 }
      );
    }

    const result = await updateFlashcardScore(id, isCorrect, confidence);

    return Response.json({
      success: true,
      ...result,
      message: `Score ${result.scoreDelta >= 0 ? 'increased' : 'decreased'} by ${Math.abs(result.scoreDelta)}`,
    });
  } catch (error) {
    console.error('Update score error:', error);
    if (error.message.includes('not found')) {
      return Response.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }
    return Response.json(
      { success: false, error: 'Failed to update score', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET handler - Get flashcard score statistics and history
 * Query params: ?history=true&limit=50
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get('history') === 'true';
    const historyLimit = parseInt(searchParams.get('limit') || '50', 10);

    if (!id) {
      return Response.json(
        { success: false, error: 'Flashcard ID is required' },
        { status: 400 }
      );
    }

    const stats = await getFlashcardStats(id);
    const response = {
      success: true,
      ...stats,
    };

    if (includeHistory) {
      response.history = await getScoreHistory(id, historyLimit);
    }

    return Response.json(response);
  } catch (error) {
    console.error('Get score stats error:', error);
    if (error.message.includes('not found')) {
      return Response.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }
    return Response.json(
      { success: false, error: 'Failed to retrieve score stats', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
