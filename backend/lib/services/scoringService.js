/**
 * Scoring Service
 *
 * Centralized knowledge score calculation and management.
 * Handles confidence-based score adjustments, bounds enforcement,
 * module aggregate scoring, and score history tracking.
 */

import admin from 'firebase-admin';
import { getFirestore } from '../firebase/admin.js';

const MIN_SCORE = 0;
const MAX_SCORE = 100;
const MIN_DELTA = 1;
const MAX_DELTA = 10;

/**
 * Calculate score delta based on confidence level
 *
 * Confidence is a 0-1 value representing how confident the evaluation is
 * in the correctness of the answer. Higher confidence = larger score change.
 *
 * @param {number} confidence - Confidence value between 0 and 1
 * @param {boolean} isCorrect - Whether the answer was correct
 * @returns {number} Score delta (positive for correct, negative for incorrect)
 */
export function calculateScoreDelta(confidence, isCorrect) {
  const clampedConfidence = Math.min(1, Math.max(0, confidence));
  // Map confidence 0-1 to delta 1-10
  const delta = Math.round(MIN_DELTA + clampedConfidence * (MAX_DELTA - MIN_DELTA));
  return isCorrect ? delta : -delta;
}

/**
 * Apply score delta to a current score, enforcing bounds
 *
 * @param {number} currentScore - Current knowledge score (0-100)
 * @param {number} delta - Score change (can be positive or negative)
 * @returns {{ newScore: number, appliedDelta: number }} Updated score and actual delta applied
 */
export function applyScoreDelta(currentScore, delta) {
  const raw = currentScore + delta;
  const newScore = Math.min(MAX_SCORE, Math.max(MIN_SCORE, raw));
  const appliedDelta = newScore - currentScore;
  return { newScore, appliedDelta };
}

/**
 * Calculate module aggregate knowledge score
 *
 * @param {Array<{ knowledgeScore: number }>} flashcards - Flashcards in the module
 * @returns {number} Mean knowledge score rounded to nearest integer
 */
export function calculateModuleAggregate(flashcards) {
  if (!flashcards || flashcards.length === 0) return 0;
  const total = flashcards.reduce((sum, fc) => sum + (fc.knowledgeScore || 0), 0);
  return Math.round(total / flashcards.length);
}

/**
 * Get the score category for display purposes
 *
 * @param {number} score - Knowledge score (0-100)
 * @returns {'strong' | 'moderate' | 'weak'}
 */
export function getScoreCategory(score) {
  if (score >= 70) return 'strong';
  if (score >= 40) return 'moderate';
  return 'weak';
}

/**
 * Update a flashcard's knowledge score and persist to Firestore
 *
 * @param {string} flashcardId - Flashcard ID
 * @param {boolean} isCorrect - Whether the answer was correct
 * @param {number} confidence - Confidence value 0-1
 * @returns {Promise<{ newScore: number, scoreDelta: number, reviewCount: number, correctCount: number, incorrectCount: number }>}
 */
export async function updateFlashcardScore(flashcardId, isCorrect, confidence = 0.5) {
  const db = getFirestore();
  const flashcardDoc = await db.collection('flashcards').doc(flashcardId).get();

  if (!flashcardDoc.exists) {
    throw new Error(`Flashcard ${flashcardId} not found`);
  }

  const flashcard = flashcardDoc.data();
  const delta = calculateScoreDelta(confidence, isCorrect);
  const { newScore, appliedDelta } = applyScoreDelta(flashcard.knowledgeScore || 0, delta);

  const updates = {
    knowledgeScore: newScore,
    reviewCount: (flashcard.reviewCount || 0) + 1,
    lastReviewedAt: new Date(),
    updatedAt: new Date(),
  };

  if (isCorrect) {
    updates.correctCount = (flashcard.correctCount || 0) + 1;
  } else {
    updates.incorrectCount = (flashcard.incorrectCount || 0) + 1;
  }

  // Store score history entry
  const historyEntry = {
    timestamp: new Date(),
    previousScore: flashcard.knowledgeScore || 0,
    newScore,
    delta: appliedDelta,
    isCorrect,
    confidence,
  };

  // Use batch to atomically update flashcard and add history
  const batch = db.batch();
  batch.update(db.collection('flashcards').doc(flashcardId), updates);
  batch.set(
    db.collection('flashcards').doc(flashcardId).collection('scoreHistory').doc(),
    historyEntry
  );
  await batch.commit();

  // Update module aggregate score incrementally (1 read instead of N)
  if (flashcard.moduleId) {
    await incrementModuleAggregate(flashcard.moduleId, flashcard.knowledgeScore || 0, newScore);
  }

  return {
    newScore,
    scoreDelta: appliedDelta,
    reviewCount: updates.reviewCount,
    correctCount: updates.correctCount ?? flashcard.correctCount,
    incorrectCount: updates.incorrectCount ?? flashcard.incorrectCount,
  };
}

/**
 * Batch update multiple flashcard scores (for quiz session end)
 *
 * @param {Array<{ flashcardId: string, isCorrect: boolean, confidence: number }>} scoreUpdates
 * @returns {Promise<Array<{ flashcardId: string, newScore: number, scoreDelta: number }>>}
 */
