/**
 * POST /api/quiz/[sessionId]/answer
 * Submit an answer for a quiz question
 * Expects JSON: { questionId, answer }
 */
import { evaluateResponse } from '@/lib/services/quizEngineService.js';
import { apiHandler } from '@/lib/api/middleware.js';
import { errorResponse, successResponse } from '@/lib/api/errorHandler.js';

export const POST = apiHandler(async (request, { params }) => {
  const { sessionId } = await params;

  if (!sessionId) {
    return errorResponse('Session ID is required', 400);
  }

  const body = await request.json();
  const { questionId, answer } = body;

  if (!questionId) {
    return errorResponse('Question ID is required', 400);
  }

  if (answer === undefined || answer === null || answer === '') {
    return errorResponse('Answer is required', 400);
  }

  const result = await evaluateResponse(sessionId, questionId, answer);

  return successResponse({ result });
});
