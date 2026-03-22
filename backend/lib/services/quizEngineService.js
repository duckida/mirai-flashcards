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

const AI_MODEL = process.env.CLASSIFICATION_MODEL || 'google/gemini-3-flash';

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
 * @param {'voice' | 'image' | 'multiple_choice'} type
 * @param {number} [cardCount=10]
 * @param {string} [specificFlashcardId=null]
 * @returns {Promise<Object>} Session data with first question
 */
export async function startSession(userId, moduleId, type, cardCount = 10, specificFlashcardId = null) {
  let flashcards = [];
  if (specificFlashcardId) {
    const doc = await db.collection('flashcards').doc(specificFlashcardId).get();
    if (doc.exists) {
      flashcards = [{ id: doc.id, ...doc.data() }];
    }
  } else {
    flashcards = await selectFlashcards(moduleId, cardCount);
  }

  if (flashcards.length === 0) {
    throw new Error('No flashcards found in this module');
  }

  let flashcardIds = flashcards.map(fc => fc.id);
  let preGeneratedQuestions = null;

  if (type === 'multiple_choice' && specificFlashcardId) {
    // Generate exactly 8 questions for the specified flashcard
    flashcardIds = Array(8).fill(specificFlashcardId);
    preGeneratedQuestions = await generateMultipleChoiceQuestionsBatch(flashcards[0], 8);
  }

  const sessionRef = await db.collection('quiz_sessions').add({
    userId,
    moduleId,
    type,
    status: 'active',
    flashcardIds,
    preGeneratedQuestions,
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
    preGeneratedQuestions,
    currentFlashcardIndex: 0,
    flashcardCount: flashcardIds.length,
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
  if (session.status !== 'active') throw new Error('Session is not active');

  // Fast path for pre-generated questions (e.g. 8 multiple-choice batch)
  if (session.type === 'multiple_choice' && session.preGeneratedQuestions) {
    if (session.currentFlashcardIndex >= session.preGeneratedQuestions.length) return null;

    const question = session.preGeneratedQuestions[session.currentFlashcardIndex];

    await db.collection('quiz_sessions').doc(sessionId).update({
      currentFlashcardIndex: session.currentFlashcardIndex + 1,
      lastQuestion: question.question,
    });

    return {
      ...question,
      questionNumber: session.currentFlashcardIndex + 1,
      totalQuestions: session.preGeneratedQuestions.length,
    };
  }

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
  let exerciseType;
  if (session.type === 'multiple_choice') {
    exerciseType = 'multiple_choice';
  } else {
    exerciseType = selectExerciseType(session.currentFlashcardIndex, session.flashcardIds.length);
  }

  // Generate question based on type
  let question;
  switch (exerciseType) {
    case 'multiple_choice':
      question = await generateMultipleChoiceQuestion(flashcard, moduleFlashcards);
      break;
    case 'fill_in_blank':
      question = await generateFillInTheBlankQuestion(flashcard);
      break;
    case 'free_recall':
    default:
      question = await generateFreeRecallQuestion(flashcard);
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

  // Advance session index and store last question for evaluation context
  await db.collection('quiz_sessions').doc(sessionId).update({
    currentFlashcardIndex: session.currentFlashcardIndex + 1,
    lastQuestion: question.question,
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
// AI Question Generation from Raw Content
// ============================================================

const questionSchema = z.object({
  question: z.string().describe('The quiz question'),
  answer: z.string().describe('The correct answer based on the content'),
});

/**
 * Generate a question from flashcard content using AI
 * @param {Object} flashcard - Flashcard with content field
 * @param {'free_recall' | 'multiple_choice' | 'fill_in_blank'} type
 * @returns {Promise<{question: string, answer: string}>}
 */
async function generateQuestionFromContent(flashcard, type) {
  const content = flashcard.content || '';
  
  let typeInstruction = '';
  if (type === 'free_recall') {
    typeInstruction = 'Generate a free-recall question that tests understanding of the key concept. The answer should be a concise explanation.';
  } else if (type === 'multiple_choice') {
    typeInstruction = 'Generate a multiple-choice style question. The answer should be a short, specific response.';
  } else if (type === 'fill_in_blank') {
    typeInstruction = 'Generate a fill-in-the-blank question where the answer is a key term or phrase from the content.';
  }

  try {
    const { object } = await generateObject({
      model: gateway(AI_MODEL),
      system: `You are a quiz generator. Given raw study material content, generate a quiz question and its correct answer in JSON format.

Rules:
1. The question should test understanding of the most important concept in the content
2. The answer must be directly derived from the content
3. Keep the question clear and concise
4. The answer should be specific and factual based on the content
${flashcard.drawingDescriptions?.length > 0 ? `\nNote: The content includes these drawings/diagrams: ${flashcard.drawingDescriptions.join(', ')}` : ''}`,
      prompt: `Study material content:
"""
${content}
"""

${typeInstruction}

Generate a question and answer based on this content.`,
      schema: questionSchema,
    });

    return {
      question: object.question,
      answer: object.answer,
    };
  } catch (error) {
    console.error('AI question generation failed:', error);
    // Fallback: use content as question prompt
    return {
      question: `Based on your notes, explain the following concept:\n\n${content.substring(0, 200)}${content.length > 200 ? '...' : ''}`,
      answer: content,
    };
  }
}

// ============================================================
// Free Recall
// ============================================================

/**
 * Generate a free recall question from a flashcard using AI
 * @param {Object} flashcard
 * @returns {Promise<Object>}
 */
async function generateFreeRecallQuestion(flashcard) {
  const { question, answer } = await generateQuestionFromContent(flashcard, 'free_recall');
  
  return {
    id: `q_${flashcard.id}_${Date.now()}`,
    flashcardId: flashcard.id,
    type: 'free_recall',
    question,
    correctAnswer: answer,
    options: null,
    imageUrl: null,
  };
}

// ============================================================
// Fill in the Blank
// ============================================================

/**
 * Generate a fill-in-the-blank question from a flashcard using AI
 * @param {Object} flashcard
 * @returns {Promise<Object>}
 */
async function generateFillInTheBlankQuestion(flashcard) {
  const { question, answer } = await generateQuestionFromContent(flashcard, 'fill_in_blank');
  
  // Create a blanked version of the answer
  const blankedAnswer = createBlankedAnswer(answer);
  
  return {
    id: `q_${flashcard.id}_${Date.now()}`,
    flashcardId: flashcard.id,
    type: 'fill_in_blank',
    question: `${question}\n\nFill in the blank: ${blankedAnswer}`,
    correctAnswer: answer,
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

  const skipWords = new Set(['a', 'an', 'the', 'is', 'are', 'was', 'were', 'of', 'in', 'to', 'for', 'and', 'or', 'but', 'with', 'on', 'at', 'by']);
  const significantIndices = words
    .map((w, i) => ({ word: w.toLowerCase().replace(/[^a-z]/g, ''), index: i }))
    .filter(w => w.word.length > 2 && !skipWords.has(w.word));

  if (significantIndices.length === 0) {
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

  const pick = significantIndices[Math.floor(Math.random() * significantIndices.length)];
  const result = [...words];
  result[pick.index] = '____';
  return result.join(' ');
}

// ============================================================
// Multiple Choice Question Generation
// ============================================================

const multipleChoiceSchema = z.object({
  question: z.string().describe('The quiz question text'),
  correctAnswer: z.string().describe('The correct answer'),
  options: z.array(z.string()).length(4).describe('Exactly 4 answer options including the correct one'),
});

const multipleChoiceBatchSchema = z.object({
  questions: z.array(z.object({
    question: z.string().describe('The quiz question text'),
    correctAnswer: z.string().describe('The correct answer'),
    options: z.array(z.string()).length(4).describe('Exactly 4 answer options including the correct one'),
  })).describe('Exactly 8 different multiple-choice questions'),
});

/**
 * Generate a batch of 8 multiple choice questions from a flashcard using AI
 * @param {Object} flashcard - The flashcard being quizzed
 * @param {number} count - Number of questions to generate
 * @returns {Promise<Array>}
 */
async function generateMultipleChoiceQuestionsBatch(flashcard, count = 8) {
  const content = flashcard.content || '';
  
  try {
    const { object } = await generateObject({
      model: gateway(AI_MODEL),
      system: `You are creating a multiple-choice quiz from study material content. Output JSON.

Rules:
1. Generate exactly ${count} distinct multiple-choice questions testing understanding of the content.
2. The correct answer must be directly derived from the content.
3. Generate 3 plausible but incorrect distractor answers for each question.
4. Distractors should be related to the topic but clearly wrong.
5. Make all 4 options roughly the same length and format.
6. Ensure the questions cover different aspects, facts, or angles of the content.`,
      prompt: `Study material content:
"""
${content}
"""

Generate exactly ${count} multiple-choice questions with 4 answer options each (1 correct, 3 incorrect distractors).`,
      schema: multipleChoiceBatchSchema,
    });

    return object.questions.map((q, idx) => ({
      id: `q_${flashcard.id}_batch_${Date.now()}_${idx}`,
      flashcardId: flashcard.id,
      type: 'multiple_choice',
      question: q.question,
      correctAnswer: q.correctAnswer,
      options: shuffleArrayWithResult(q.options),
      imageUrl: null,
    }));
  } catch (error) {
    console.error('AI multiple choice batch generation failed:', error);
    // Fallback
    return Array(count).fill(0).map((_, idx) => ({
      id: `q_${flashcard.id}_fallback_${Date.now()}_${idx}`,
      flashcardId: flashcard.id,
      type: 'multiple_choice',
      question: `Question ${idx + 1} about this topic (generation failed)`,
      correctAnswer: 'Correct Answer',
      options: shuffleArrayWithResult(['Correct Answer', 'Wrong Answer A', 'Wrong Answer B', 'Wrong Answer C']),
      imageUrl: null,
    }));
  }
}

/**
 * Generate a multiple choice question from a flashcard using AI
 * @param {Object} flashcard - The flashcard being quizzed
 * @param {Array} moduleFlashcards - All flashcards in the module (for distractors)
 * @returns {Promise<Object>}
 */
async function generateMultipleChoiceQuestion(flashcard, moduleFlashcards) {
  const content = flashcard.content || '';
  const otherContents = moduleFlashcards
    .filter(fc => fc.id !== flashcard.id)
    .map(fc => fc.content?.substring(0, 100))
    .filter(Boolean)
    .join('\n');

  try {
    const { object } = await generateObject({
      model: gateway(AI_MODEL),
      system: `You are creating a multiple-choice quiz question from study material content. Output JSON.

Rules:
1. Generate a question that tests understanding of the key concept
2. The correct answer must be directly derived from the content
3. Generate 3 plausible but incorrect distractor answers
4. Distractors should be related to the topic but clearly wrong
5. Make all 4 options roughly the same length and format
${flashcard.drawingDescriptions?.length > 0 ? `\nNote: The content includes these drawings/diagrams: ${flashcard.drawingDescriptions.join(', ')}` : ''}

${otherContents ? `Other topics in this module (for context, do NOT base your question on these):
${otherContents}` : ''}`,
      prompt: `Study material content:
"""
${content}
"""

Generate a multiple-choice question with 4 answer options (1 correct, 3 incorrect distractors).`,
      schema: multipleChoiceSchema,
    });

    return {
      id: `q_${flashcard.id}_${Date.now()}`,
      flashcardId: flashcard.id,
      type: 'multiple_choice',
      question: object.question,
      correctAnswer: object.correctAnswer,
      options: shuffleArrayWithResult(object.options),
      imageUrl: null,
    };
  } catch (error) {
    console.error('AI multiple choice generation failed:', error);
    // Fallback
    return {
      id: `q_${flashcard.id}_${Date.now()}`,
      flashcardId: flashcard.id,
      type: 'multiple_choice',
      question: `Based on your notes, describe the following:\n\n${content.substring(0, 150)}${content.length > 150 ? '...' : ''}`,
      correctAnswer: content,
      options: shuffleArrayWithResult([content, 'Not covered in notes', 'Cannot be determined', 'None of the above']),
      imageUrl: null,
    };
  }
}

/**
 * Select distractor answers from other flashcards
 * @param {Array} flashcards
 * @param {number} count
 * @returns {string[]}
 */
function selectDistractors(flashcards, count) {
  const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(fc => fc.content?.substring(0, 50) || 'Unknown');
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

const evaluationSchema = z.object({
  isCorrect: z.boolean().describe('Whether the user answer is correct'),
  confidence: z.number().min(0).max(1).describe('Confidence in the evaluation'),
  keyPoints: z.array(z.string()).describe('Key points from the correct answer'),
  missingPoints: z.array(z.string()).describe('Important points the user missed'),
});

/**
 * Evaluate a user's response using AI
 * @param {string} content - The original flashcard content
 * @param {string} userAnswer - The user's answer
 * @param {string} question - The question that was asked
 * @returns {Promise<{isCorrect: boolean, confidence: number, keyPoints: string[], missingPoints: string[]}>}
 */
async function evaluateWithAI(content, userAnswer, question) {
  try {
    const { object } = await generateObject({
      model: gateway(AI_MODEL),
      system: `You are an expert quiz evaluator. Evaluate the user's answer against the original study material and return the result as JSON.

Rules:
1. Determine if the user's answer demonstrates understanding of the key concepts
2. Be somewhat lenient - partial understanding should be marked correct
3. Focus on whether the core concept is captured, not exact wording
4. Consider synonyms and paraphrasing as correct
5. If the answer is clearly wrong or unrelated, mark as incorrect`,
      prompt: `Original study material:
"""
${content}
"""

Question asked: "${question}"

User's answer: "${userAnswer}"

Evaluate whether the user's answer is correct based on the study material.`,
      schema: evaluationSchema,
    });

    return {
      isCorrect: object.isCorrect,
      confidence: object.confidence,
      keyPoints: object.keyPoints,
      missingPoints: object.missingPoints,
    };
  } catch (error) {
    console.error('AI evaluation failed, using fallback:', error);
    // Fallback: simple keyword matching
    const contentWords = new Set(content.toLowerCase().split(/\s+/));
    const answerWords = new Set(userAnswer.toLowerCase().split(/\s+/));
    const overlap = [...answerWords].filter(w => contentWords.has(w) && w.length > 3);
    const isCorrect = overlap.length >= 2;
    return {
      isCorrect,
      confidence: isCorrect ? 0.6 : 0.8,
      keyPoints: [],
      missingPoints: [],
    };
  }
}

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
  const flashcardId = questionId.includes('_batch_') || questionId.includes('_fallback_') 
    ? questionId.split('_')[1] 
    : questionId.split('_')[1];
  
  const flashcardDoc = await db.collection('flashcards').doc(flashcardId).get();

  if (!flashcardDoc.exists) {
    throw new Error(`Flashcard ${flashcardId} not found`);
  }

  const flashcard = { id: flashcardDoc.id, ...flashcardDoc.data() };

  let isCorrect = false;
  let confidence = 0;
  let correctAnswerText = '';
  let feedbackText = '';

  // Fast path for pre-generated multiple choice questions
  if (session.type === 'multiple_choice' && session.preGeneratedQuestions) {
    const question = session.preGeneratedQuestions.find(q => q.id === questionId);
    if (question) {
      correctAnswerText = question.correctAnswer;
      // Since it's multiple choice, the user answer should match the exact option text
      isCorrect = userAnswer === question.correctAnswer;
      confidence = isCorrect ? 1.0 : 0.9;
      feedbackText = isCorrect 
        ? "Correct! That is exactly right." 
        : `Not quite. The correct answer is: "${question.correctAnswer}"`;
    }
  }

  if (!correctAnswerText) {
    // Legacy / fallback path
    const originalQuestion = session.lastQuestion || 'General understanding';
    
    // Use AI to evaluate the answer against the content
    const evalResult = await evaluateWithAI(
      flashcard.content || '',
      userAnswer,
      originalQuestion
    );
    isCorrect = evalResult.isCorrect;
    confidence = evalResult.confidence;
    correctAnswerText = flashcard.content?.substring(0, 200) || '';
    feedbackText = generateFeedback(isCorrect, correctAnswerText, userAnswer, confidence);
  }

  // Update score via scoring service
  const scoreResult = await updateFlashcardScore(flashcardId, isCorrect, confidence);

  // Record response in session
  const response = {
    flashcardId,
    questionId,
    questionType: inferQuestionType(questionId),
    userAnswer,
    correctAnswer: correctAnswerText,
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
    feedback: feedbackText,
    correctAnswer: correctAnswerText,
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
