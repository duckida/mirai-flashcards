/**
 * POST /api/ai/classify
 * Classifies a flashcard into a topic module using AI classification
 * GET  /api/ai/classify - Service health check
 */

import { classifyFlashcard, findMatchingModule, checkConfiguration } from '@/lib/services/classifierService';
import { apiHandler } from '@/lib/api/middleware.js';
import { errorResponse, successResponse } from '@/lib/api/errorHandler.js';

/**
 * POST handler for flashcard classification
 * Expects JSON with:
 * - question: The flashcard question text
 * - answer: The flashcard answer text
 * - existingModules: Optional array of existing module names [{id, name}]
 */
export const POST = apiHandler(async (request) => {
  const body = await request.json();
  const { question, answer, existingModules = [] } = body;

  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return errorResponse('question is required and must be a non-empty string', 400);
  }

  if (!answer || typeof answer !== 'string' || answer.trim().length === 0) {
    return errorResponse('answer is required and must be a non-empty string', 400);
  }

  const flashcard = { question: question.trim(), answer: answer.trim() };

  if (existingModules.length > 0) {
    const match = await findMatchingModule(flashcard, existingModules);

    return successResponse({
      assignment: {
        moduleId: match.moduleId,
        moduleName: match.moduleName,
        confidence: match.confidence,
        shouldCreateNew: match.shouldCreateNew,
      },
    }, match.shouldCreateNew
      ? `Suggested new module: "${match.moduleName}"`
      : `Matched to existing module: "${match.moduleName}"`);
  }

  const moduleNames = existingModules.map(m => (typeof m === 'string' ? m : m.name));
  const result = await classifyFlashcard(flashcard, moduleNames);

  if (!result.success) {
    let statusCode = 500;
    if (result.error.includes('not configured')) statusCode = 503;
    else if (result.error.includes('rate limit')) statusCode = 429;
    return errorResponse(result.error, statusCode);
  }

  return successResponse(
    { assignment: result.assignment },
    `Classified as "${result.assignment.moduleName}" (${result.assignment.action})`
  );
});

/**
 * GET handler for service health check
 */
export const GET = apiHandler(async () => {
  const config = checkConfiguration();

  return successResponse({
    service: 'ai-classification',
    status: config.configured ? 'configured' : 'not_configured',
    model: config.model,
  });
});
