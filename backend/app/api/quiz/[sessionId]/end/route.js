/**
 * POST /api/quiz/[sessionId]/end
 * End a quiz session and get the summary
 */
import { endSession } from '@/lib/services/quizEngineService.js';
import { apiHandler } from '@/lib/api/middleware.js';
import { errorResponse, successResponse } from '@/lib/api/errorHandler.js';

export const POST = apiHandler(async (request, { params: awaitedParams }) => {
  const { sessionId } = awaitedParams;

  if (!sessionId) {
    return errorResponse('Session ID is required', 400);
  }

  const summary = await endSession(sessionId);

  return successResponse({ summary }, 'Quiz session ended');
});
