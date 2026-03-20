/**
 * POST /api/flashcards
 * Saves confirmed flashcards to Firestore with module classification
 * Supports both single and batch flashcard creation
 */

import { getFirestore } from '@/lib/firebase/admin.js';
import { findMatchingModule } from '@/lib/services/classifierService';

/**
 * POST handler for saving flashcards
 * Expects JSON with:
 * - userId: The user ID
 * - flashcards: Array of { question, answer, sourceImageUrl, confidence }
 * - moduleId: Optional - if provided, all flashcards go to this module
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, flashcards, moduleId } = body;

    // Validate inputs
    if (!userId) {
      return Response.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!flashcards || !Array.isArray(flashcards) || flashcards.length === 0) {
      return Response.json(
        { success: false, error: 'At least one flashcard is required' },
        { status: 400 }
      );
    }

    // Validate each flashcard has question and answer
    for (let i = 0; i < flashcards.length; i++) {
      const card = flashcards[i];
      if (!card.question || !card.question.trim()) {
        return Response.json(
          { success: false, error: `Flashcard ${i + 1}: Question is required` },
          { status: 400 }
        );
      }
      if (!card.answer || !card.answer.trim()) {
        return Response.json(
          { success: false, error: `Flashcard ${i + 1}: Answer is required` },
          { status: 400 }
        );
      }
    }

    const db = getFirestore();
    const savedFlashcards = [];
    const moduleAssignments = {};

    // If moduleId is provided, use it directly
    if (moduleId) {
      const moduleDoc = await db.collection('modules').doc(moduleId).get();
      if (!moduleDoc.exists) {
        return Response.json(
          { success: false, error: 'Specified module not found' },
          { status: 404 }
        );
      }

      for (const card of flashcards) {
        const flashcardData = {
          userId,
          moduleId,
          question: card.question.trim(),
          answer: card.answer.trim(),
          sourceImageUrl: card.sourceImageUrl || '',
          confidence: card.confidence || 0,
          knowledgeScore: 0,
          reviewCount: 0,
          correctCount: 0,
          incorrectCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const ref = await db.collection('flashcards').add(flashcardData);
        savedFlashcards.push({ id: ref.id, ...flashcardData });

        // Track module assignment
        if (!moduleAssignments[moduleId]) {
          moduleAssignments[moduleId] = {
            moduleName: moduleDoc.data().name,
            flashcardIds: [],
          };
        }
        moduleAssignments[moduleId].flashcardIds.push(ref.id);
      }

      // Update module flashcard count and aggregate score
      const existingCount = moduleDoc.data().flashcardCount || 0;
      const newCount = existingCount + flashcards.length;
      const allSnapshot = await db
        .collection('flashcards')
        .where('moduleId', '==', moduleId)
        .get();
      const allCards = allSnapshot.docs.map((doc) => doc.data());
      const totalScore = allCards.reduce((sum, card) => sum + (card.knowledgeScore || 0), 0);
      const aggregateKnowledgeScore = newCount > 0 ? Math.round(totalScore / newCount) : 0;
      await db.collection('modules').doc(moduleId).update({
        flashcardCount: newCount,
        aggregateKnowledgeScore,
        updatedAt: new Date(),
      });
    } else {
      // Classify each flashcard into a module
      // First, get existing modules for the user
      const modulesSnapshot = await db
        .collection('modules')
        .where('userId', '==', userId)
        .get();

      const existingModules = modulesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      for (const card of flashcards) {
        let targetModuleId;
        let targetModuleName;

        if (existingModules.length > 0) {
          // Use classifier to find matching module
          const match = await findMatchingModule(
            { question: card.question, answer: card.answer },
            existingModules.map((m) => ({ id: m.id, name: m.name }))
          );

          if (!match.shouldCreateNew && match.moduleId) {
            targetModuleId = match.moduleId;
            targetModuleName = match.moduleName;
          } else {
            // Create new module
            const newModuleRef = await db.collection('modules').add({
              userId,
              name: match.moduleName,
              description: `Auto-created from uploaded flashcards`,
              flashcardCount: 0,
              aggregateKnowledgeScore: 0,
              color: getRandomModuleColor(),
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            targetModuleId = newModuleRef.id;
            targetModuleName = match.moduleName;

            // Add to existing modules list for subsequent classifications
            existingModules.push({
              id: targetModuleId,
              name: targetModuleName,
            });
          }
        } else {
          // No existing modules, create one
          const newModuleRef = await db.collection('modules').add({
            userId,
            name: 'My Flashcards',
            description: 'Auto-created from uploaded flashcards',
            flashcardCount: 0,
            aggregateKnowledgeScore: 0,
            color: getRandomModuleColor(),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          targetModuleId = newModuleRef.id;
          targetModuleName = 'My Flashcards';

          existingModules.push({
            id: targetModuleId,
            name: targetModuleName,
          });
        }

        // Create the flashcard
        const flashcardData = {
          userId,
          moduleId: targetModuleId,
          question: card.question.trim(),
          answer: card.answer.trim(),
          sourceImageUrl: card.sourceImageUrl || '',
          confidence: card.confidence || 0,
          knowledgeScore: 0,
          reviewCount: 0,
          correctCount: 0,
          incorrectCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const ref = await db.collection('flashcards').add(flashcardData);
        savedFlashcards.push({ id: ref.id, ...flashcardData });

        // Track module assignment
        if (!moduleAssignments[targetModuleId]) {
          moduleAssignments[targetModuleId] = {
            moduleName: targetModuleName,
            flashcardIds: [],
          };
        }
        moduleAssignments[targetModuleId].flashcardIds.push(ref.id);
      }

      // Update flashcard counts and aggregate scores for all affected modules
      for (const [modId, assignment] of Object.entries(moduleAssignments)) {
        const moduleDoc = await db.collection('modules').doc(modId).get();
        const existingCount = moduleDoc.data().flashcardCount || 0;
        const newCount = existingCount + assignment.flashcardIds.length;
        const allSnapshot = await db
          .collection('flashcards')
          .where('moduleId', '==', modId)
          .get();
        const allCards = allSnapshot.docs.map((doc) => doc.data());
        const totalScore = allCards.reduce((sum, card) => sum + (card.knowledgeScore || 0), 0);
        const aggregateKnowledgeScore = newCount > 0 ? Math.round(totalScore / newCount) : 0;
        await db.collection('modules').doc(modId).update({
          flashcardCount: newCount,
          aggregateKnowledgeScore,
          updatedAt: new Date(),
        });
      }
    }

    return Response.json(
      {
        success: true,
        flashcards: savedFlashcards,
        moduleAssignments: Object.entries(moduleAssignments).map(([modId, data]) => ({
          moduleId: modId,
          moduleName: data.moduleName,
          flashcardCount: data.flashcardIds.length,
        })),
        message: `Successfully saved ${savedFlashcards.length} flashcard${savedFlashcards.length > 1 ? 's' : ''}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Save flashcards error:', error);
    return Response.json(
      { success: false, error: 'Failed to save flashcards', details: error.message },
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

/**
 * Returns a random module color for new modules
 */
function getRandomModuleColor() {
  const colors = ['#9333EA', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#14B8A6'];
  return colors[Math.floor(Math.random() * colors.length)];
}
