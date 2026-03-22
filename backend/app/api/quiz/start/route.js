/**
 * POST /api/quiz/start
 * Start a new quiz session for a module
 * Expects JSON: { userId, moduleId, type ('voice' | 'image' | 'multiple_choice'), cardCount? }
 */
import { startSession } from '@/lib/services/quizEngineService.js';
import { apiHandler } from '@/lib/api/middleware.js';
import { errorResponse, successResponse } from '@/lib/api/errorHandler.js';

export const maxDuration = 30;

export const POST = apiHandler(async (request) => {
  const body = await request.json();
  const { userId, moduleId, type, cardCount, flashcardId } = body;

  if (!userId) {
    return errorResponse('User ID is required', 400);
  }

  if (!moduleId) {
    return errorResponse('Module ID is required', 400);
  }

  if (!type || !['voice', 'image', 'multiple_choice'].includes(type)) {
    return errorResponse('Quiz type must be "voice", "image", or "multiple_choice"', 400);
  }

  const session = await startSession(userId, moduleId, type, cardCount || 10, flashcardId);

  return successResponse({ session }, 'Quiz session started', 201);
});
