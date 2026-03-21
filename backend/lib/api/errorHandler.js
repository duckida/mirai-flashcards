/**
 * Shared error handling utilities for API routes.
 * Provides consistent error/success response formatting.
 */

export class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Create a standardized success response.
 */
export function successResponse(data, message = null, status = 200) {
  const body = { success: true, ...data };
  if (message) body.message = message;
  return Response.json(body, { status });
}

/**
 * Create a standardized error response.
 */
export function errorResponse(message, status = 500, details = null) {
  const body = { success: false, error: message };
  if (details) body.details = details;
  return Response.json(body, { status });
}

/**
 * Catch-all error handler for use in catch blocks.
 * Logs the error and returns a standardized error response.
 */
export function handleApiError(error, context = 'API') {
  console.error(`${context} error:`, error);

  if (error instanceof AppError) {
    return errorResponse(error.message, error.statusCode, error.code);
  }

  // Handle JSON parse errors
  if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
    return errorResponse('Invalid JSON in request body', 400);
  }

  // Handle known service errors
  if (error.message?.includes('not found')) {
    return errorResponse(error.message, 404);
  }

  if (error.message?.includes('not active') || error.message?.includes('is not active')) {
    return errorResponse(error.message, 400);
  }

  if (error.message?.includes('No flashcards found')) {
    return errorResponse(error.message, 400);
  }

  if (error.message?.includes('rate limit')) {
    return errorResponse('Rate limit exceeded. Please try again later.', 429);
  }

  if (error.message?.includes('not configured')) {
    return errorResponse('Service is not configured', 503);
  }

  if (error.message?.includes('Unauthorized') || error.message?.includes('unauthorized')) {
    return errorResponse('Authentication required', 401);
  }

  if (error.message?.includes('Forbidden') || error.message?.includes('forbidden')) {
    return errorResponse('Access denied', 403);
  }

  return errorResponse('Internal server error', 500, process.env.NODE_ENV !== 'production' ? error.message : undefined);
}

/**
 * Validate required fields in a request body.
 * Returns an error response if any required field is missing/empty, or null if valid.
 */
export function validateRequired(body, fields) {
  for (const field of fields) {
    const value = body[field];
    if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
      return errorResponse(`${field} is required`, 400);
    }
  }
  return null;
}
