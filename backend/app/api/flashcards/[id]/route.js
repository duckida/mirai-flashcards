/**
 * Flashcard API Routes
 * GET    /api/flashcards/:id - Retrieve all flashcards in a module (id = moduleId)
 * PATCH  /api/flashcards/:id - Update a flashcard (id = flashcardId)
 * DELETE /api/flashcards/:id - Delete a flashcard (id = flashcardId)
 */

import { getFirestore } from '@/lib/firebase/admin.js';
import { recalculateModuleAggregate } from '@/lib/services/scoringService.js';
import { apiHandler } from '@/lib/api/middleware.js';
import { errorResponse, successResponse } from '@/lib/api/errorHandler.js';

/**
 * GET handler - Get flashcards for a module
 * The :id param is treated as a moduleId
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

  const snapshot = await db
    .collection('flashcards')
    .where('moduleId', '==', id)
    .orderBy('knowledgeScore', 'asc')
    .get();

  const flashcards = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return successResponse({
    module: { id: moduleDoc.id, ...moduleDoc.data() },
    flashcards,
  });
});

/**
 * PATCH handler - Update a flashcard
 * Expects JSON: { question?, answer?, moduleId? }
 */
export const PATCH = apiHandler(async (request, { params }) => {
  const { id } = await params;
  const body = await request.json();

  if (!id) {
    return errorResponse('Flashcard ID is required', 400);
  }

  const db = getFirestore();
  const flashcardDoc = await db.collection('flashcards').doc(id).get();

  if (!flashcardDoc.exists) {
    return errorResponse('Flashcard not found', 404);
  }

  const updates = {};

  if (body.question !== undefined) {
    if (!body.question.trim()) {
      return errorResponse('Question cannot be empty', 400);
    }
    updates.question = body.question.trim();
  }

  if (body.answer !== undefined) {
    if (!body.answer.trim()) {
      return errorResponse('Answer cannot be empty', 400);
    }
    updates.answer = body.answer.trim();
  }

  // Handle module reassignment
  if (body.moduleId !== undefined) {
    const oldData = flashcardDoc.data();
    const oldModuleId = oldData.moduleId;

    if (oldModuleId !== body.moduleId) {
      const newModuleDoc = await db.collection('modules').doc(body.moduleId).get();
      if (!newModuleDoc.exists) {
        return errorResponse('Target module not found', 404);
      }

      updates.moduleId = body.moduleId;

      if (oldModuleId) {
        await recalculateModuleAggregate(oldModuleId);
      }

      const newCount = newModuleDoc.data().flashcardCount || 0;
      await db.collection('modules').doc(body.moduleId).update({
        flashcardCount: newCount + 1,
        updatedAt: new Date(),
      });
      await recalculateModuleAggregate(body.moduleId);
    }
  }

  if (Object.keys(updates).length === 0) {
    return errorResponse('No updates provided', 400);
  }

  updates.updatedAt = new Date();
  await db.collection('flashcards').doc(id).update(updates);

  const updatedDoc = await db.collection('flashcards').doc(id).get();

  return successResponse(
    { flashcard: { id: updatedDoc.id, ...updatedDoc.data() } },
    'Flashcard updated successfully'
  );
});

/**
 * DELETE handler - Delete a flashcard
 */
export const DELETE = apiHandler(async (request, { params }) => {
  const { id } = await params;

  if (!id) {
    return errorResponse('Flashcard ID is required', 400);
  }

  const db = getFirestore();
  const flashcardDoc = await db.collection('flashcards').doc(id).get();

  if (!flashcardDoc.exists) {
    return errorResponse('Flashcard not found', 404);
  }

  const flashcardData = flashcardDoc.data();
  const moduleId = flashcardData.moduleId;

  await db.collection('flashcards').doc(id).delete();

  if (moduleId) {
    await recalculateModuleAggregate(moduleId);
  }

  return successResponse(null, 'Flashcard deleted successfully');
});
