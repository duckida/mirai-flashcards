import {
  validateUser,
  validateModule,
  validateFlashcard,
  validateQuizSession,
  validateQuizResponse,
  validatePresentation,
  userExists,
  moduleBelongsToUser,
  flashcardBelongsToUser,
  flashcardBelongsToModule,
} from './validators.js';

export {
  validateUser,
  validateModule,
  validateFlashcard,
  validateQuizSession,
  validateQuizResponse,
  validatePresentation,
  userExists,
  moduleBelongsToUser,
  flashcardBelongsToUser,
  flashcardBelongsToModule,
};

/**
 * Validate request body against a validator function.
 * Returns a Next.js Response on failure, or null on success.
 *
 * @param {Object} body - Request body
 * @param {Function} validator - Validator function (e.g. validateFlashcard)
 * @param {Object} options - Options to pass to validator (e.g. { partial: true })
 * @returns {Response|null} 400 Response if invalid, null if valid
 */
export function validateBody(body, validator, options = {}) {
  const result = validator(body, options);
  if (!result.valid) {
    return Response.json(
      {
        error: 'Validation failed',
        details: result.errors.map(e => ({
          field: e.field,
          message: e.message,
        })),
      },
      { status: 400 }
    );
  }
  return null;
}

/**
 * Require authentication from request.
 * Extracts userId from x-user-id header (set by auth middleware).
 * Returns a Next.js Response on failure, or the userId on success.
 *
 * @param {Request} request
 * @returns {Response|string} 401 Response if not authenticated, userId string if authenticated
 */
export function requireAuth(request) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }
  return userId;
}
