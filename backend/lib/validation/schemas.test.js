/**
 * Tests for Validation Functions
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

import {
  ValidationError,
  validateUser,
  validateModule,
  validateFlashcard,
  validateQuizSession,
  validateQuizResponse,
  validatePresentation,
  validateUserPreferences,
  checkModuleOwnership,
  checkFlashcardOwnership,
  checkFlashcardModule,
  checkSessionOwnership,
  validateFlashcards,
  createUserDefaults,
  createModuleDefaults,
  createFlashcardDefaults,
  createQuizSessionDefaults,
  createPresentationDefaults,
} from './validation/schemas.js';

describe('Validation Functions', () => {
  describe('ValidationError', () => {
    it('should create error with message and fields', () => {
      const error = new ValidationError('Test error', { field1: 'error1' });

      expect(error.message).toBe('Test error');
      expect(error.name).toBe('ValidationError');
      expect(error.fields).toEqual({ field1: 'error1' });
    });

    it('should create error with message only', () => {
      const error = new ValidationError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.fields).toEqual({});
    });
  });

  describe('validateUser', () => {
    it('should validate a valid user', () => {
      const user = {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
      };

      expect(() => validateUser(user)).not.toThrow();
    });

    it('should throw error for missing id', () => {
      const user = {
        email: 'test@example.com',
        name: 'Test User',
      };

      expect(() => validateUser(user)).toThrow(ValidationError);
    });

    it('should throw error for empty id', () => {
      const user = {
        id: '',
        email: 'test@example.com',
        name: 'Test User',
      };

      expect(() => validateUser(user)).toThrow(ValidationError);
    });

    it('should throw error for missing email', () => {
      const user = {
        id: 'user123',
        name: 'Test User',
      };

      expect(() => validateUser(user)).toThrow(ValidationError);
    });

    it('should throw error for missing name', () => {
      const user = {
        id: 'user123',
        email: 'test@example.com',
      };

      expect(() => validateUser(user)).toThrow(ValidationError);
    });

    it('should validate update with partial data', () => {
      const user = {
        email: 'updated@example.com',
      };

      expect(() => validateUser(user, true)).not.toThrow();
    });

    it('should validate user with preferences', () => {
      const user = {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        preferences: {
          quizType: 'voice',
          speechRate: 1.5,
          theme: 'dark',
        },
      };

      expect(() => validateUser(user)).not.toThrow();
    });

    it('should throw error for invalid quizType', () => {
      const user = {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        preferences: {
          quizType: 'invalid',
        },
      };

      expect(() => validateUser(user)).toThrow(ValidationError);
    });

    it('should throw error for invalid speechRate', () => {
      const user = {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        preferences: {
          speechRate: 3.0,
        },
      };

      expect(() => validateUser(user)).toThrow(ValidationError);
    });
  });

  describe('validateUserPreferences', () => {
    it('should validate valid preferences', () => {
      const prefs = {
        quizType: 'image',
        speechRate: 1.2,
        theme: 'dark',
      };

      const errors = validateUserPreferences(prefs);

      expect(Object.keys(errors)).toHaveLength(0);
    });

    it('should return error for invalid quizType', () => {
      const prefs = { quizType: 'invalid' };

      const errors = validateUserPreferences(prefs);

      expect(errors.quizType).toBeDefined();
    });

    it('should return error for speechRate out of range', () => {
      const prefs = { speechRate: 0.3 };

      const errors = validateUserPreferences(prefs);

      expect(errors.speechRate).toBeDefined();
    });

    it('should return error for invalid theme', () => {
      const prefs = { theme: 'blue' };

      const errors = validateUserPreferences(prefs);

      expect(errors.theme).toBeDefined();
    });
  });

  describe('validateModule', () => {
    it('should validate a valid module', () => {
      const module = {
        userId: 'user123',
        name: 'Biology',
      };

      expect(() => validateModule(module)).not.toThrow();
    });

    it('should throw error for missing userId', () => {
      const module = {
        name: 'Biology',
      };

      expect(() => validateModule(module)).toThrow(ValidationError);
    });

    it('should throw error for missing name', () => {
      const module = {
        userId: 'user123',
      };

      expect(() => validateModule(module)).toThrow(ValidationError);
    });

    it('should throw error for name exceeding max length', () => {
      const module = {
        userId: 'user123',
        name: 'A'.repeat(201),
      };

      expect(() => validateModule(module)).toThrow(ValidationError);
    });

    it('should validate module with optional fields', () => {
      const module = {
        userId: 'user123',
        name: 'Biology',
        description: 'Study of living organisms',
        color: '#FF5733',
        flashcardCount: 10,
        aggregateKnowledgeScore: 75,
      };

      expect(() => validateModule(module)).not.toThrow();
    });

    it('should throw error for invalid hex color', () => {
      const module = {
        userId: 'user123',
        name: 'Biology',
        color: 'invalid',
      };

      expect(() => validateModule(module)).toThrow(ValidationError);
    });

    it('should throw error for negative flashcardCount', () => {
      const module = {
        userId: 'user123',
        name: 'Biology',
        flashcardCount: -1,
      };

      expect(() => validateModule(module)).toThrow(ValidationError);
    });

    it('should throw error for aggregateKnowledgeScore out of range', () => {
      const module = {
        userId: 'user123',
        name: 'Biology',
        aggregateKnowledgeScore: 150,
      };

      expect(() => validateModule(module)).toThrow(ValidationError);
    });
  });

  describe('validateFlashcard', () => {
    it('should validate a valid flashcard', () => {
      const flashcard = {
        userId: 'user123',
        moduleId: 'mod123',
        question: 'What is photosynthesis?',
        answer: 'The process by which plants convert sunlight into energy',
      };

      expect(() => validateFlashcard(flashcard)).not.toThrow();
    });

    it('should throw error for missing userId', () => {
      const flashcard = {
        moduleId: 'mod123',
        question: 'Question?',
        answer: 'Answer',
      };

      expect(() => validateFlashcard(flashcard)).toThrow(ValidationError);
    });

    it('should throw error for missing moduleId', () => {
      const flashcard = {
        userId: 'user123',
        question: 'Question?',
        answer: 'Answer',
      };

      expect(() => validateFlashcard(flashcard)).toThrow(ValidationError);
    });

    it('should throw error for missing question', () => {
      const flashcard = {
        userId: 'user123',
        moduleId: 'mod123',
        answer: 'Answer',
      };

      expect(() => validateFlashcard(flashcard)).toThrow(ValidationError);
    });

    it('should throw error for missing answer', () => {
      const flashcard = {
        userId: 'user123',
        moduleId: 'mod123',
        question: 'Question?',
      };

      expect(() => validateFlashcard(flashcard)).toThrow(ValidationError);
    });

    it('should validate flashcard with optional fields', () => {
      const flashcard = {
        userId: 'user123',
        moduleId: 'mod123',
        question: 'Question?',
        answer: 'Answer',
        sourceImageUrl: 'https://example.com/image.jpg',
        confidence: 0.9,
        knowledgeScore: 75,
        reviewCount: 5,
        correctCount: 4,
        incorrectCount: 1,
      };

      expect(() => validateFlashcard(flashcard)).not.toThrow();
    });

    it('should throw error for knowledgeScore out of range', () => {
      const flashcard = {
        userId: 'user123',
        moduleId: 'mod123',
        question: 'Question?',
        answer: 'Answer',
        knowledgeScore: 150,
      };

      expect(() => validateFlashcard(flashcard)).toThrow(ValidationError);
    });

    it('should throw error for confidence out of range', () => {
      const flashcard = {
        userId: 'user123',
        moduleId: 'mod123',
        question: 'Question?',
        answer: 'Answer',
        confidence: 1.5,
      };

      expect(() => validateFlashcard(flashcard)).toThrow(ValidationError);
    });
  });

  describe('validateQuizSession', () => {
    it('should validate a valid quiz session', () => {
      const session = {
        userId: 'user123',
        moduleId: 'mod123',
        type: 'voice',
        flashcardIds: ['fc1', 'fc2'],
        currentFlashcardIndex: 0,
      };

      expect(() => validateQuizSession(session)).not.toThrow();
    });

    it('should throw error for invalid type', () => {
      const session = {
        userId: 'user123',
        moduleId: 'mod123',
        type: 'invalid',
        flashcardIds: ['fc1'],
        currentFlashcardIndex: 0,
      };

      expect(() => validateQuizSession(session)).toThrow(ValidationError);
    });

    it('should throw error for invalid status', () => {
      const session = {
        userId: 'user123',
        moduleId: 'mod123',
        type: 'voice',
        flashcardIds: ['fc1'],
        currentFlashcardIndex: 0,
        status: 'invalid',
      };

      expect(() => validateQuizSession(session)).toThrow(ValidationError);
    });

    it('should validate session with responses', () => {
      const session = {
        userId: 'user123',
        moduleId: 'mod123',
        type: 'voice',
        flashcardIds: ['fc1'],
        currentFlashcardIndex: 0,
        responses: [
          {
            flashcardId: 'fc1',
            questionType: 'free_recall',
            userAnswer: 'Test answer',
            isCorrect: true,
            scoreChange: 5,
          },
        ],
      };

      expect(() => validateQuizSession(session)).not.toThrow();
    });
  });

  describe('validateQuizResponse', () => {
    it('should validate a valid quiz response', () => {
      const response = {
        flashcardId: 'fc1',
        questionType: 'free_recall',
        userAnswer: 'Test answer',
        isCorrect: true,
        scoreChange: 5,
      };

      const errors = validateQuizResponse(response);

      expect(Object.keys(errors)).toHaveLength(0);
    });

    it('should return error for missing flashcardId', () => {
      const response = {
        questionType: 'free_recall',
        userAnswer: 'Test answer',
        isCorrect: true,
        scoreChange: 5,
      };

      const errors = validateQuizResponse(response);

      expect(errors.flashcardId).toBeDefined();
    });

    it('should return error for invalid questionType', () => {
      const response = {
        flashcardId: 'fc1',
        questionType: 'invalid',
        userAnswer: 'Test answer',
        isCorrect: true,
        scoreChange: 5,
      };

      const errors = validateQuizResponse(response);

      expect(errors.questionType).toBeDefined();
    });
  });

  describe('validatePresentation', () => {
    it('should validate a valid presentation', () => {
      const presentation = {
        userId: 'user123',
        topic: 'Photosynthesis',
      };

      expect(() => validatePresentation(presentation)).not.toThrow();
    });

    it('should throw error for missing userId', () => {
      const presentation = {
        topic: 'Photosynthesis',
      };

      expect(() => validatePresentation(presentation)).toThrow(ValidationError);
    });

    it('should throw error for missing topic', () => {
      const presentation = {
        userId: 'user123',
      };

      expect(() => validatePresentation(presentation)).toThrow(ValidationError);
    });

    it('should validate presentation with optional fields', () => {
      const presentation = {
        userId: 'user123',
        topic: 'Photosynthesis',
        flashcardId: 'fc123',
        designId: 'design123',
        editUrl: 'https://canva.com/edit',
        viewUrl: 'https://canva.com/view',
        status: 'ready',
      };

      expect(() => validatePresentation(presentation)).not.toThrow();
    });
  });

  describe('checkModuleOwnership', () => {
    it('should return true when module belongs to user', () => {
      const moduleDoc = { userId: 'user123' };

      expect(checkModuleOwnership(moduleDoc, 'user123')).toBe(true);
    });

    it('should throw error when module does not belong to user', () => {
      const moduleDoc = { userId: 'user456' };

      expect(() => checkModuleOwnership(moduleDoc, 'user123')).toThrow('Module does not belong to this user');
    });

    it('should throw error when module is null', () => {
      expect(() => checkModuleOwnership(null, 'user123')).toThrow('Module not found');
    });
  });

  describe('checkFlashcardOwnership', () => {
    it('should return true when flashcard belongs to user', () => {
      const flashcardDoc = { userId: 'user123' };

      expect(checkFlashcardOwnership(flashcardDoc, 'user123')).toBe(true);
    });

    it('should throw error when flashcard does not belong to user', () => {
      const flashcardDoc = { userId: 'user456' };

      expect(() => checkFlashcardOwnership(flashcardDoc, 'user123')).toThrow('Flashcard does not belong to this user');
    });

    it('should throw error when flashcard is null', () => {
      expect(() => checkFlashcardOwnership(null, 'user123')).toThrow('Flashcard not found');
    });
  });

  describe('checkFlashcardModule', () => {
    it('should return true when flashcard belongs to module', () => {
      const flashcardDoc = { moduleId: 'mod123' };

      expect(checkFlashcardModule(flashcardDoc, 'mod123')).toBe(true);
    });

    it('should throw error when flashcard does not belong to module', () => {
      const flashcardDoc = { moduleId: 'mod456' };

      expect(() => checkFlashcardModule(flashcardDoc, 'mod123')).toThrow('Flashcard does not belong to this module');
    });
  });

  describe('validateFlashcards', () => {
    it('should separate valid and invalid flashcards', () => {
      const flashcards = [
        {
          userId: 'user123',
          moduleId: 'mod123',
          question: 'Q1?',
          answer: 'A1',
        },
        {
          userId: 'user123',
          moduleId: 'mod123',
          question: '', // Invalid
          answer: 'A2',
        },
        {
          userId: 'user123',
          moduleId: 'mod123',
          question: 'Q3?',
          answer: 'A3',
        },
      ];

      const result = validateFlashcards(flashcards);

      expect(result.valid).toHaveLength(2);
      expect(result.invalid).toHaveLength(1);
    });
  });

  describe('Default Factories', () => {
    it('createUserDefaults should create user with defaults', () => {
      const user = createUserDefaults({ id: 'user123' });

      expect(user.id).toBe('user123');
      expect(user.preferences.quizType).toBe('voice');
      expect(user.preferences.speechRate).toBe(1.0);
      expect(user.preferences.theme).toBe('light');
    });

    it('createModuleDefaults should create module with defaults', () => {
      const module = createModuleDefaults({ name: 'Test Module' });

      expect(module.name).toBe('Test Module');
      expect(module.description).toBeNull();
      expect(module.flashcardCount).toBe(0);
      expect(module.aggregateKnowledgeScore).toBe(0);
      expect(module.color).toBeNull();
    });

    it('createFlashcardDefaults should create flashcard with defaults', () => {
      const flashcard = createFlashcardDefaults({ question: 'Q?', answer: 'A' });

      expect(flashcard.question).toBe('Q?');
      expect(flashcard.sourceImageUrl).toBeNull();
      expect(flashcard.confidence).toBe(1.0);
      expect(flashcard.knowledgeScore).toBe(0);
      expect(flashcard.reviewCount).toBe(0);
    });

    it('createQuizSessionDefaults should create session with defaults', () => {
      const session = createQuizSessionDefaults({ userId: 'user123' });

      expect(session.userId).toBe('user123');
      expect(session.status).toBe('active');
      expect(session.currentFlashcardIndex).toBe(0);
      expect(session.responses).toEqual([]);
    });

    it('createPresentationDefaults should create presentation with defaults', () => {
      const presentation = createPresentationDefaults({ userId: 'user123', topic: 'Test' });

      expect(presentation.userId).toBe('user123');
      expect(presentation.topic).toBe('Test');
      expect(presentation.flashcardId).toBeNull();
      expect(presentation.status).toBe('pending');
    });
  });
});
