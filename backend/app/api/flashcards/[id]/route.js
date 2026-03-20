/**
 * Flashcard Individual API Routes
 * PATCH  /api/flashcards/:id - Update flashcard
 * DELETE /api/flashcards/:id - Delete flashcard
 */

import { getFirestore } from '@/lib/firebase/admin.js';

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

        // Decrement old module count
        if (oldModuleId) {
          const oldModuleDoc = await db.collection('modules').doc(oldModuleId).get();
          if (oldModuleDoc.exists) {
            const oldCount = oldModuleDoc.data().flashcardCount || 0;
            await db.collection('modules').doc(oldModuleId).update({
              flashcardCount: Math.max(0, oldCount - 1),
              updatedAt: new Date(),
            });
          }
        }

        // Increment new module count
        const newCount = newModuleDoc.data().flashcardCount || 0;
        await db.collection('modules').doc(body.moduleId).update({
          flashcardCount: newCount + 1,
          updatedAt: new Date(),
        });
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

    // Update module flashcard count and recalculate aggregate score
    if (moduleId) {
      const moduleDoc = await db.collection('modules').doc(moduleId).get();
      if (moduleDoc.exists) {
        const currentCount = moduleDoc.data().flashcardCount || 0;
        const newCount = Math.max(0, currentCount - 1);

        let aggregateKnowledgeScore = 0;
        if (newCount > 0) {
          const remainingSnapshot = await db
            .collection('flashcards')
            .where('moduleId', '==', moduleId)
            .get();
          const remaining = remainingSnapshot.docs.map((doc) => doc.data());
          const totalScore = remaining.reduce((sum, card) => sum + (card.knowledgeScore || 0), 0);
          aggregateKnowledgeScore = Math.round(totalScore / remaining.length);
        }

        await db.collection('modules').doc(moduleId).update({
          flashcardCount: newCount,
          aggregateKnowledgeScore,
          updatedAt: new Date(),
        });
      }
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
      'Access-Control-Allow-Methods': 'PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
