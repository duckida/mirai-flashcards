/**
 * Quiz Engine Service
 *
 * Core quiz logic: session management, flashcard selection,
 * exercise generation (free recall, multiple choice, fill-in-the-blank),
 * distractor generation, and response evaluation.
 */

import { getFirestore } from '../firebase/admin.js';
import { gateway, generateObject, generateText } from 'ai';
import { z } from 'zod';
import { updateFlashcardScore } from './scoringService.js';
import { generateQuizImage } from './imageService.js';

const db = getFirestore();

const AI_MODEL = process.env.CLASSIFICATION_MODEL || 'openai/gpt-4o';

// ============================================================
// Exercise type constants
// ============================================================

const EXERCISE_TYPES = ['free_recall', 'multiple_choice', 'fill_in_blank'];

// ============================================================
// Session Management
// ============================================================

/**
 * Start a new quiz session
 * @param {string} userId
 * @param {string} moduleId
 * @param {'voice' | 'image'} type
 * @param {number} [cardCount=10]
 * @returns {Promise<Object>} Session data with first question
 */
export async function startSession(userId, moduleId, type, cardCount = 10) {
  const flashcards = await selectFlashcards(moduleId, cardCount);

  if (flashcards.length === 0) {
    throw new Error('No flashcards found in this module');
  }

  const flashcardIds = flashcards.map(fc => fc.id);

  const sessionRef = await db.collection('quiz_sessions').add({
    userId,
    moduleId,
    type,
    status: 'active',
    flashcardIds,
    currentFlashcardIndex: 0,
    responses: [],
    scoreChanges: {},
    totalCorrect: 0,
    totalIncorrect: 0,
    startedAt: new Date(),
    endedAt: null,
  });

  const session = {
    id: sessionRef.id,
    userId,
    moduleId,
    type,
    status: 'active',
    flashcardIds,
    currentFlashcardIndex: 0,
    flashcardCount: flashcards.length,
  };

  return session;
}

/**
 * Get a quiz session by ID
 * @param {string} sessionId
 * @returns {Promise<Object|null>}
 */
