/**
 * Flashcard API Routes
 * GET    /api/flashcards/:id - Retrieve all flashcards in a module (id = moduleId)
 * PATCH  /api/flashcards/:id - Update a flashcard (id = flashcardId)
 * DELETE /api/flashcards/:id - Delete a flashcard (id = flashcardId)
 */

import { getFirestore } from '@/lib/firebase/admin.js';
import { recalculateModuleAggregate } from '@/lib/services/scoringService.js';

/**
 * GET handler - Get flashcards for a module
 * The :id param is treated as a moduleId
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

    // Verify module exists
    const moduleDoc = await db.collection('modules').doc(id).get();
    if (!moduleDoc.exists) {
      return Response.json(
        { success: false, error: 'Module not found' },
        { status: 404 }
      );
    }

    // Get flashcards ordered by knowledge score ascending (weakest first)
    const snapshot = await db
      .collection('flashcards')
      .where('moduleId', '==', id)
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
 * PATCH handler - Update a flashcard
 * Expects JSON: { question?, answer?, moduleId? }
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return Response.json(
        { success: false, error: 'Flashcard ID is required' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const flashcardDoc = await db.collection('flashcards').doc(id).get();

    if (!flashcardDoc.exists) {
      return Response.json(
        { success: false, error: 'Flashcard not found' },
        { status: 404 }
      );
    }

    const updates = {};

    if (body.question !== undefined) {
      if (!body.question.trim()) {
        return Response.json(
          { success: false, error: 'Question cannot be empty' },
          { status: 400 }
        );
      }
      updates.question = body.question.trim();
    }

    if (body.answer !== undefined) {
      if (!body.answer.trim()) {
        return Response.json(
          { success: false, error: 'Answer cannot be empty' },
          { status: 400 }
        );
      }
      updates.answer = body.answer.trim();
    }

    // Handle module reassignment
    if (body.moduleId !== undefined) {
      const oldData = flashcardDoc.data();
      const oldModuleId = oldData.moduleId;

      if (oldModuleId !== body.moduleId) {
        // Verify new module exists
        const newModuleDoc = await db.collection('modules').doc(body.moduleId).get();
        if (!newModuleDoc.exists) {
          return Response.json(
            { success: false, error: 'Target module not found' },
            { status: 404 }
          );
        }

        updates.moduleId = body.moduleId;

        // Recalculate old module aggregate score
        if (oldModuleId) {
          await recalculateModuleAggregate(oldModuleId);
        }

        // Increment new module count then recalculate aggregate
        const newCount = newModuleDoc.data().flashcardCount || 0;
        await db.collection('modules').doc(body.moduleId).update({
          flashcardCount: newCount + 1,
          updatedAt: new Date(),
        });
        await recalculateModuleAggregate(body.moduleId);
      }
    }

    if (Object.keys(updates).length === 0) {
      return Response.json(
        { success: false, error: 'No updates provided' },
        { status: 400 }
      );
    }

    updates.updatedAt = new Date();
    await db.collection('flashcards').doc(id).update(updates);

    const updatedDoc = await db.collection('flashcards').doc(id).get();

    return Response.json({
      success: true,
      flashcard: { id: updatedDoc.id, ...updatedDoc.data() },
      message: 'Flashcard updated successfully',
    });
  } catch (error) {
    console.error('Update flashcard error:', error);
    return Response.json(
      { success: false, error: 'Failed to update flashcard', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler - Delete a flashcard
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return Response.json(
        { success: false, error: 'Flashcard ID is required' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const flashcardDoc = await db.collection('flashcards').doc(id).get();

    if (!flashcardDoc.exists) {
      return Response.json(
        { success: false, error: 'Flashcard not found' },
        { status: 404 }
      );
    }

    const flashcardData = flashcardDoc.data();
    const moduleId = flashcardData.moduleId;

    // Delete the flashcard
    await db.collection('flashcards').doc(id).delete();

    // Recalculate module aggregate score after deletion
    if (moduleId) {
      await recalculateModuleAggregate(moduleId);
    }

    return Response.json({
      success: true,
      message: 'Flashcard deleted successfully',
    });
  } catch (error) {
    console.error('Delete flashcard error:', error);
    return Response.json(
      { success: false, error: 'Failed to delete flashcard', details: error.message },
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
