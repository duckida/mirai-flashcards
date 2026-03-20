/**
 * GET /api/user - Get current user profile
 * PATCH /api/user - Update user preferences
 */

import { getUser, updateUserPreferences, upsertUser } from '@/lib/services/authService';
import { getUser as getCivicUser } from '@civic/auth/nextjs';

/**
 * GET handler - Retrieve current user profile
 */
export async function GET(request) {
  try {
    const civicUser = await getCivicUser();

    if (!civicUser) {
      return Response.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    let user = await getUser(civicUser.id);

    if (!user) {
      user = await upsertUser(civicUser);
    }

    return Response.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return Response.json(
      { success: false, error: 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
}

/**
 * PATCH handler - Update user preferences
 */
export async function PATCH(request) {
  try {
    const civicUser = await getCivicUser();

    if (!civicUser) {
      return Response.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { preferences } = body;

    if (!preferences || typeof preferences !== 'object') {
      return Response.json(
        { success: false, error: 'Invalid preferences object' },
        { status: 400 }
      );
    }

    const validQuizTypes = ['voice', 'image', 'mixed'];
    if (preferences.quizType && !validQuizTypes.includes(preferences.quizType)) {
      return Response.json(
        { success: false, error: 'Invalid quiz type. Must be voice, image, or mixed' },
        { status: 400 }
      );
    }

    if (preferences.speechRate !== undefined) {
      const rate = Number(preferences.speechRate);
      if (isNaN(rate) || rate < 0.5 || rate > 2.0) {
        return Response.json(
          { success: false, error: 'Speech rate must be between 0.5 and 2.0' },
          { status: 400 }
        );
      }
    }

    const validThemes = ['light', 'dark'];
    if (preferences.theme && !validThemes.includes(preferences.theme)) {
      return Response.json(
        { success: false, error: 'Invalid theme. Must be light or dark' },
        { status: 400 }
      );
    }

    const updatedUser = await updateUserPreferences(civicUser.id, preferences);

    return Response.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    return Response.json(
      { success: false, error: 'Failed to update user preferences' },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
