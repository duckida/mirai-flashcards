/**
 * GET /api/user - Get current user profile
 * PATCH /api/user - Update user preferences
 */

import { getUser, updateUserPreferences, upsertUser } from '@/lib/services/authService';
import { getUser as getCivicUser } from '@civic/auth/nextjs';
import { apiHandler } from '@/lib/api/middleware.js';
import { errorResponse, successResponse } from '@/lib/api/errorHandler.js';

/**
 * GET handler - Retrieve current user profile
 */
export const GET = apiHandler(async () => {
  const civicUser = await getCivicUser();

  if (!civicUser) {
    return errorResponse('Unauthorized', 401);
  }

  let user = await getUser(civicUser.id);

  if (!user) {
    user = await upsertUser(civicUser);
  }

  return successResponse({ user });
});

/**
 * PATCH handler - Update user preferences
 */
export const PATCH = apiHandler(async (request) => {
  const civicUser = await getCivicUser();

  if (!civicUser) {
    return errorResponse('Unauthorized', 401);
  }

  const body = await request.json();
  const { preferences } = body;

  if (!preferences || typeof preferences !== 'object') {
    return errorResponse('Invalid preferences object', 400);
  }

  const validQuizTypes = ['voice', 'image', 'mixed'];
  if (preferences.quizType && !validQuizTypes.includes(preferences.quizType)) {
    return errorResponse('Invalid quiz type. Must be voice, image, or mixed', 400);
  }

  if (preferences.speechRate !== undefined) {
    const rate = Number(preferences.speechRate);
    if (isNaN(rate) || rate < 0.5 || rate > 2.0) {
      return errorResponse('Speech rate must be between 0.5 and 2.0', 400);
    }
  }

  const validThemes = ['light', 'dark'];
  if (preferences.theme && !validThemes.includes(preferences.theme)) {
    return errorResponse('Invalid theme. Must be light or dark', 400);
  }

  const updatedUser = await updateUserPreferences(civicUser.id, preferences);

  return successResponse({ user: updatedUser });
});