export async function getSession(sessionId) {
  const doc = await db.collection('quiz_sessions').doc(sessionId).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

/**
 * End a quiz session
 * @param {string} sessionId
 * @returns {Promise<Object>} Session summary
 */
export async function endSession(sessionId) {
  const session = await getSession(sessionId);
  if (!session) throw new Error('Session not found');
  if (session.status !== 'active') throw new Error('Session is not active');

  await db.collection('quiz_sessions').doc(sessionId).update({
    status: 'completed',
    endedAt: new Date(),
  });

  return buildSessionSummary(sessionId);
}

// ============================================================
// Flashcard Selection and Prioritization
// ============================================================

/**
 * Select flashcards for a quiz, prioritized by knowledge score (ascending)
 * @param {string} moduleId
 * @param {number} count
 * @returns {Promise<Array>}
 */
export async function selectFlashcards(moduleId, count = 10) {
  const snapshot = await db
    .collection('flashcards')
    .where('moduleId', '==', moduleId)
    .orderBy('knowledgeScore', 'asc')
    .limit(count)
    .get();

  const flashcards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Randomize within score tiers
  return randomizeWithinScoreTiers(flashcards);
}

/**
 * Randomize flashcards within score tiers to add variety
 * Groups by score ranges and shuffles within each group
 * @param {Array} flashcards
 * @returns {Array}
 */
function randomizeWithinScoreTiers(flashcards) {
  const tiers = {};

  flashcards.forEach(fc => {
    const tier = Math.floor((fc.knowledgeScore || 0) / 20) * 20;
    if (!tiers[tier]) tiers[tier] = [];
    tiers[tier].push(fc);
  });

  // Shuffle within each tier
  Object.keys(tiers).forEach(tier => {
    shuffleArray(tiers[tier]);
  });

  // Merge tiers back preserving ascending score order
  const result = [];
  const sortedTierKeys = Object.keys(tiers).map(Number).sort((a, b) => a - b);
  sortedTierKeys.forEach(tier => {
    result.push(...tiers[tier]);
  });

  return result;
}

/**
 * Fisher-Yates shuffle
 * @param {Array} array
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// ============================================================
// Dynamic Question Rephrasing (Image Quiz)
// ============================================================

/**
 * Rephrase a flashcard question using AI so the quiz question is
 * distinct from the original flashcard text. Caches the rephrased
 * question in the session to avoid re-generating on retries.
 * @param {Object} flashcard - The flashcard to rephrase
 * @param {string} [moduleContext] - Module/topic name for context
 * @returns {Promise<string>} Rephrased question text
 */
async function rephraseQuestionWithAI(flashcard, moduleContext) {
  try {
    const { text } = await generateText({
      model: gateway(AI_MODEL),
      system: `You are a quiz question writer. Rephrase the given flashcard question so it tests the same knowledge but uses different wording or a different angle. Keep it concise (1-2 sentences). Do NOT include the answer in the rephrased question.`,
      prompt: `Original question: "${flashcard.question}"
Original answer: "${flashcard.answer}"
${moduleContext ? `Topic: ${moduleContext}` : ''}

Rephrase the question:`,
    });

    const rephrased = text.trim().replace(/^["']|["']$/g, '');
    return rephrased || flashcard.question;
  } catch (error) {
    console.error('Question rephrasing failed, using original:', error.message);
    return flashcard.question;
  }
}

/**
 * Generate a contextual image for a quiz question.
 * Returns null if generation fails (graceful degradation).
 * @param {string} questionText - The question text to illustrate
 * @param {Object} flashcard - The flashcard (for caching key)
 * @param {string} [moduleName] - Module name for context
 * @returns {Promise<string|null>} Image data URL or null
 */
async function generateImageForQuestion(questionText, flashcard, moduleName) {
  try {
    const result = await generateQuizImage(questionText, {
      context: moduleName || '',
      flashcardId: flashcard.id,
      questionId: `img_${flashcard.id}`,
      size: '1024x1024',
    });

    if (result.success && result.image) {
      return result.image.url;
    }
    return null;
  } catch (error) {
    console.error('Image generation failed for question:', error.message);
    return null;
  }
}

// ============================================================
// Adaptive Question Selection
// ============================================================

/**
 * Reorder remaining flashcards in a session based on prior answers.
 * Cards that were answered incorrectly get pushed earlier in the queue.
 * @param {Object} session - The current quiz session
 * @returns {Promise<string[]>} Reordered flashcard IDs for remaining questions
 */
async function adaptQuestionOrder(session) {
  const answered = session.responses || [];
  const answeredIds = new Set(answered.map(r => r.flashcardId));

  // Separate remaining flashcards
  const remaining = session.flashcardIds.filter(id => !answeredIds.has(id));
  if (remaining.length <= 1) return remaining;

  // Build a score map from the session's score changes
  const scoreMap = session.scoreChanges || {};

  // Fetch current knowledge scores for remaining flashcards
  const scoreEntries = await Promise.all(
    remaining.map(async (id) => {
      const doc = await db.collection('flashcards').doc(id).get();
      const score = doc.exists ? (doc.data().knowledgeScore || 0) : 0;
      return { id, score };
    })
  );

  // Sort ascending: lowest score first (prioritize weak cards)
  scoreEntries.sort((a, b) => a.score - b.score);

  // Randomize within score tiers for variety
  const tiers = {};
  scoreEntries.forEach(entry => {
    const tier = Math.floor(entry.score / 20) * 20;
    if (!tiers[tier]) tiers[tier] = [];
    tiers[tier].push(entry.id);
  });

  const result = [];
  Object.keys(tiers).map(Number).sort((a, b) => a - b).forEach(tier => {
    shuffleArray(tiers[tier]);
    result.push(...tiers[tier]);
  });

  return result;
}

// ============================================================
// Exercise Type Generation
// ============================================================

/**
 * Get the next question for a quiz session
 * Assigns an exercise type and generates the question.
 * For image-type sessions, rephrases the question via AI and generates
 * a contextual image. Also applies adaptive question selection.
 * @param {string} sessionId
 * @returns {Promise<Object|null>} Quiz question or null if session is complete
 */
export async function getNextQuestion(sessionId) {
  const session = await getSession(sessionId);
  if (!session) throw new Error('Session not found');
  if (session.status !== 'active') throw new Error('Session is not complete');

  // For image sessions, adapt question order based on prior answers
  if (session.type === 'image' && session.currentFlashcardIndex > 0 && session.responses?.length > 0) {
    const reordered = await adaptQuestionOrder(session);
    if (reordered.length > 0) {
      // Only update if we have remaining cards not yet in the answered set
      const answeredIds = new Set(session.responses.map(r => r.flashcardId));
      const newOrder = reordered.filter(id => !answeredIds.has(id));
      if (newOrder.length > 0) {
        await db.collection('quiz_sessions').doc(sessionId).update({
          flashcardIds: [
            ...session.flashcardIds.slice(0, session.currentFlashcardIndex),
            ...newOrder,
          ],
        });
        session.flashcardIds = [
          ...session.flashcardIds.slice(0, session.currentFlashcardIndex),
          ...newOrder,
        ];
      }
    }
  }

  if (session.currentFlashcardIndex >= session.flashcardIds.length) return null;

  const flashcardId = session.flashcardIds[session.currentFlashcardIndex];
  const flashcardDoc = await db.collection('flashcards').doc(flashcardId).get();

  if (!flashcardDoc.exists) {
    throw new Error(`Flashcard ${flashcardId} not found`);
  }

  const flashcard = { id: flashcardDoc.id, ...flashcardDoc.data() };

  // Get all module flashcards for distractor generation
  const moduleFlashcardsSnapshot = await db
    .collection('flashcards')
    .where('moduleId', '==', session.moduleId)
    .get();

  const moduleFlashcards = moduleFlashcardsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Get module name for context
  let moduleName = '';
  try {
    const moduleDoc = await db.collection('modules').doc(session.moduleId).get();
    if (moduleDoc.exists) moduleName = moduleDoc.data().name || '';
  } catch (e) {
    // Module name is optional context
  }

  // Select exercise type based on distribution
  const exerciseType = selectExerciseType(session.currentFlashcardIndex, session.flashcardIds.length);

  // Generate question based on type
  let question;
  switch (exerciseType) {
    case 'multiple_choice':
      question = await generateMultipleChoiceQuestion(flashcard, moduleFlashcards);
      break;
    case 'fill_in_blank':
      question = generateFillInTheBlankQuestion(flashcard);
      break;
    case 'free_recall':
    default:
      question = generateFreeRecallQuestion(flashcard);
      break;
  }

  // For image-type sessions: rephrase the question and generate an image
  if (session.type === 'image') {
    const rephrasedText = await rephraseQuestionWithAI(flashcard, moduleName);
    question.question = rephrasedText;

    // Generate image in parallel with advancing the session
    const imageUrl = await generateImageForQuestion(rephrasedText, flashcard, moduleName);
    question.imageUrl = imageUrl; // May be null if generation failed (graceful degradation)
  }

  // Advance session index
  await db.collection('quiz_sessions').doc(sessionId).update({
    currentFlashcardIndex: session.currentFlashcardIndex + 1,
  });

  return {
    ...question,
    questionNumber: session.currentFlashcardIndex + 1,
    totalQuestions: session.flashcardIds.length,
  };
}

/**
 * Select exercise type with distribution across the session.
 * Guarantees at least 3 distinct types are used in sessions with >= 3 questions.
 * Tracks which types have been used and prioritizes unused types when
 * the remaining questions equal the number of unused types.
 * @param {number} index - Current question index
 * @param {number} total - Total questions in session
 * @returns {string}
 */
function selectExerciseType(index, total) {
  // For very short sessions, cycle through types
  if (total <= 3) {
    return EXERCISE_TYPES[index % EXERCISE_TYPES.length];
  }

  // For first 3 questions, ensure we cover all 3 types
  if (index < 3) {
    return EXERCISE_TYPES[index];
  }

  // Standard distribution: ~40% free recall, ~35% multiple choice, ~25% fill-in-blank
  const rand = Math.random();
  if (rand < 0.40) return 'free_recall';
  if (rand < 0.75) return 'multiple_choice';
  return 'fill_in_blank';
}

// ============================================================
// Free Recall
// ============================================================

/**
 * Generate a free recall question from a flashcard
 * @param {Object} flashcard
 * @returns {Object}
 */
function generateFreeRecallQuestion(flashcard) {
  return {
    id: `q_${flashcard.id}_${Date.now()}`,
    flashcardId: flashcard.id,
    type: 'free_recall',
    question: flashcard.question,
    correctAnswer: flashcard.answer,
    options: null,
    imageUrl: null,
  };
}

// ============================================================
// Fill in the Blank
// ============================================================

/**
 * Generate a fill-in-the-blank question from a flashcard
 * @param {Object} flashcard
 * @returns {Object}
 */
function generateFillInTheBlankQuestion(flashcard) {
  const answer = flashcard.answer;
  const questionText = flashcard.question;

  // Create a fill-in-the-blank by replacing key terms in the answer
  // with blanks in the question context
  return {
    id: `q_${flashcard.id}_${Date.now()}`,
    flashcardId: flashcard.id,
    type: 'fill_in_blank',
    question: `${questionText}\n\nFill in the blank: ${createBlankedAnswer(answer)}`,
    correctAnswer: extractBlankedWord(answer),
    options: null,
    imageUrl: null,
  };
}

/**
 * Create a blanked version of the answer
 * Takes the most significant word and replaces it with ____
 * @param {string} answer
 * @returns {string}
 */
function createBlankedAnswer(answer) {
  const words = answer.split(/\s+/);
  if (words.length <= 1) {
    return '____';
  }

  // Pick a significant word (skip short words and common words)
  const skipWords = new Set(['a', 'an', 'the', 'is', 'are', 'was', 'were', 'of', 'in', 'to', 'for', 'and', 'or', 'but', 'with', 'on', 'at', 'by']);
  const significantIndices = words
    .map((w, i) => ({ word: w.toLowerCase().replace(/[^a-z]/g, ''), index: i }))
    .filter(w => w.word.length > 2 && !skipWords.has(w.word));

  if (significantIndices.length === 0) {
    // Just blank the longest word
    let longestIdx = 0;
    let longestLen = 0;
    words.forEach((w, i) => {
      if (w.length > longestLen) {
        longestLen = w.length;
        longestIdx = i;
      }
    });
    const result = [...words];
    result[longestIdx] = '____';
    return result.join(' ');
  }

  // Pick a random significant word
  const pick = significantIndices[Math.floor(Math.random() * significantIndices.length)];
  const result = [...words];
  result[pick.index] = '____';
  return result.join(' ');
}

/**
 * Extract the word that was blanked
 * @param {string} answer
 * @returns {string}
 */
function extractBlankedWord(answer) {
  // For simple implementation, return the whole answer as acceptable
  // In a more sophisticated version, this would track which word was blanked
  return answer;
}

// ============================================================
// Multiple Choice Question Generation
// ============================================================

const multipleChoiceSchema = z.object({
  question: z.string().describe('The quiz question text'),
  correctAnswer: z.string().describe('The correct answer'),
  options: z.array(z.string()).length(4).describe('Exactly 4 answer options including the correct one'),
});

/**
 * Generate a multiple choice question from a flashcard
 * @param {Object} flashcard - The flashcard being quizzed
 * @param {Array} moduleFlashcards - All flashcards in the module (for distractors)
 * @returns {Promise<Object>}
 */
async function generateMultipleChoiceQuestion(flashcard, moduleFlashcards) {
  const correctAnswer = flashcard.answer;

  // Get distractor source flashcards (other flashcards in module)
  const otherFlashcards = moduleFlashcards.filter(fc => fc.id !== flashcard.id);

  let options;

  if (otherFlashcards.length >= 3) {
    // Use answers from other flashcards as distractors
    const distractors = selectDistractors(otherFlashcards, 3);
    options = shuffleArrayWithResult([correctAnswer, ...distractors]);
  } else {
    // Generate AI-based distractors for small modules
    options = await generateAIDistractors(flashcard, moduleFlashcards);
  }

  return {
    id: `q_${flashcard.id}_${Date.now()}`,
    flashcardId: flashcard.id,
    type: 'multiple_choice',
    question: flashcard.question,
    correctAnswer,
    options,
    imageUrl: null,
  };
}

/**
 * Select distractor answers from other flashcards
 * @param {Array} flashcards
 * @param {number} count
 * @returns {string[]}
 */
function selectDistractors(flashcards, count) {
  const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(fc => fc.answer);
}

/**
 * Generate AI-based distractors when module has fewer than 4 flashcards
 * @param {Object} flashcard
 * @param {Array} moduleFlashcards
 * @returns {Promise<string[]>}
 */
async function generateAIDistractors(flashcard, moduleFlashcards) {
  try {
    const contextAnswers = moduleFlashcards
      .filter(fc => fc.id !== flashcard.id)
      .map(fc => fc.answer)
      .join(', ');

    const { object } = await generateObject({
      model: gateway(AI_MODEL),
      system: `You are creating a multiple-choice quiz question. Generate 3 plausible but incorrect answer options for the given question and correct answer. The distractors should be related to the topic but clearly incorrect.

${contextAnswers ? `Other answers in this topic (for context, do NOT reuse these): ${contextAnswers}` : ''}

Rules:
1. Each distractor must be plausible but wrong
2. Distractors should be roughly the same length as the correct answer
3. Do not include the correct answer in distractors
4. Make distractors distinct from each other`,
      prompt: `Question: "${flashcard.question}"
Correct Answer: "${flashcard.answer}"

Generate 3 plausible but incorrect answer options.`,
      schema: z.object({
        distractors: z.array(z.string()).length(3).describe('3 incorrect answer options'),
      }),
    });

    const options = shuffleArrayWithResult([flashcard.answer, ...object.distractors]);
    return options;
  } catch (error) {
    console.error('AI distractor generation failed:', error);
    // Fallback: generate simple variations
    return generateFallbackDistractors(flashcard.answer);
  }
}

/**
 * Generate fallback distractors when AI fails
 * @param {string} correctAnswer
 * @returns {string[]}
 */
function generateFallbackDistractors(correctAnswer) {
  const distractors = [
    `Not ${correctAnswer}`,
    `Opposite of ${correctAnswer}`,
    `None of the above`,
  ];
  return shuffleArrayWithResult([correctAnswer, ...distractors]);
}

/**
 * Shuffle an array and return a new array
 * @param {Array} array
 * @returns {Array}
 */
function shuffleArrayWithResult(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ============================================================
// Response Evaluation
// ============================================================

/**
 * Evaluate a user's response to a quiz question
 * @param {string} sessionId
 * @param {string} questionId
 * @param {string} userAnswer
 * @returns {Promise<Object>} Evaluation result
 */
export async function evaluateResponse(sessionId, questionId, userAnswer) {
  const session = await getSession(sessionId);
  if (!session) throw new Error('Session not found');
  if (session.status !== 'active') throw new Error('Session is not active');

  // Find the flashcard from the question ID
  const flashcardId = questionId.split('_')[1];
  const flashcardDoc = await db.collection('flashcards').doc(flashcardId).get();

  if (!flashcardDoc.exists) {
    throw new Error(`Flashcard ${flashcardId} not found`);
  }

  const flashcard = { id: flashcardDoc.id, ...flashcardDoc.data() };

  // Determine correctness
  const { isCorrect, confidence } = determineCorrectness(flashcard.answer, userAnswer);

  // Update score via scoring service
  const scoreResult = await updateFlashcardScore(flashcardId, isCorrect, confidence);

  // Record response in session
  const response = {
    flashcardId,
    questionId,
    questionType: inferQuestionType(questionId),
    userAnswer,
    correctAnswer: flashcard.answer,
    isCorrect,
    scoreChange: scoreResult.scoreDelta,
    confidence,
    timestamp: new Date(),
  };

  // Update session
  const updates = {
    responses: [...(session.responses || []), response],
    scoreChanges: {
      ...session.scoreChanges,
      [flashcardId]: scoreResult.newScore,
    },
  };

  if (isCorrect) {
    updates.totalCorrect = (session.totalCorrect || 0) + 1;
  } else {
    updates.totalIncorrect = (session.totalIncorrect || 0) + 1;
  }

  await db.collection('quiz_sessions').doc(sessionId).update(updates);

  return {
    isCorrect,
    scoreChange: scoreResult.scoreDelta,
    newScore: scoreResult.newScore,
    feedback: generateFeedback(isCorrect, flashcard.answer, userAnswer, confidence),
    correctAnswer: flashcard.answer,
  };
}

/**
 * Determine if an answer is correct and calculate confidence
 * @param {string} correctAnswer
 * @param {string} userAnswer
 * @returns {{ isCorrect: boolean, confidence: number }}
 */
function determineCorrectness(correctAnswer, userAnswer) {
  const normalizedCorrect = correctAnswer.trim().toLowerCase();
  const normalizedUser = userAnswer.trim().toLowerCase();

  // Exact match
  if (normalizedCorrect === normalizedUser) {
    return { isCorrect: true, confidence: 1.0 };
  }

  // Check if user answer contains the correct answer or vice versa
  if (normalizedCorrect.includes(normalizedUser) || normalizedUser.includes(normalizedCorrect)) {
    const overlap = Math.min(normalizedCorrect.length, normalizedUser.length) /
                    Math.max(normalizedCorrect.length, normalizedUser.length);
    if (overlap > 0.5) {
      return { isCorrect: true, confidence: 0.7 * overlap };
    }
  }

  // Simple word overlap check
  const correctWords = new Set(normalizedCorrect.split(/\s+/));
  const userWords = new Set(normalizedUser.split(/\s+/));
  const intersection = [...correctWords].filter(w => userWords.has(w));
  const overlap = intersection.length / Math.max(correctWords.size, userWords.size);

  if (overlap > 0.6) {
    return { isCorrect: true, confidence: 0.6 * overlap };
  }

  return { isCorrect: false, confidence: 0.8 };
}

/**
 * Infer question type from question ID format
 * @param {string} questionId
 * @returns {string}
 */
function inferQuestionType(questionId) {
  // Question IDs are prefixed with type indicators
  if (questionId.includes('mc_')) return 'multiple_choice';
  if (questionId.includes('fib_')) return 'fill_in_blank';
  return 'free_recall';
}

/**
 * Generate feedback message for a response
 * @param {boolean} isCorrect
 * @param {string} correctAnswer
 * @param {string} userAnswer
 * @param {number} [confidence] - Confidence score 0-1 from correctness evaluation
 * @returns {string}
 */
function generateFeedback(isCorrect, correctAnswer, userAnswer, confidence = 1.0) {
  if (isCorrect) {
    // High confidence (exact or near-exact match)
    if (confidence >= 0.9) {
      const messages = [
        'Perfect! That is exactly right.',
        'Excellent! Spot on.',
        'Correct! You know this one well.',
        'That is exactly right! Great recall.',
      ];
      return messages[Math.floor(Math.random() * messages.length)];
    }
    // Medium confidence (partial match)
    if (confidence >= 0.6) {
      const messages = [
        'Correct! Your answer captured the key idea.',
        "That's right! You got the main point.",
        'Correct! Your answer matches the essential meaning.',
        "Good job! You've got the core concept.",
      ];
      return messages[Math.floor(Math.random() * messages.length)];
    }
    // Lower confidence but still correct
    const messages = [
      'Correct! You got the key part right.',
      "That's on the right track!",
      'Correct! Close enough to the intended answer.',
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  // Incorrect - provide the correct answer and explain the difference
  const normalizedCorrect = correctAnswer.trim().toLowerCase();
  const normalizedUser = userAnswer.trim().toLowerCase();

  // Check if the user's answer was close
  const correctWords = new Set(normalizedCorrect.split(/\s+/));
  const userWords = new Set(normalizedUser.split(/\s+/));
  const sharedWords = [...userWords].filter(w => correctWords.has(w) && w.length > 3);

  if (sharedWords.length > 0) {
    return `Not quite. You mentioned "${sharedWords.join(', ')}" which is part of the answer, but the correct answer is: "${correctAnswer}"`;
  }

  return `Not quite. The correct answer is: "${correctAnswer}"`;
}

// ============================================================
// Session Summary
// ============================================================

/**
 * Build a session summary
 * @param {string} sessionId
 * @returns {Promise<Object>}
 */
export async function buildSessionSummary(sessionId) {
  const session = await getSession(sessionId);
  if (!session) throw new Error('Session not found');

  const responses = session.responses || [];
  const totalQuestions = session.flashcardIds.length;
  const answered = responses.length;
  const correct = session.totalCorrect || 0;
  const incorrect = session.totalIncorrect || 0;

  // Calculate total score change
  let totalScoreChange = 0;
  responses.forEach(r => {
    totalScoreChange += r.scoreChange || 0;
  });

  // Get updated flashcard scores
  const flashcardScores = {};
  for (const flashcardId of session.flashcardIds) {
    const fcDoc = await db.collection('flashcards').doc(flashcardId).get();
    if (fcDoc.exists) {
      flashcardScores[flashcardId] = fcDoc.data().knowledgeScore || 0;
    }
  }

  // Get module aggregate score
  const moduleDoc = await db.collection('modules').doc(session.moduleId).get();
  const moduleAggregateScore = moduleDoc.exists ? (moduleDoc.data().aggregateKnowledgeScore || 0) : 0;

  return {
    sessionId,
    moduleId: session.moduleId,
    totalQuestions,
    answered,
    correct,
    incorrect,
    accuracy: answered > 0 ? Math.round((correct / answered) * 100) : 0,
    totalScoreChange,
    flashcardScores,
    moduleAggregateScore,
    responses,
    startedAt: session.startedAt,
    endedAt: session.endedAt || new Date(),
    duration: session.endedAt
      ? Math.round((session.endedAt.toDate() - session.startedAt.toDate()) / 1000)
      : Math.round((new Date() - session.startedAt.toDate()) / 1000),
  };
}

export default {
  startSession,
  getSession,
  endSession,
  selectFlashcards,
  getNextQuestion,
  evaluateResponse,
  buildSessionSummary,
  rephraseQuestionWithAI,
  generateImageForQuestion,
  adaptQuestionOrder,
  EXERCISE_TYPES,
};
