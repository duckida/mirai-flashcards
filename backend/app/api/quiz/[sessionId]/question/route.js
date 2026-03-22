/**
 * GET /api/quiz/[sessionId]/question
 * Get the next question for a quiz session
 * Returns null when session is complete
 */
import { getNextQuestion } from '@/lib/services/quizEngineService.js';
import { apiHandler } from '@/lib/api/middleware.js';
import { errorResponse, successResponse } from '@/lib/api/errorHandler.js';

export const maxDuration = 30;

export const GET = apiHandler(async (request, { params }) => {
  const { sessionId } = await params;

  if (!sessionId) {
    return errorResponse('Session ID is required', 400);
  }

  const question = await getNextQuestion(sessionId);

  if (!question) {
    return successResponse({ question: null }, 'No more questions. Quiz session complete.');
  }

  return successResponse({ question });
});
