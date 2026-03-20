/**
 * POST /api/ai/generate-image
 * Generates an image for a quiz question using AI image generation
 */

import { generateQuizImage, checkConfiguration } from '@/lib/services/imageService';

/**
 * POST handler for image generation
 * Expects JSON with:
 * - question: The quiz question text
 * - context: Optional context (module topic)
 * - questionId: Optional question ID for tracking
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { question, context, questionId } = body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return Response.json(
        { success: false, error: 'question is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    const result = await generateQuizImage(question, { context, questionId });

    if (!result.success) {
      let statusCode = 500;
      if (result.error.includes('not configured')) statusCode = 503;
      else if (result.error.includes('rate limit')) statusCode = 429;
      else if (result.error.includes('content policy')) statusCode = 422;

      return Response.json({ success: false, error: result.error }, { status: statusCode });
    }

    return Response.json({
      success: true,
      image: result.image,
      message: 'Image generated successfully',
    }, { status: 200 });

  } catch (error) {
    console.error('Image generation endpoint error:', error);

    if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
      return Response.json({ success: false, error: 'Invalid JSON in request body' }, { status: 400 });
    }

    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET handler for service health check
 */
export async function GET() {
  const config = checkConfiguration();

  return Response.json({
    service: 'ai-image-generation',
    status: config.configured ? 'configured' : 'not_configured',
    model: config.model,
    message: config.configured
      ? 'Image generation service is ready. POST to /api/ai/generate-image with { question: "..." } to generate an image.'
      : 'Image generation service requires AI_GATEWAY_API_KEY environment variable.',
  }, { status: 200 });
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
