/**
 * Module API Routes
 * GET  /api/modules - List all modules for a user
 * POST /api/modules - Create a new module
 */

import { getFirestore } from '@/lib/firebase/admin.js';

/**
 * GET handler - List all modules for a user
 * Expects query param: userId
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return Response.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

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

    return Response.json({
      success: true,
      modules,
    });
  } catch (error) {
    console.error('Get modules error:', error);
    return Response.json(
      { success: false, error: 'Failed to retrieve modules', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST handler - Create a new module
 * Expects JSON: { userId, name, description?, color? }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, name, description, color } = body;

    if (!userId) {
      return Response.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return Response.json(
        { success: false, error: 'Module name is required' },
        { status: 400 }
      );
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

    return Response.json(
      {
        success: true,
        module: { id: ref.id, ...moduleData },
        message: `Module "${name}" created successfully`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create module error:', error);
    return Response.json(
      { success: false, error: 'Failed to create module', details: error.message },
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

function getRandomModuleColor() {
  const colors = ['#9333EA', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#14B8A6'];
  return colors[Math.floor(Math.random() * colors.length)];
}
