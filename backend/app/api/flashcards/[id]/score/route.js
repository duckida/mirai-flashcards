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
import { apiHandler } from '@/lib/api/middleware.js';
import { errorResponse, successResponse } from '@/lib/api/errorHandler.js';

/**
 * POST handler - Update flashcard knowledge score
 * Expects JSON: { isCorrect: boolean, confidence?: number (0-1) }
 */
export const POST = apiHandler(async (request, { params }) => {
  const { id } = await params;
  const body = await request.json();

  if (!id) {
    return errorResponse('Flashcard ID is required', 400);
  }

  const { isCorrect, confidence = 0.5 } = body;

  if (typeof isCorrect !== 'boolean') {
    return errorResponse('isCorrect (boolean) is required', 400);
  }

  if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
    return errorResponse('confidence must be a number between 0 and 1', 400);
  }

  const result = await updateFlashcardScore(id, isCorrect, confidence);

  return successResponse(
    result,
    `Score ${result.scoreDelta >= 0 ? 'increased' : 'decreased'} by ${Math.abs(result.scoreDelta)}`
  );
});

/**
 * GET handler - Get flashcard score statistics and history
 * Query params: ?history=true&limit=50
 */
export const GET = apiHandler(async (request, { params }) => {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const includeHistory = searchParams.get('history') === 'true';
  const historyLimit = parseInt(searchParams.get('limit') || '50', 10);

  if (!id) {
    return errorResponse('Flashcard ID is required', 400);
  }

  const stats = await getFlashcardStats(id);
  const response = { ...stats };

  if (includeHistory) {
    response.history = await getScoreHistory(id, historyLimit);
  }

  return successResponse(response);
});
