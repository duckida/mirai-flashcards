/**
 * POST /api/quiz/start
 * Start a new quiz session for a module
 * Expects JSON: { userId, moduleId, type ('voice' | 'image'), cardCount? }
 */
import { startSession } from '@/lib/services/quizEngineService.js';
import { apiHandler } from '@/lib/api/middleware.js';
import { errorResponse, successResponse } from '@/lib/api/errorHandler.js';

export const POST = apiHandler(async (request) => {
  const body = await request.json();
  const { userId, moduleId, type, cardCount } = body;

  if (!userId) {
    return errorResponse('User ID is required', 400);
  }

  if (!moduleId) {
    return errorResponse('Module ID is required', 400);
  }

  if (!type || !['voice', 'image'].includes(type)) {
    return errorResponse('Quiz type must be "voice" or "image"', 400);
  }

  const session = await startSession(userId, moduleId, type, cardCount || 10);

  return successResponse({ session }, 'Quiz session started', 201);
});
