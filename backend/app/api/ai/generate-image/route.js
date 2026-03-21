/**
 * POST /api/ai/generate-image
 * Generates an image for a quiz question using AI image generation
 * GET  /api/ai/generate-image - Service health check
 */

import { generateQuizImage, checkConfiguration } from '@/lib/services/imageService';
import { apiHandler } from '@/lib/api/middleware.js';
import { errorResponse, successResponse } from '@/lib/api/errorHandler.js';

/**
 * POST handler for image generation
 * Expects JSON with:
 * - question: The quiz question text
 * - context: Optional context (module topic)
 * - questionId: Optional question ID for tracking
 */
export const POST = apiHandler(async (request) => {
  const body = await request.json();
  const { question, context, questionId } = body;

  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return errorResponse('question is required and must be a non-empty string', 400);
  }

  const result = await generateQuizImage(question, { context, questionId });

  if (!result.success) {
    let statusCode = 500;
    if (result.error.includes('not configured')) statusCode = 503;
    else if (result.error.includes('rate limit')) statusCode = 429;
    else if (result.error.includes('content policy')) statusCode = 422;
    return errorResponse(result.error, statusCode);
  }

  return successResponse({ image: result.image }, 'Image generated successfully');
});

/**
 * GET handler for service health check
 */
export const GET = apiHandler(async () => {
  const config = checkConfiguration();

  return successResponse({
    service: 'ai-image-generation',
    status: config.configured ? 'configured' : 'not_configured',
    model: config.model,
  });
});
