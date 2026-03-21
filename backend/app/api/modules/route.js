/**
 * Module API Routes
 * GET  /api/modules - List all modules for a user
 * POST /api/modules - Create a new module
 */

import { getFirestore } from '@/lib/firebase/admin.js';
import { apiHandler } from '@/lib/api/middleware.js';
import { errorResponse, successResponse, validateRequired } from '@/lib/api/errorHandler.js';

const ALLOWED_METHODS = 'GET, POST, OPTIONS';

/**
 * GET handler - List all modules for a user
 * Expects query param: userId
 */
export const GET = apiHandler(async (request) => {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return errorResponse('User ID is required', 400);
  }

  try {
    const db = getFirestore();
    const snapshot = await db
      .collection('modules')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    const modules = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return successResponse({ modules });
  } catch (err) {
    console.error('Error fetching modules:', err);
    if (err.message && err.message.includes('requires an index')) {
      console.error('Missing index error details:', err.message);
      return errorResponse(
        `Database index not found: ${err.message}`,
        500
      );
    }
    return errorResponse(err.message || 'Failed to fetch modules', 500);
  }
});

/**
 * POST handler - Create a new module
 * Expects JSON: { userId, name, description?, color? }
 */
export const POST = apiHandler(async (request) => {
  const body = await request.json();
  const { userId, name, description, color } = body;

  if (!userId) {
    return errorResponse('User ID is required', 400);
  }

  if (!name || !name.trim()) {
    return errorResponse('Module name is required', 400);
  }

  const db = getFirestore();
  const moduleData = {
    userId,
    name: name.trim(),
    description: description?.trim() || '',
    flashcardCount: 0,
    aggregateKnowledgeScore: 0,
    color: color || getRandomModuleColor(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const ref = await db.collection('modules').add(moduleData);

  return successResponse(
    { module: { id: ref.id, ...moduleData } },
    `Module "${name}" created successfully`,
    201
  );
});

function getRandomModuleColor() {
  const colors = ['#9333EA', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#14B8A6'];
  return colors[Math.floor(Math.random() * colors.length)];
}
