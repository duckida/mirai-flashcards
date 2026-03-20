/**
 * POST /api/ai/classify
 * Classifies a flashcard into a topic module using AI classification
 */

import { classifyFlashcard, findMatchingModule, checkConfiguration } from '@/lib/services/classifierService';

/**
 * POST handler for flashcard classification
 * Expects JSON with:
 * - question: The flashcard question text
 * - answer: The flashcard answer text
 * - existingModules: Optional array of existing module names [{id, name}]
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { question, answer, existingModules = [] } = body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return Response.json(
        { success: false, error: 'question is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (!answer || typeof answer !== 'string' || answer.trim().length === 0) {
      return Response.json(
        { success: false, error: 'answer is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    const flashcard = { question: question.trim(), answer: answer.trim() };

    if (existingModules.length > 0) {
      const match = await findMatchingModule(flashcard, existingModules);

      return Response.json({
        success: true,
        assignment: {
          moduleId: match.moduleId,
          moduleName: match.moduleName,
          confidence: match.confidence,
          shouldCreateNew: match.shouldCreateNew,
        },
        message: match.shouldCreateNew
          ? `Suggested new module: "${match.moduleName}"`
          : `Matched to existing module: "${match.moduleName}"`,
      }, { status: 200 });
    }

    const moduleNames = existingModules.map(m => (typeof m === 'string' ? m : m.name));
    const result = await classifyFlashcard(flashcard, moduleNames);

    if (!result.success) {
      let statusCode = 500;
      if (result.error.includes('not configured')) statusCode = 503;
      else if (result.error.includes('rate limit')) statusCode = 429;

      return Response.json({ success: false, error: result.error }, { status: statusCode });
    }

    return Response.json({
      success: true,
      assignment: result.assignment,
      message: `Classified as "${result.assignment.moduleName}" (${result.assignment.action})`,
    }, { status: 200 });

  } catch (error) {
    console.error('Classification endpoint error:', error);

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
    service: 'ai-classification',
    status: config.configured ? 'configured' : 'not_configured',
    model: config.model,
    message: config.configured
      ? 'Classification service is ready. POST to /api/ai/classify with { question: "...", answer: "..." } to classify a flashcard.'
      : 'Classification service requires AI_GATEWAY_API_KEY environment variable.',
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
