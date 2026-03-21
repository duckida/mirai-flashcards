/**
 * POST /api/quiz/score-flashcard
 * Score a single flashcard answer
 */
import { getFirestore } from '@/lib/firebase/admin.js';
import { apiHandler } from '@/lib/api/middleware.js';
import { errorResponse, successResponse } from '@/lib/api/errorHandler.js';
import { updateFlashcardScore } from '@/lib/services/scoringService.js';

const db = getFirestore();

export const POST = apiHandler(async (request) => {
  const body = await request.json();
  const { flashcardId, userAnswer, correctAnswer } = body;

  if (!flashcardId) {
    return errorResponse('Flashcard ID is required', 400);
  }

  if (!userAnswer) {
    return errorResponse('User answer is required', 400);
  }

  const flashcardDoc = await db.collection('flashcards').doc(flashcardId).get();
  if (!flashcardDoc.exists) {
    return errorResponse('Flashcard not found', 404);
  }

  const actualCorrectAnswer = correctAnswer || flashcardDoc.data().content || '';
  
  const normalizedCorrect = actualCorrectAnswer.trim().toLowerCase();
  const normalizedUser = userAnswer.trim().toLowerCase();

  let isCorrect = false;
  let confidence = 0.8;

  if (normalizedCorrect === normalizedUser) {
    isCorrect = true;
    confidence = 1.0;
  } else if (normalizedCorrect.includes(normalizedUser) || normalizedUser.includes(normalizedCorrect)) {
    const overlap = Math.min(normalizedCorrect.length, normalizedUser.length) /
                    Math.max(normalizedCorrect.length, normalizedUser.length);
    if (overlap > 0.5) {
      isCorrect = true;
      confidence = 0.7 * overlap;
    }
  } else {
    const correctWords = new Set(normalizedCorrect.split(/\s+/).filter(w => w.length > 2));
    const userWords = new Set(normalizedUser.split(/\s+/).filter(w => w.length > 2));
    const intersection = [...correctWords].filter(w => userWords.has(w));
    const overlap = intersection.length / Math.max(correctWords.size, userWords.size, 1);
    
    if (overlap > 0.6) {
      isCorrect = true;
      confidence = 0.6 * overlap;
    }
  }

  const scoreResult = await updateFlashcardScore(flashcardId, isCorrect, confidence);

  return successResponse({
    isCorrect,
    confidence,
    scoreChange: scoreResult.scoreDelta,
    newScore: scoreResult.newScore,
    correctAnswer: actualCorrectAnswer,
  }, 'Answer scored');
});
