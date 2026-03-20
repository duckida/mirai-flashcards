/**
 * Firestore Data Validation
 * Field-level and document-level validation for all collections
 */

// ============================================
// Validation Error
// ============================================

export class ValidationError extends Error {
  constructor(field, message) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

// ============================================
// Field Validators
// ============================================

function isString(value) {
  return typeof value === 'string';
}

function isNonEmptyString(value) {
  return isString(value) && value.trim().length > 0;
}

function isNumber(value) {
  return typeof value === 'number' && !isNaN(value);
}

function isInRange(value, min, max) {
  return isNumber(value) && value >= min && value <= max;
}

function isDate(value) {
  return value instanceof Date || (value && typeof value.toDate === 'function');
}

function isArray(value) {
  return Array.isArray(value);
}

function isOneOf(value, allowed) {
  return allowed.includes(value);
}

function isValidEmail(value) {
  return isString(value) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function assert(condition, field, message) {
  if (!condition) throw new ValidationError(field, message);
}

// ============================================
// Users Collection Validation
// ============================================

export function validateUser(data, { partial = false } = {}) {
  const errors = [];

  if (!partial || data.id !== undefined) {
    try { assert(isNonEmptyString(data.id), 'id', 'User ID is required and must be a non-empty string'); }
    catch (e) { errors.push(e); }
  }
  if (!partial || data.email !== undefined) {
    try { assert(isValidEmail(data.email), 'email', 'Valid email is required'); }
    catch (e) { errors.push(e); }
  }
  if (!partial || data.name !== undefined) {
    try { assert(isNonEmptyString(data.name), 'name', 'Name is required and must be a non-empty string'); }
    catch (e) { errors.push(e); }
  }
  if (data.preferences) {
    const p = data.preferences;
    if (p.quizType !== undefined) {
      try { assert(isOneOf(p.quizType, ['voice', 'image', 'mixed']), 'preferences.quizType', 'quizType must be voice, image, or mixed'); }
      catch (e) { errors.push(e); }
    }
    if (p.speechRate !== undefined) {
      try { assert(isInRange(p.speechRate, 0.5, 2.0), 'preferences.speechRate', 'speechRate must be between 0.5 and 2.0'); }
      catch (e) { errors.push(e); }
    }
    if (p.theme !== undefined) {
      try { assert(isOneOf(p.theme, ['light', 'dark']), 'preferences.theme', 'theme must be light or dark'); }
      catch (e) { errors.push(e); }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ============================================
// Modules Collection Validation
// ============================================

export function validateModule(data, { partial = false } = {}) {
  const errors = [];

  if (!partial || data.userId !== undefined) {
    try { assert(isNonEmptyString(data.userId), 'userId', 'userId is required and must be a non-empty string'); }
    catch (e) { errors.push(e); }
  }
  if (!partial || data.name !== undefined) {
    try { assert(isNonEmptyString(data.name), 'name', 'Module name is required and must be a non-empty string'); }
    catch (e) { errors.push(e); }
  }
  if (data.description !== undefined) {
    try { assert(isString(data.description), 'description', 'description must be a string'); }
    catch (e) { errors.push(e); }
  }
  if (data.color !== undefined) {
    try { assert(isString(data.color) && /^#[0-9A-Fa-f]{6}$/.test(data.color), 'color', 'color must be a valid hex color (e.g. #9333EA)'); }
    catch (e) { errors.push(e); }
  }
  if (data.flashcardCount !== undefined) {
    try { assert(isNumber(data.flashcardCount) && data.flashcardCount >= 0, 'flashcardCount', 'flashcardCount must be a non-negative number'); }
    catch (e) { errors.push(e); }
  }
  if (data.aggregateKnowledgeScore !== undefined) {
    try { assert(isInRange(data.aggregateKnowledgeScore, 0, 100), 'aggregateKnowledgeScore', 'aggregateKnowledgeScore must be between 0 and 100'); }
    catch (e) { errors.push(e); }
  }

  return { valid: errors.length === 0, errors };
}

// ============================================
// Flashcards Collection Validation
// ============================================

export function validateFlashcard(data, { partial = false } = {}) {
  const errors = [];

  if (!partial || data.userId !== undefined) {
    try { assert(isNonEmptyString(data.userId), 'userId', 'userId is required and must be a non-empty string'); }
    catch (e) { errors.push(e); }
  }
  if (!partial || data.moduleId !== undefined) {
    try { assert(isNonEmptyString(data.moduleId), 'moduleId', 'moduleId is required and must be a non-empty string'); }
    catch (e) { errors.push(e); }
  }
  if (!partial || data.question !== undefined) {
    try { assert(isNonEmptyString(data.question), 'question', 'question is required and must be a non-empty string'); }
    catch (e) { errors.push(e); }
  }
  if (!partial || data.answer !== undefined) {
    try { assert(isNonEmptyString(data.answer), 'answer', 'answer is required and must be a non-empty string'); }
    catch (e) { errors.push(e); }
  }
  if (data.knowledgeScore !== undefined) {
    try { assert(isInRange(data.knowledgeScore, 0, 100), 'knowledgeScore', 'knowledgeScore must be between 0 and 100'); }
    catch (e) { errors.push(e); }
  }
  if (data.sourceImageUrl !== undefined) {
    try { assert(isString(data.sourceImageUrl), 'sourceImageUrl', 'sourceImageUrl must be a string'); }
    catch (e) { errors.push(e); }
  }
  if (data.confidence !== undefined) {
    try { assert(isInRange(data.confidence, 0, 1), 'confidence', 'confidence must be between 0 and 1'); }
    catch (e) { errors.push(e); }
  }
  if (data.reviewCount !== undefined) {
    try { assert(isNumber(data.reviewCount) && data.reviewCount >= 0, 'reviewCount', 'reviewCount must be a non-negative number'); }
    catch (e) { errors.push(e); }
  }
  if (data.correctCount !== undefined) {
    try { assert(isNumber(data.correctCount) && data.correctCount >= 0, 'correctCount', 'correctCount must be a non-negative number'); }
    catch (e) { errors.push(e); }
  }
  if (data.incorrectCount !== undefined) {
    try { assert(isNumber(data.incorrectCount) && data.incorrectCount >= 0, 'incorrectCount', 'incorrectCount must be a non-negative number'); }
    catch (e) { errors.push(e); }
  }

  return { valid: errors.length === 0, errors };
}

// ============================================
// Quiz Sessions Collection Validation
// ============================================

export function validateQuizSession(data, { partial = false } = {}) {
  const errors = [];

  if (!partial || data.userId !== undefined) {
    try { assert(isNonEmptyString(data.userId), 'userId', 'userId is required and must be a non-empty string'); }
    catch (e) { errors.push(e); }
  }
  if (!partial || data.moduleId !== undefined) {
    try { assert(isNonEmptyString(data.moduleId), 'moduleId', 'moduleId is required and must be a non-empty string'); }
    catch (e) { errors.push(e); }
  }
  if (!partial || data.type !== undefined) {
    try { assert(isOneOf(data.type, ['voice', 'image']), 'type', 'type must be voice or image'); }
    catch (e) { errors.push(e); }
  }
  if (data.status !== undefined) {
    try { assert(isOneOf(data.status, ['active', 'paused', 'completed', 'abandoned']), 'status', 'status must be active, paused, completed, or abandoned'); }
    catch (e) { errors.push(e); }
  }
  if (data.flashcardIds !== undefined) {
    try { assert(isArray(data.flashcardIds), 'flashcardIds', 'flashcardIds must be an array'); }
    catch (e) { errors.push(e); }
  }
  if (data.currentFlashcardIndex !== undefined) {
    try { assert(isNumber(data.currentFlashcardIndex) && data.currentFlashcardIndex >= 0, 'currentFlashcardIndex', 'currentFlashcardIndex must be a non-negative number'); }
    catch (e) { errors.push(e); }
  }
  if (data.responses !== undefined) {
    try { assert(isArray(data.responses), 'responses', 'responses must be an array'); }
    catch (e) { errors.push(e); }
  }

  return { valid: errors.length === 0, errors };
}

export function validateQuizResponse(data) {
  const errors = [];

  try { assert(isNonEmptyString(data.flashcardId), 'flashcardId', 'flashcardId is required'); }
  catch (e) { errors.push(e); }
  try { assert(isOneOf(data.questionType, ['free_recall', 'multiple_choice', 'fill_in_blank']), 'questionType', 'questionType must be free_recall, multiple_choice, or fill_in_blank'); }
  catch (e) { errors.push(e); }
  try { assert(isString(data.userAnswer), 'userAnswer', 'userAnswer must be a string'); }
  catch (e) { errors.push(e); }
  try { assert(typeof data.isCorrect === 'boolean', 'isCorrect', 'isCorrect must be a boolean'); }
  catch (e) { errors.push(e); }
  try { assert(isNumber(data.scoreChange), 'scoreChange', 'scoreChange must be a number'); }
  catch (e) { errors.push(e); }

  return { valid: errors.length === 0, errors };
}

// ============================================
// Presentations Collection Validation
// ============================================

export function validatePresentation(data, { partial = false } = {}) {
  const errors = [];

  if (!partial || data.userId !== undefined) {
    try { assert(isNonEmptyString(data.userId), 'userId', 'userId is required and must be a non-empty string'); }
    catch (e) { errors.push(e); }
  }
  if (!partial || data.topic !== undefined) {
    try { assert(isNonEmptyString(data.topic), 'topic', 'topic is required and must be a non-empty string'); }
    catch (e) { errors.push(e); }
  }
  if (data.flashcardId !== undefined && data.flashcardId !== null) {
    try { assert(isNonEmptyString(data.flashcardId), 'flashcardId', 'flashcardId must be a non-empty string if provided'); }
    catch (e) { errors.push(e); }
  }
  if (data.canvaId !== undefined) {
    try { assert(isNonEmptyString(data.canvaId), 'canvaId', 'canvaId must be a non-empty string'); }
    catch (e) { errors.push(e); }
  }
  if (data.editLink !== undefined) {
    try { assert(isString(data.editLink), 'editLink', 'editLink must be a string'); }
    catch (e) { errors.push(e); }
  }
  if (data.viewLink !== undefined) {
    try { assert(isString(data.viewLink), 'viewLink', 'viewLink must be a string'); }
    catch (e) { errors.push(e); }
  }
  if (data.status !== undefined) {
    try { assert(isOneOf(data.status, ['pending', 'ready', 'failed']), 'status', 'status must be pending, ready, or failed'); }
    catch (e) { errors.push(e); }
  }

  return { valid: errors.length === 0, errors };
}

// ============================================
// Referential Integrity Checks
// ============================================

import { getFirestore } from './admin.js';

/**
 * Check if a user exists
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function userExists(userId) {
  const db = getFirestore();
  const doc = await db.collection('users').doc(userId).get();
  return doc.exists;
}

/**
 * Check if a module exists and belongs to the user
 * @param {string} moduleId
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function moduleBelongsToUser(moduleId, userId) {
  const db = getFirestore();
  const doc = await db.collection('modules').doc(moduleId).get();
  return doc.exists && doc.data().userId === userId;
}

/**
 * Check if a flashcard exists and belongs to the user
 * @param {string} flashcardId
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function flashcardBelongsToUser(flashcardId, userId) {
  const db = getFirestore();
  const doc = await db.collection('flashcards').doc(flashcardId).get();
  return doc.exists && doc.data().userId === userId;
}

/**
 * Verify module-flashcard referential integrity
 * @param {string} flashcardId
 * @param {string} moduleId
 * @returns {Promise<boolean>}
 */
export async function flashcardBelongsToModule(flashcardId, moduleId) {
  const db = getFirestore();
  const doc = await db.collection('flashcards').doc(flashcardId).get();
  return doc.exists && doc.data().moduleId === moduleId;
}
