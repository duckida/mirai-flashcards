/**
 * Module Detail API Routes
 * GET    /api/modules/:id - Get module details with flashcard summary
 * PATCH  /api/modules/:id - Update module (rename, reassign flashcards)
 * DELETE /api/modules/:id - Delete module and its flashcards
 */

import { getFirestore } from '@/lib/firebase/admin.js';
import { apiHandler } from '@/lib/api/middleware.js';
import { errorResponse, successResponse, handleApiError } from '@/lib/api/errorHandler.js';

const ALLOWED_METHODS = 'GET, PATCH, DELETE, OPTIONS';

/**
 * GET handler - Get module details
 */
export const GET = apiHandler(async (request, { params }) => {
  const { id } = await params;

  if (!id) {
    return errorResponse('Module ID is required', 400);
  }

  const db = getFirestore();
  const moduleDoc = await db.collection('modules').doc(id).get();

  if (!moduleDoc.exists) {
    return errorResponse('Module not found', 404);
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

  return successResponse({
    module: {
      ...moduleData,
      flashcardCount: flashcards.length,
      aggregateKnowledgeScore: aggregateScore,
    },
  });
});

/**
 * PATCH handler - Update module
 * Expects JSON: { name?, description?, color? }
 */
export const PATCH = apiHandler(async (request, { params }) => {
  const { id } = await params;
  const body = await request.json();

  if (!id) {
    return errorResponse('Module ID is required', 400);
  }

  const db = getFirestore();
  const moduleDoc = await db.collection('modules').doc(id).get();

  if (!moduleDoc.exists) {
    return errorResponse('Module not found', 404);
  }

  const updates = {};
  if (body.name !== undefined) {
    if (!body.name.trim()) {
      return errorResponse('Module name cannot be empty', 400);
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
    return errorResponse('No updates provided', 400);
  }

  updates.updatedAt = new Date();
  await db.collection('modules').doc(id).update(updates);

  const updatedDoc = await db.collection('modules').doc(id).get();

  return successResponse(
    { module: { id: updatedDoc.id, ...updatedDoc.data() } },
    'Module updated successfully'
  );
});

/**
 * DELETE handler - Delete module and all its flashcards
 */
export const DELETE = apiHandler(async (request, { params }) => {
  const { id } = await params;

  if (!id) {
    return errorResponse('Module ID is required', 400);
  }

  const db = getFirestore();
  const moduleDoc = await db.collection('modules').doc(id).get();

  if (!moduleDoc.exists) {
    return errorResponse('Module not found', 404);
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

  return successResponse(
    { deletedFlashcardCount: flashcardsSnapshot.size },
    `Module and ${flashcardsSnapshot.size} flashcard(s) deleted successfully`
  );
});
