/**
 * GET /api/quiz/[sessionId]/summary
 * Get the summary of a completed quiz session
 */
import { buildSessionSummary } from '@/lib/services/quizEngineService.js';
import { apiHandler } from '@/lib/api/middleware.js';
import { errorResponse, successResponse } from '@/lib/api/errorHandler.js';

export const GET = apiHandler(async (request, { params }) => {
  const { sessionId } = await params;

  if (!sessionId) {
    return errorResponse('Session ID is required', 400);
  }

  const summary = await buildSessionSummary(sessionId);

  return successResponse({ summary });
});
