/**
 * Flashcards by Module API Route
 * GET /api/flashcards/:moduleId - Retrieve all flashcards in a module
 */

import { getFirestore } from '@/lib/firebase/admin.js';

/**
 * GET handler - Get flashcards for a module
 */
export async function GET(request, { params }) {
  try {
    const { moduleId } = await params;

    if (!moduleId) {
      return Response.json(
        { success: false, error: 'Module ID is required' },
        { status: 400 }
      );
    }

    const db = getFirestore();

    // Verify module exists
    const moduleDoc = await db.collection('modules').doc(moduleId).get();
    if (!moduleDoc.exists) {
      return Response.json(
        { success: false, error: 'Module not found' },
        { status: 404 }
      );
    }

    // Get flashcards ordered by knowledge score ascending (weakest first)
    const snapshot = await db
      .collection('flashcards')
      .where('moduleId', '==', moduleId)
      .orderBy('knowledgeScore', 'asc')
      .get();

    const flashcards = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return Response.json({
      success: true,
      module: { id: moduleDoc.id, ...moduleDoc.data() },
      flashcards,
    });
  } catch (error) {
    console.error('Get module flashcards error:', error);
    return Response.json(
      { success: false, error: 'Failed to retrieve flashcards', details: error.message },
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
