/**
 * GET /api/quiz/gemini-live
 * Returns Gemini API key for direct Live API WebSocket connection.
 */
import { apiHandler } from '@/lib/api/middleware.js';
import { errorResponse, successResponse } from '@/lib/api/errorHandler.js';

export const GET = apiHandler(async () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return errorResponse('GEMINI_API_KEY not configured', 500);
  }

  return successResponse({
    apiKey,
    model: 'models/gemini-2.5-flash-native-audio-latest',
  });
});
