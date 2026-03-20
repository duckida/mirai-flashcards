/**
 * Firestore Data Validation Module
 * Provides field-level, document-level, referential integrity, and type validation
 * for all Firestore collections used in the AI Flashcard Quizzer.
 */

// ============================================
// Validation Error Class
// ============================================

export class ValidationError extends Error {
  constructor(message, fields = {}) {
    super(message);
    this.name = 'ValidationError';
    this.fields = fields;
  }
}

// ============================================
// Field-Level Validators
// ============================================

function isString(value) {
  return typeof value === 'string';
}

function isNumber(value) {
  return typeof value === 'number' && !isNaN(value);
}

function isBoolean(value) {
  return typeof value === 'boolean';
}

function isTimestamp(value) {
  return value instanceof Date || (value && typeof value.toDate === 'function');
}

function isInRange(value, min, max) {
  return isNumber(value) && value >= min && value <= max;
}

function isNonEmptyString(value) {
  return isString(value) && value.trim().length > 0;
}

function isMaxLength(value, max) {
  return isString(value) && value.length <= max;
}

function isEnum(value, allowed) {
  return allowed.includes(value);
}

function isArrayOfStrings(value) {
  return Array.isArray(value) && value.every(isString);
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// ============================================
// Collection Schemas
// ============================================

const QUIZ_TYPES = ['voice', 'image', 'mixed'];
const THEMES = ['light', 'dark'];
const SESSION_TYPES = ['voice', 'image'];
const SESSION_STATUSES = ['active', 'paused', 'completed', 'abandoned'];
const PRESENTATION_STATUSES = ['pending', 'ready', 'failed'];
const QUESTION_TYPES = ['free_recall', 'multiple_choice', 'fill_in_blank'];

// ============================================
// User Validation
// ============================================

export function validateUser(data, isUpdate = false) {
  const errors = {};

  if (!isUpdate) {
    if (!isNonEmptyString(data.id)) {
      errors.id = 'id is required and must be a non-empty string';
    }
    if (!isNonEmptyString(data.email)) {
      errors.email = 'email is required and must be a non-empty string';
    }
    if (!isNonEmptyString(data.name)) {
      errors.name = 'name is required and must be a non-empty string';
    }
  }

  if (data.email !== undefined && !isNonEmptyString(data.email)) {
    errors.email = 'email must be a non-empty string';
  }

  if (data.name !== undefined) {
    if (!isNonEmptyString(data.name)) {
      errors.name = 'name must be a non-empty string';
    } else if (!isMaxLength(data.name, 100)) {
      errors.name = 'name must be at most 100 characters';
    }
  }

  if (data.picture !== undefined && data.picture !== null && !isString(data.picture)) {
    errors.picture = 'picture must be a string or null';
  }

  if (data.preferences !== undefined) {
    if (!isObject(data.preferences)) {
      errors.preferences = 'preferences must be an object';
    } else {
      const prefErrors = validateUserPreferences(data.preferences);
      if (Object.keys(prefErrors).length > 0) {
        errors.preferences = prefErrors;
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('User validation failed', errors);
  }

  return true;
}

export function validateUserPreferences(data) {
  const errors = {};

  if (data.quizType !== undefined && !isEnum(data.quizType, QUIZ_TYPES)) {
    errors.quizType = `quizType must be one of: ${QUIZ_TYPES.join(', ')}`;
  }

  if (data.speechRate !== undefined && !isInRange(data.speechRate, 0.5, 2.0)) {
    errors.speechRate = 'speechRate must be between 0.5 and 2.0';
  }

  if (data.theme !== undefined && !isEnum(data.theme, THEMES)) {
    errors.theme = `theme must be one of: ${THEMES.join(', ')}`;
  }

  return errors;
}

// ============================================
// Module Validation
// ============================================

export function validateModule(data, isUpdate = false) {
  const errors = {};

  if (!isUpdate) {
    if (!isNonEmptyString(data.userId)) {
      errors.userId = 'userId is required and must be a non-empty string';
    }
    if (!isNonEmptyString(data.name)) {
      errors.name = 'name is required and must be a non-empty string';
    }
  }

  if (data.name !== undefined) {
    if (!isNonEmptyString(data.name)) {
      errors.name = 'name must be a non-empty string';
    } else if (!isMaxLength(data.name, 200)) {
      errors.name = 'name must be at most 200 characters';
    }
  }

  if (data.description !== undefined && data.description !== null && !isString(data.description)) {
    errors.description = 'description must be a string or null';
  }

  if (data.flashcardCount !== undefined && (!isNumber(data.flashcardCount) || data.flashcardCount < 0)) {
    errors.flashcardCount = 'flashcardCount must be a non-negative number';
  }

  if (data.aggregateKnowledgeScore !== undefined && !isInRange(data.aggregateKnowledgeScore, 0, 100)) {
    errors.aggregateKnowledgeScore = 'aggregateKnowledgeScore must be between 0 and 100';
  }

  if (data.color !== undefined && data.color !== null) {
    if (!isString(data.color)) {
      errors.color = 'color must be a string or null';
    } else if (!/^#[0-9A-Fa-f]{6}$/.test(data.color)) {
      errors.color = 'color must be a valid hex color (e.g., #FF5733)';
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Module validation failed', errors);
  }

  return true;
}

// ============================================
// Flashcard Validation
// ============================================

export function validateFlashcard(data, isUpdate = false) {
  const errors = {};

  if (!isUpdate) {
    if (!isNonEmptyString(data.userId)) {
      errors.userId = 'userId is required and must be a non-empty string';
    }
    if (!isNonEmptyString(data.moduleId)) {
      errors.moduleId = 'moduleId is required and must be a non-empty string';
    }
    if (!isNonEmptyString(data.question)) {
      errors.question = 'question is required and must be a non-empty string';
    }
    if (!isNonEmptyString(data.answer)) {
      errors.answer = 'answer is required and must be a non-empty string';
    }
  }

  if (data.question !== undefined) {
    if (!isNonEmptyString(data.question)) {
      errors.question = 'question must be a non-empty string';
    } else if (!isMaxLength(data.question, 2000)) {
      errors.question = 'question must be at most 2000 characters';
    }
  }

  if (data.answer !== undefined) {
    if (!isNonEmptyString(data.answer)) {
      errors.answer = 'answer must be a non-empty string';
    } else if (!isMaxLength(data.answer, 5000)) {
      errors.answer = 'answer must be at most 5000 characters';
    }
  }

  if (data.sourceImageUrl !== undefined && data.sourceImageUrl !== null && !isString(data.sourceImageUrl)) {
    errors.sourceImageUrl = 'sourceImageUrl must be a string or null';
  }

  if (data.confidence !== undefined && !isInRange(data.confidence, 0, 1)) {
    errors.confidence = 'confidence must be between 0 and 1';
  }

  if (data.knowledgeScore !== undefined && !isInRange(data.knowledgeScore, 0, 100)) {
    errors.knowledgeScore = 'knowledgeScore must be between 0 and 100';
  }

  if (data.reviewCount !== undefined && (!isNumber(data.reviewCount) || data.reviewCount < 0)) {
    errors.reviewCount = 'reviewCount must be a non-negative number';
  }

  if (data.correctCount !== undefined && (!isNumber(data.correctCount) || data.correctCount < 0)) {
    errors.correctCount = 'correctCount must be a non-negative number';
  }

  if (data.incorrectCount !== undefined && (!isNumber(data.incorrectCount) || data.incorrectCount < 0)) {
    errors.incorrectCount = 'incorrectCount must be a non-negative number';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Flashcard validation failed', errors);
  }

  return true;
}

// ============================================
// Quiz Session Validation
// ============================================

export function validateQuizSession(data, isUpdate = false) {
  const errors = {};

  if (!isUpdate) {
    if (!isNonEmptyString(data.userId)) {
      errors.userId = 'userId is required and must be a non-empty string';
    }
    if (!isNonEmptyString(data.moduleId)) {
      errors.moduleId = 'moduleId is required and must be a non-empty string';
    }
    if (!isEnum(data.type, SESSION_TYPES)) {
      errors.type = `type must be one of: ${SESSION_TYPES.join(', ')}`;
    }
    if (!isArrayOfStrings(data.flashcardIds)) {
      errors.flashcardIds = 'flashcardIds must be an array of strings';
    }
    if (!isNumber(data.currentFlashcardIndex) || data.currentFlashcardIndex < 0) {
      errors.currentFlashcardIndex = 'currentFlashcardIndex must be a non-negative number';
    }
  }

  if (data.type !== undefined && !isEnum(data.type, SESSION_TYPES)) {
    errors.type = `type must be one of: ${SESSION_TYPES.join(', ')}`;
  }

  if (data.status !== undefined && !isEnum(data.status, SESSION_STATUSES)) {
    errors.status = `status must be one of: ${SESSION_STATUSES.join(', ')}`;
  }

  if (data.flashcardIds !== undefined && !isArrayOfStrings(data.flashcardIds)) {
    errors.flashcardIds = 'flashcardIds must be an array of strings';
  }

  if (data.currentFlashcardIndex !== undefined && (!isNumber(data.currentFlashcardIndex) || data.currentFlashcardIndex < 0)) {
    errors.currentFlashcardIndex = 'currentFlashcardIndex must be a non-negative number';
  }

  if (data.responses !== undefined) {
    if (!Array.isArray(data.responses)) {
      errors.responses = 'responses must be an array';
    } else {
      for (let i = 0; i < data.responses.length; i++) {
        const respErrors = validateQuizResponse(data.responses[i]);
        if (Object.keys(respErrors).length > 0) {
          errors[`responses[${i}]`] = respErrors;
        }
      }
    }
  }

  if (data.scoreChanges !== undefined && !isObject(data.scoreChanges)) {
    errors.scoreChanges = 'scoreChanges must be an object';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Quiz session validation failed', errors);
  }

  return true;
}

export function validateQuizResponse(data) {
  const errors = {};

  if (!isNonEmptyString(data.flashcardId)) {
    errors.flashcardId = 'flashcardId is required and must be a non-empty string';
  }

  if (!isEnum(data.questionType, QUESTION_TYPES)) {
    errors.questionType = `questionType must be one of: ${QUESTION_TYPES.join(', ')}`;
  }

  if (!isString(data.userAnswer)) {
    errors.userAnswer = 'userAnswer must be a string';
  }

  if (!isBoolean(data.isCorrect)) {
    errors.isCorrect = 'isCorrect must be a boolean';
  }

  if (!isNumber(data.scoreChange)) {
    errors.scoreChange = 'scoreChange must be a number';
  }

  return errors;
}

// ============================================
// Presentation Validation
// ============================================

export function validatePresentation(data, isUpdate = false) {
  const errors = {};

  if (!isUpdate) {
    if (!isNonEmptyString(data.userId)) {
      errors.userId = 'userId is required and must be a non-empty string';
    }
    if (!isNonEmptyString(data.topic)) {
      errors.topic = 'topic is required and must be a non-empty string';
    }
  }

  if (data.topic !== undefined) {
    if (!isNonEmptyString(data.topic)) {
      errors.topic = 'topic must be a non-empty string';
    } else if (!isMaxLength(data.topic, 500)) {
      errors.topic = 'topic must be at most 500 characters';
    }
  }

  if (data.flashcardId !== undefined && data.flashcardId !== null && !isString(data.flashcardId)) {
    errors.flashcardId = 'flashcardId must be a string or null';
  }

  if (data.designId !== undefined && !isNonEmptyString(data.designId)) {
    errors.designId = 'designId must be a non-empty string';
  }

  if (data.editUrl !== undefined && data.editUrl !== null && !isString(data.editUrl)) {
    errors.editUrl = 'editUrl must be a string or null';
  }

  if (data.viewUrl !== undefined && data.viewUrl !== null && !isString(data.viewUrl)) {
    errors.viewUrl = 'viewUrl must be a string or null';
  }

  if (data.status !== undefined && !isEnum(data.status, PRESENTATION_STATUSES)) {
    errors.status = `status must be one of: ${PRESENTATION_STATUSES.join(', ')}`;
  }

  if (data.expiresAt !== undefined && !isTimestamp(data.expiresAt)) {
    errors.expiresAt = 'expiresAt must be a valid timestamp';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Presentation validation failed', errors);
  }

  return true;
}

// ============================================
// Referential Integrity Checks
// ============================================

/**
 * Check that a module belongs to the given user
 * @param {Object} moduleDoc - Module document data
 * @param {string} userId - Expected user ID
 * @returns {boolean}
 */
export function checkModuleOwnership(moduleDoc, userId) {
  if (!moduleDoc) {
    throw new ValidationError('Module not found');
  }
  if (moduleDoc.userId !== userId) {
    throw new ValidationError('Module does not belong to this user');
  }
  return true;
}

/**
 * Check that a flashcard belongs to the given user
 * @param {Object} flashcardDoc - Flashcard document data
 * @param {string} userId - Expected user ID
 * @returns {boolean}
 */
export function checkFlashcardOwnership(flashcardDoc, userId) {
  if (!flashcardDoc) {
    throw new ValidationError('Flashcard not found');
  }
  if (flashcardDoc.userId !== userId) {
    throw new ValidationError('Flashcard does not belong to this user');
  }
  return true;
}

/**
 * Check that a flashcard's moduleId matches the expected module
 * @param {Object} flashcardDoc - Flashcard document data
 * @param {string} moduleId - Expected module ID
 * @returns {boolean}
 */
export function checkFlashcardModule(flashcardDoc, moduleId) {
  if (!flashcardDoc) {
    throw new ValidationError('Flashcard not found');
  }
  if (flashcardDoc.moduleId !== moduleId) {
    throw new ValidationError('Flashcard does not belong to this module');
  }
  return true;
}

/**
 * Check that a quiz session belongs to the given user
 * @param {Object} sessionDoc - Quiz session document data
 * @param {string} userId - Expected user ID
 * @returns {boolean}
 */
export function checkSessionOwnership(sessionDoc, userId) {
  if (!sessionDoc) {
    throw new ValidationError('Quiz session not found');
  }
  if (sessionDoc.userId !== userId) {
    throw new ValidationError('Quiz session does not belong to this user');
  }
  return true;
}

/**
 * Check that a module exists
 * @param {Object} firestoreService - FirestoreService instance
 * @param {string} moduleId - Module ID to check
 * @returns {Promise<Object>} Module data
 */
export async function requireModule(firestoreService, moduleId) {
  const moduleDoc = await firestoreService.getModule(moduleId);
  if (!moduleDoc) {
    throw new ValidationError('Module not found', { moduleId });
  }
  return moduleDoc;
}

/**
 * Check that a flashcard exists
 * @param {Object} firestoreService - FirestoreService instance
 * @param {string} flashcardId - Flashcard ID to check
 * @returns {Promise<Object>} Flashcard data
 */
export async function requireFlashcard(firestoreService, flashcardId) {
  const flashcardDoc = await firestoreService.getFlashcard(flashcardId);
  if (!flashcardDoc) {
    throw new ValidationError('Flashcard not found', { flashcardId });
  }
  return flashcardDoc;
}

// ============================================
// Batch Validation
// ============================================

/**
 * Validate an array of flashcards
 * @param {Array} flashcards - Array of flashcard data objects
 * @returns {{ valid: Array, invalid: Array }}
 */
export function validateFlashcards(flashcards) {
  const valid = [];
  const invalid = [];

  for (const flashcard of flashcards) {
    try {
      validateFlashcard(flashcard);
      valid.push(flashcard);
    } catch (err) {
      invalid.push({ data: flashcard, error: err.fields || err.message });
    }
  }

  return { valid, invalid };
}

// ============================================
// Default Factories
// ============================================

/**
 * Create a user document with defaults applied
 */
export function createUserDefaults(overrides = {}) {
  return {
    preferences: {
      quizType: 'voice',
      speechRate: 1.0,
      theme: 'light',
    },
    ...overrides,
  };
}

/**
 * Create a module document with defaults applied
 */
export function createModuleDefaults(overrides = {}) {
  return {
    description: null,
    flashcardCount: 0,
    aggregateKnowledgeScore: 0,
    color: null,
    ...overrides,
  };
}

/**
 * Create a flashcard document with defaults applied
 */
export function createFlashcardDefaults(overrides = {}) {
  return {
    sourceImageUrl: null,
    confidence: 1.0,
    knowledgeScore: 0,
    reviewCount: 0,
    correctCount: 0,
    incorrectCount: 0,
    ...overrides,
  };
}

/**
 * Create a quiz session document with defaults applied
 */
export function createQuizSessionDefaults(overrides = {}) {
  return {
    status: 'active',
    currentFlashcardIndex: 0,
    responses: [],
    scoreChanges: {},
    ...overrides,
  };
}

/**
 * Create a presentation document with defaults applied
 */
export function createPresentationDefaults(overrides = {}) {
  return {
    flashcardId: null,
    designId: null,
    editUrl: null,
    viewUrl: null,
    status: 'pending',
    ...overrides,
  };
}
