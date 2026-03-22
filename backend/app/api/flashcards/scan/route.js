/**
 * POST /api/flashcards/scan
 * Handles AI vision extraction of flashcards from uploaded images
 */

import { processImage } from '@/lib/services/scannerService';
import { apiHandler } from '@/lib/api/middleware.js';
import { errorResponse, successResponse } from '@/lib/api/errorHandler.js';

/**
 * POST handler for image scanning and flashcard extraction
 * Expects JSON with:
 * - imageUrl: URL of the uploaded image (from Vercel Storage)
 * - confidenceThreshold: Optional confidence threshold (default: 0.5)
 */
export const POST = apiHandler(async (request) => {
  const body = await request.json();
  const { imageUrl, confidenceThreshold = 0.5 } = body;

  if (!imageUrl) {
    return errorResponse('imageUrl is required', 400);
  }

  // Validate URL format
  try {
    new URL(imageUrl);
  } catch {
    return errorResponse('Invalid imageUrl format', 400);
  }

  // Validate confidence threshold
  if (typeof confidenceThreshold !== 'number' || confidenceThreshold < 0 || confidenceThreshold > 1) {
    return errorResponse('confidenceThreshold must be a number between 0 and 1', 400);
  }

  console.log(`Starting flashcard extraction from: ${imageUrl}`);

  const result = await processImage(imageUrl, { confidenceThreshold });

  if (!result.success) {
    console.error('Flashcard extraction failed:', result.error);

    let statusCode = 500;
    let errorMessage = result.error;

    if (result.error.includes('API key') || result.error.includes('configured')) {
      statusCode = 503;
      errorMessage = 'AI Vision service is not properly configured. Please check your Vercel AI Gateway settings.';
    } else if (result.error.includes('rate limit')) {
      statusCode = 429;
      errorMessage = 'AI Vision service rate limit exceeded. Please try again in a moment.';
    } else if (result.error.includes('No high-confidence') || result.error.includes('No valid flashcards')) {
      statusCode = 422;
      errorMessage = 'Could not extract valid flashcards from the image. Please try with a clearer image.';
    }

    return errorResponse(errorMessage, statusCode, result.validation?.errors || []);
  }

  return successResponse(
    {
      flashcards: result.flashcards,
      stats: result.stats,
      validation: result.validation,
    },
    `Successfully extracted ${result.flashcards.length} flashcards from the image.`
  );
});

/**
 * GET handler for service health check
 */
export const GET = apiHandler(async () => {
  return successResponse({
    service: 'flashcard-scanner',
    status: 'configured',
    aiGateway: {
      model: process.env.VISION_MODEL || 'google/gemini-3-flash',
    },
  });
});
