/**
 * Module Detail API Routes
 * GET    /api/modules/:id - Get module details with flashcard summary
 * PATCH  /api/modules/:id - Update module (rename, reassign flashcards)
 * DELETE /api/modules/:id - Delete module and its flashcards
 */

import { getFirestore } from '@/lib/firebase/admin.js';

/**
 * GET handler - Get module details
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return Response.json(
        { success: false, error: 'Module ID is required' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const moduleDoc = await db.collection('modules').doc(id).get();

    if (!moduleDoc.exists) {
      return Response.json(
        { success: false, error: 'Module not found' },
        { status: 404 }
      );
    }

    const moduleData = { id: moduleDoc.id, ...moduleDoc.data() };

    // Get flashcards in this module for summary stats
    const flashcardsSnapshot = await db
      .collection('flashcards')
      .where('moduleId', '==', id)
      .get();

    const flashcards = flashcardsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Calculate aggregate knowledge score
    let aggregateScore = 0;
    if (flashcards.length > 0) {
      const totalScore = flashcards.reduce((sum, card) => sum + (card.knowledgeScore || 0), 0);
      aggregateScore = Math.round(totalScore / flashcards.length);
    }

    // Update the module's aggregate score if it changed
    if (moduleData.aggregateKnowledgeScore !== aggregateScore || moduleData.flashcardCount !== flashcards.length) {
      await db.collection('modules').doc(id).update({
        flashcardCount: flashcards.length,
        aggregateKnowledgeScore: aggregateScore,
        updatedAt: new Date(),
      });
    }

    return Response.json({
      success: true,
      module: {
        ...moduleData,
        flashcardCount: flashcards.length,
        aggregateKnowledgeScore: aggregateScore,
      },
    });
  } catch (error) {
    console.error('Get module error:', error);
    return Response.json(
      { success: false, error: 'Failed to retrieve module', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH handler - Update module
 * Expects JSON: { name?, description?, color? }
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return Response.json(
        { success: false, error: 'Module ID is required' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const moduleDoc = await db.collection('modules').doc(id).get();

    if (!moduleDoc.exists) {
      return Response.json(
        { success: false, error: 'Module not found' },
        { status: 404 }
      );
    }

    const updates = {};
    if (body.name !== undefined) {
      if (!body.name.trim()) {
        return Response.json(
          { success: false, error: 'Module name cannot be empty' },
          { status: 400 }
        );
      }
      updates.name = body.name.trim();
    }
    if (body.description !== undefined) {
      updates.description = body.description.trim();
    }
    if (body.color !== undefined) {
      updates.color = body.color;
    }

    if (Object.keys(updates).length === 0) {
      return Response.json(
        { success: false, error: 'No updates provided' },
        { status: 400 }
      );
    }

    updates.updatedAt = new Date();
    await db.collection('modules').doc(id).update(updates);

    const updatedDoc = await db.collection('modules').doc(id).get();

    return Response.json({
      success: true,
      module: { id: updatedDoc.id, ...updatedDoc.data() },
      message: 'Module updated successfully',
    });
  } catch (error) {
    console.error('Update module error:', error);
    return Response.json(
      { success: false, error: 'Failed to update module', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler - Delete module and all its flashcards
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return Response.json(
        { success: false, error: 'Module ID is required' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const moduleDoc = await db.collection('modules').doc(id).get();

    if (!moduleDoc.exists) {
      return Response.json(
        { success: false, error: 'Module not found' },
        { status: 404 }
      );
    }

    // Delete all flashcards in this module
    const flashcardsSnapshot = await db
      .collection('flashcards')
      .where('moduleId', '==', id)
      .get();

    const batch = db.batch();
    flashcardsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    batch.delete(db.collection('modules').doc(id));
    await batch.commit();

    return Response.json({
      success: true,
      message: `Module and ${flashcardsSnapshot.size} flashcard(s) deleted successfully`,
      deletedFlashcardCount: flashcardsSnapshot.size,
    });
  } catch (error) {
    console.error('Delete module error:', error);
    return Response.json(
      { success: false, error: 'Failed to delete module', details: error.message },
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
      'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
