/**
 * POST /api/flashcards/scan
 * Handles AI vision extraction of flashcards from uploaded images
 * Uses Vercel AI Gateway for vision capabilities
 */

import { processImage } from '@/lib/services/scannerService';

/**
 * POST handler for image scanning and flashcard extraction
 * Expects JSON with:
 * - imageUrl: URL of the uploaded image (from Vercel Storage)
 * - confidenceThreshold: Optional confidence threshold (default: 0.5)
 */
export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { imageUrl, confidenceThreshold = 0.5 } = body;

    // Validate inputs
    if (!imageUrl) {
      return Response.json(
        { success: false, error: 'imageUrl is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(imageUrl);
    } catch (error) {
      return Response.json(
        { success: false, error: 'Invalid imageUrl format' },
        { status: 400 }
      );
    }

    // Validate confidence threshold
    if (typeof confidenceThreshold !== 'number' || confidenceThreshold < 0 || confidenceThreshold > 1) {
      return Response.json(
        { success: false, error: 'confidenceThreshold must be a number between 0 and 1' },
        { status: 400 }
      );
    }

    console.log(`Starting flashcard extraction from: ${imageUrl}`);
    console.log(`Confidence threshold: ${confidenceThreshold}`);

    // Process the image using scanner service
    const result = await processImage(imageUrl, { confidenceThreshold });

    if (!result.success) {
      console.error('Flashcard extraction failed:', result.error);
      
      // Provide more specific error responses
      let statusCode = 500;
      let errorMessage = result.error;
      
      if (result.error.includes('API key') || result.error.includes('configured')) {
        statusCode = 503; // Service Unavailable
        errorMessage = 'AI Vision service is not properly configured. Please check your Vercel AI Gateway settings.';
      } else if (result.error.includes('rate limit')) {
        statusCode = 429; // Too Many Requests
        errorMessage = 'AI Vision service rate limit exceeded. Please try again in a moment.';
      } else if (result.error.includes('No high-confidence') || result.error.includes('No valid flashcards')) {
        statusCode = 422; // Unprocessable Entity
        errorMessage = 'Could not extract valid flashcards from the image. Please try with a clearer image.';
      }

      return Response.json(
        { 
          success: false, 
          error: errorMessage,
          details: result.validation?.errors || []
        },
        { status: statusCode }
      );
    }

    console.log(`Successfully extracted ${result.flashcards?.length || 0} flashcards`);
    console.log(`Average confidence: ${result.stats?.averageConfidence?.toFixed(2) || 'N/A'}`);

    // Return successful response
    return Response.json(
      {
        success: true,
        flashcards: result.flashcards,
        stats: result.stats,
        validation: result.validation,
        message: `Successfully extracted ${result.flashcards.length} flashcards from the image.`
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Scan endpoint error:', error);
    
    // Handle specific error types
    let errorMessage = 'Internal server error';
    let statusCode = 500;
    
    if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
      errorMessage = 'Invalid JSON in request body';
      statusCode = 400;
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      errorMessage = 'Network error while communicating with AI Vision service';
      statusCode = 503;
    }

    return Response.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS(request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

/**
 * GET handler for service health check
 */
export async function GET(request) {
  try {
    // Check if AI Gateway is configured
    const hasApiKey = process.env.VERCEL_AI_GATEWAY_API_KEY || process.env.OPENAI_API_KEY;
    
    return Response.json(
      {
        service: 'flashcard-scanner',
        status: hasApiKey ? 'configured' : 'not_configured',
        aiGateway: {
          configured: !!hasApiKey,
          baseUrl: process.env.VERCEL_AI_GATEWAY_URL || 'not_set',
          model: process.env.VISION_MODEL || 'gpt-4-vision-preview'
        },
        message: hasApiKey 
          ? 'Scanner service is ready. POST to /api/flashcards/scan with { imageUrl: "your-image-url" } to extract flashcards.'
          : 'Scanner service requires VERCEL_AI_GATEWAY_API_KEY or OPENAI_API_KEY environment variable.'
      },
      { status: 200 }
    );
  } catch (error) {
    return Response.json(
      { service: 'flashcard-scanner', status: 'error', error: error.message },
      { status: 500 }
    );
  }
}