export async function batchUpdateScores(scoreUpdates) {
  const db = getFirestore();
  const results = [];
  const moduleDeltas = {};

  for (const update of scoreUpdates) {
    const { flashcardId, isCorrect, confidence = 0.5 } = update;
    const flashcardDoc = await db.collection('flashcards').doc(flashcardId).get();

    if (!flashcardDoc.exists) {
      results.push({ flashcardId, error: 'Flashcard not found' });
      continue;
    }

    const flashcard = flashcardDoc.data();
    const delta = calculateScoreDelta(confidence, isCorrect);
    const { newScore, appliedDelta } = applyScoreDelta(flashcard.knowledgeScore || 0, delta);

    const updates = {
      knowledgeScore: newScore,
      reviewCount: (flashcard.reviewCount || 0) + 1,
      lastReviewedAt: new Date(),
      updatedAt: new Date(),
    };

    if (isCorrect) {
      updates.correctCount = (flashcard.correctCount || 0) + 1;
    } else {
      updates.incorrectCount = (flashcard.incorrectCount || 0) + 1;
    }

    const historyEntry = {
      timestamp: new Date(),
      previousScore: flashcard.knowledgeScore || 0,
      newScore,
      delta: appliedDelta,
      isCorrect,
      confidence,
    };

    const batch = db.batch();
    batch.update(db.collection('flashcards').doc(flashcardId), updates);
    batch.set(
      db.collection('flashcards').doc(flashcardId).collection('scoreHistory').doc(),
      historyEntry
    );
    await batch.commit();

    if (flashcard.moduleId) {
      moduleDeltas[flashcard.moduleId] = (moduleDeltas[flashcard.moduleId] || 0) + (newScore - (flashcard.knowledgeScore || 0));
    }

    results.push({ flashcardId, newScore, scoreDelta: appliedDelta });
  }

  // Incrementally update aggregates for all affected modules
  for (const [moduleId, totalDelta] of Object.entries(moduleDeltas)) {
    const moduleRef = db.collection('modules').doc(moduleId);
    const moduleDoc = await moduleRef.get();
    if (moduleDoc.exists) {
      const data = moduleDoc.data();
      if (data.totalKnowledgeScore !== undefined && data.flashcardCount > 0) {
        const newTotal = data.totalKnowledgeScore + totalDelta;
        const newAggregate = Math.round(newTotal / data.flashcardCount);
        await moduleRef.update({
          totalKnowledgeScore: newTotal,
          aggregateKnowledgeScore: newAggregate,
        });
      }
    }
  }

  return results;
}

/**
 * Recalculate and persist module aggregate knowledge score
 *
 * @param {string} moduleId - Module ID
 * @returns {Promise<{ aggregateScore: number, flashcardCount: number }>}
 */
export async function recalculateModuleAggregate(moduleId) {
  const db = getFirestore();

  const flashcardsSnapshot = await db
    .collection('flashcards')
    .where('moduleId', '==', moduleId)
    .select('knowledgeScore')
    .get();

  const scores = flashcardsSnapshot.docs.map((doc) => doc.data().knowledgeScore || 0);
  const totalScore = scores.reduce((sum, s) => sum + s, 0);
  const aggregateScore = scores.length > 0 ? Math.round(totalScore / scores.length) : 0;

  await db.collection('modules').doc(moduleId).update({
    aggregateKnowledgeScore: aggregateScore,
    flashcardCount: scores.length,
    totalKnowledgeScore: totalScore,
    updatedAt: new Date(),
  });

  return { aggregateScore, flashcardCount: scores.length };
}

/**
 * Get score history for a flashcard
 *
 * @param {string} flashcardId - Flashcard ID
 * @param {number} limit - Max history entries to return
 * @returns {Promise<Array>} Score history entries
 */
export async function incrementModuleAggregate(moduleId, oldScore, newScore) {
  const db = getFirestore();
  const moduleRef = db.collection('modules').doc(moduleId);
  const moduleDoc = await moduleRef.get();

  if (!moduleDoc.exists) return;

  const data = moduleDoc.data();
  const count = data.flashcardCount || 0;
  if (count === 0) return;

  if (data.totalKnowledgeScore !== undefined) {
    const newTotal = data.totalKnowledgeScore - oldScore + newScore;
    const newAggregate = Math.round(newTotal / count);
    await moduleRef.update({
      totalKnowledgeScore: newTotal,
      aggregateKnowledgeScore: newAggregate,
    });
  } else {
    await recalculateModuleAggregate(moduleId);
  }
}

export async function getScoreHistory(flashcardId, limit = 50) {
  const db = getFirestore();
  const snapshot = await db
    .collection('flashcards')
    .doc(flashcardId)
    .collection('scoreHistory')
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Get scoring statistics for a flashcard
 *
 * @param {string} flashcardId - Flashcard ID
 * @returns {Promise<Object>} Scoring stats
 */
export async function getFlashcardStats(flashcardId) {
  const db = getFirestore();
  const flashcardDoc = await db.collection('flashcards').doc(flashcardId).get();

  if (!flashcardDoc.exists) {
    throw new Error(`Flashcard ${flashcardId} not found`);
  }

  const data = flashcardDoc.data();
  const totalReviews = data.reviewCount || 0;
  const correctCount = data.correctCount || 0;
  const incorrectCount = data.incorrectCount || 0;
  const accuracy = totalReviews > 0 ? Math.round((correctCount / totalReviews) * 100) : 0;

  return {
    flashcardId,
    knowledgeScore: data.knowledgeScore || 0,
    scoreCategory: getScoreCategory(data.knowledgeScore || 0),
    reviewCount: totalReviews,
    correctCount,
    incorrectCount,
    accuracy,
    lastReviewedAt: data.lastReviewedAt || null,
  };
}

export default {
  calculateScoreDelta,
  applyScoreDelta,
  calculateModuleAggregate,
  getScoreCategory,
  updateFlashcardScore,
  batchUpdateScores,
  recalculateModuleAggregate,
  getScoreHistory,
  getFlashcardStats,
};
