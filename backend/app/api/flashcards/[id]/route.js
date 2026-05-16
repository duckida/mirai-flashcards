/**
 * Flashcard API Routes
 * GET    /api/flashcards/:id - Retrieve all flashcards in a module (id = moduleId)
 * PATCH  /api/flashcards/:id - Update a flashcard (id = flashcardId)
 * DELETE /api/flashcards/:id - Delete a flashcard (id = flashcardId)
 */

import { getFirestore } from '@/lib/firebase/admin.js';
import { recalculateModuleAggregate, incrementModuleAggregate } from '@/lib/services/scoringService.js';
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
    .limit(200)
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

  if (body.sourceImageUrl !== undefined) {
    updates.sourceImageUrl = body.sourceImageUrl;
  }

  if (body.displayImageUrl !== undefined) {
    updates.displayImageUrl = body.displayImageUrl;
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
        const oldScore = oldData.knowledgeScore || 0;
        const db2 = getFirestore();
        const oldModuleRef = db2.collection('modules').doc(oldModuleId);
        const oldModuleData = (await oldModuleRef.get()).data();
        if (oldModuleData?.totalKnowledgeScore !== undefined) {
          const newOldTotal = oldModuleData.totalKnowledgeScore - oldScore;
          const newOldCount = (oldModuleData.flashcardCount || 1) - 1;
          await oldModuleRef.update({
            flashcardCount: newOldCount,
            totalKnowledgeScore: newOldTotal,
            aggregateKnowledgeScore: newOldCount > 0 ? Math.round(newOldTotal / newOldCount) : 0,
            updatedAt: new Date(),
          });
        } else {
          await recalculateModuleAggregate(oldModuleId);
        }
      }

      const newCount = newModuleDoc.data().flashcardCount || 0;
      const newTotal = (newModuleDoc.data().totalKnowledgeScore || 0) + (oldData.knowledgeScore || 0);
      await db.collection('modules').doc(body.moduleId).update({
        flashcardCount: newCount + 1,
        totalKnowledgeScore: newTotal,
        aggregateKnowledgeScore: Math.round(newTotal / (newCount + 1)),
        updatedAt: new Date(),
      });
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
  const deletedScore = flashcardData.knowledgeScore || 0;

  await db.collection('flashcards').doc(id).delete();

  if (moduleId) {
    const db = getFirestore();
    const moduleRef = db.collection('modules').doc(moduleId);
    const moduleDoc = await moduleRef.get();
    if (moduleDoc.exists) {
      const data = moduleDoc.data();
      const newCount = (data.flashcardCount || 1) - 1;
      if (data.totalKnowledgeScore !== undefined) {
        const newTotal = data.totalKnowledgeScore - deletedScore;
        const newAggregate = newCount > 0 ? Math.round(newTotal / newCount) : 0;
        await moduleRef.update({
          flashcardCount: newCount,
          totalKnowledgeScore: newTotal,
          aggregateKnowledgeScore: newAggregate,
          updatedAt: new Date(),
        });
      } else {
        await recalculateModuleAggregate(moduleId);
      }
    }
  }

  return successResponse(null, 'Flashcard deleted successfully');
});
