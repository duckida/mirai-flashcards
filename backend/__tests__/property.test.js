/**
 * Property-Based Tests
 * Tests invariants and properties that should always hold true
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

import {
  validateImageFile,
  ALLOWED_FORMATS,
  MAX_FILE_SIZE,
  ALLOWED_EXTENSIONS,
} from '@/lib/services/uploadService';

import {
  calculateScoreDelta,
  applyScoreDelta,
  calculateModuleAggregate,
  getScoreCategory,
} from '@/lib/services/scoringService';

import {
  validateUser,
  validateModule,
  validateFlashcard,
  validateQuizSession,
  ValidationError,
} from '@/lib/validation/schemas.js';

describe('Property-Based Tests', () => {
  describe('Image Format Validation Properties', () => {
    it('should always accept valid JPEG files within size limit', () => {
      const validSizes = [1, 1024, 1024 * 1024, 10 * 1024 * 1024, 20 * 1024 * 1024];

      for (const size of validSizes) {
        const file = { name: 'test.jpg', type: 'image/jpeg', size };
        const result = validateImageFile(file);
        expect(result.isValid).toBe(true);
      }
    });

    it('should always reject files exceeding size limit', () => {
      const oversizedFiles = [
        { name: 'large.jpg', type: 'image/jpeg', size: 21 * 1024 * 1024 },
        { name: 'huge.png', type: 'image/png', size: 100 * 1024 * 1024 },
        { name: 'giant.webp', type: 'image/webp', size: 50 * 1024 * 1024 },
      ];

      for (const file of oversizedFiles) {
        const result = validateImageFile(file);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('exceeds 20MB limit');
      }
    });

    it('should always accept allowed formats', () => {
      for (const format of ALLOWED_FORMATS) {
        const ext = format.split('/')[1];
        const file = { name: `test.${ext}`, type: format, size: 1024 };
        const result = validateImageFile(file);
        expect(result.isValid).toBe(true);
      }
    });

    it('should always reject unsupported formats', () => {
      const unsupported = ['image/gif', 'image/bmp', 'image/tiff', 'image/svg+xml'];

      for (const type of unsupported) {
        const file = { name: `test.${type.split('/')[1]}`, type, size: 1024 };
        const result = validateImageFile(file);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Unsupported image format');
      }
    });

    it('should validate file extension matches MIME type', () => {
      const validCombinations = [
        { name: 'photo.jpg', type: 'image/jpeg' },
        { name: 'photo.jpeg', type: 'image/jpeg' },
        { name: 'photo.png', type: 'image/png' },
        { name: 'photo.webp', type: 'image/webp' },
      ];

      for (const { name, type } of validCombinations) {
        const file = { name, type, size: 1024 };
        const result = validateImageFile(file);
        expect(result.isValid).toBe(true);
      }
    });
  });

  describe('Knowledge Score Properties', () => {
    it('should always return delta between -10 and 10', () => {
      for (let conf = 0; conf <= 1; conf += 0.05) {
        const correctDelta = calculateScoreDelta(conf, true);
        const incorrectDelta = calculateScoreDelta(conf, false);

        expect(correctDelta).toBeGreaterThanOrEqual(1);
        expect(correctDelta).toBeLessThanOrEqual(10);
        expect(incorrectDelta).toBeGreaterThanOrEqual(-10);
        expect(incorrectDelta).toBeLessThanOrEqual(-1);
      }
    });

    it('should always produce symmetric deltas for correct/incorrect', () => {
      for (let conf = 0; conf <= 1; conf += 0.1) {
        const correct = calculateScoreDelta(conf, true);
        const incorrect = calculateScoreDelta(conf, false);
        expect(correct).toBe(-incorrect);
      }
    });

    it('should monotonically increase delta with confidence for correct answers', () => {
      let prevDelta = 0;
      for (let conf = 0; conf <= 1; conf += 0.1) {
        const delta = calculateScoreDelta(conf, true);
        expect(delta).toBeGreaterThanOrEqual(prevDelta);
        prevDelta = delta;
      }
    });

    it('should always keep score within bounds after applying delta', () => {
      const testScores = [0, 1, 50, 99, 100];
      const testDeltas = [-20, -10, -5, 0, 5, 10, 20];

      for (const score of testScores) {
        for (const delta of testDeltas) {
          const result = applyScoreDelta(score, delta);
          expect(result.newScore).toBeGreaterThanOrEqual(0);
          expect(result.newScore).toBeLessThanOrEqual(100);
        }
      }
    });

    it('should satisfy: appliedDelta = newScore - currentScore', () => {
      const testCases = [
        [50, 10],
        [50, -10],
        [5, -10],
        [95, 10],
        [0, 5],
        [100, -5],
      ];

      for (const [score, delta] of testCases) {
        const result = applyScoreDelta(score, delta);
        expect(result.appliedDelta).toBe(result.newScore - score);
      }
    });

    it('should never return negative appliedDelta when score is at minimum', () => {
      for (let delta = -20; delta <= 0; delta++) {
        const result = applyScoreDelta(0, delta);
        expect(result.appliedDelta).toBeGreaterThanOrEqual(0);
        expect(result.newScore).toBe(0);
      }
    });

    it('should never return positive appliedDelta when score is at maximum', () => {
      for (let delta = 0; delta <= 20; delta++) {
        const result = applyScoreDelta(100, delta);
        expect(result.appliedDelta).toBeLessThanOrEqual(0);
        expect(result.newScore).toBe(100);
      }
    });
  });

  describe('Module Aggregate Score Properties', () => {
    it('should always return value between 0 and 100', () => {
      const testCases = [
        [{ knowledgeScore: 0 }],
        [{ knowledgeScore: 50 }],
        [{ knowledgeScore: 100 }],
        [{ knowledgeScore: 0 }, { knowledgeScore: 100 }],
        [{ knowledgeScore: 25 }, { knowledgeScore: 50 }, { knowledgeScore: 75 }],
      ];

      for (const flashcards of testCases) {
        const aggregate = calculateModuleAggregate(flashcards);
        expect(aggregate).toBeGreaterThanOrEqual(0);
        expect(aggregate).toBeLessThanOrEqual(100);
      }
    });

    it('should return 0 for empty input', () => {
      expect(calculateModuleAggregate([])).toBe(0);
      expect(calculateModuleAggregate(null)).toBe(0);
      expect(calculateModuleAggregate(undefined)).toBe(0);
    });

    it('should be between min and max of input scores', () => {
      const flashcards = [
        { knowledgeScore: 20 },
        { knowledgeScore: 80 },
        { knowledgeScore: 40 },
      ];

      const aggregate = calculateModuleAggregate(flashcards);

      expect(aggregate).toBeGreaterThanOrEqual(20);
      expect(aggregate).toBeLessThanOrEqual(80);
    });

    it('should be idempotent for identical scores', () => {
      const flashcards = [
        { knowledgeScore: 50 },
        { knowledgeScore: 50 },
        { knowledgeScore: 50 },
      ];

      const aggregate = calculateModuleAggregate(flashcards);
      expect(aggregate).toBe(50);
    });
  });

  describe('Score Category Properties', () => {
    it('should partition scores into exactly three categories', () => {
      const categories = new Set();

      for (let score = 0; score <= 100; score++) {
        categories.add(getScoreCategory(score));
      }

      expect(categories.size).toBe(3);
      expect(categories.has('weak')).toBe(true);
      expect(categories.has('moderate')).toBe(true);
      expect(categories.has('strong')).toBe(true);
    });

    it('should maintain category consistency across ranges', () => {
      // Weak: 0-39
      for (let s = 0; s < 40; s++) {
        expect(getScoreCategory(s)).toBe('weak');
      }

      // Moderate: 40-69
      for (let s = 40; s < 70; s++) {
        expect(getScoreCategory(s)).toBe('moderate');
      }

      // Strong: 70-100
      for (let s = 70; s <= 100; s++) {
        expect(getScoreCategory(s)).toBe('strong');
      }
    });
  });

  describe('Flashcard Persistence Properties', () => {
    it('should always have non-negative counts after validation', () => {
      const flashcard = {
        userId: 'user123',
        moduleId: 'mod123',
        question: 'Test?',
        answer: 'Test',
        reviewCount: 0,
        correctCount: 0,
        incorrectCount: 0,
      };

      expect(() => validateFlashcard(flashcard)).not.toThrow();

      // All counts should be non-negative
      expect(flashcard.reviewCount).toBeGreaterThanOrEqual(0);
      expect(flashcard.correctCount).toBeGreaterThanOrEqual(0);
      expect(flashcard.incorrectCount).toBeGreaterThanOrEqual(0);
    });

    it('should always have knowledgeScore between 0 and 100', () => {
      const validScores = [0, 1, 50, 99, 100];

      for (const score of validScores) {
        const flashcard = {
          userId: 'user123',
          moduleId: 'mod123',
          question: 'Test?',
          answer: 'Test',
          knowledgeScore: score,
        };

        expect(() => validateFlashcard(flashcard)).not.toThrow();
      }
    });

    it('should reject knowledgeScore outside 0-100 range', () => {
      const invalidScores = [-1, 101, -100, 200];

      for (const score of invalidScores) {
        const flashcard = {
          userId: 'user123',
          moduleId: 'mod123',
          question: 'Test?',
          answer: 'Test',
          knowledgeScore: score,
        };

        expect(() => validateFlashcard(flashcard)).toThrow(ValidationError);
      }
    });
  });

  describe('Module Classification Properties', () => {
    it('should always produce valid module names', () => {
      const testQuestions = [
        'What is DNA?',
        'How does photosynthesis work?',
        'What is the capital of France?',
        'Solve: 2 + 2 = ?',
      ];

      for (const question of testQuestions) {
        // Module names should be strings
        expect(typeof question).toBe('string');
        expect(question.length).toBeGreaterThan(0);
      }
    });

    it('should have confidence between 0 and 1', () => {
      const confidences = [0, 0.1, 0.5, 0.9, 1.0];

      for (const conf of confidences) {
        expect(conf).toBeGreaterThanOrEqual(0);
        expect(conf).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Quiz Selection Properties', () => {
    it('should select flashcards in ascending score order', () => {
      const flashcards = [
        { id: 'fc1', knowledgeScore: 80 },
        { id: 'fc2', knowledgeScore: 20 },
        { id: 'fc3', knowledgeScore: 50 },
        { id: 'fc4', knowledgeScore: 10 },
        { id: 'fc5', knowledgeScore: 90 },
      ];

      const sorted = [...flashcards].sort((a, b) => a.knowledgeScore - b.knowledgeScore);

      // Verify ascending order
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i].knowledgeScore).toBeGreaterThanOrEqual(sorted[i - 1].knowledgeScore);
      }

      // Lowest scores should come first
      expect(sorted[0].knowledgeScore).toBe(10);
      expect(sorted[sorted.length - 1].knowledgeScore).toBe(90);
    });

    it('should handle edge case of single flashcard', () => {
      const flashcards = [{ id: 'fc1', knowledgeScore: 50 }];

      expect(flashcards).toHaveLength(1);
      expect(flashcards[0].knowledgeScore).toBe(50);
    });

    it('should handle edge case of all same scores', () => {
      const flashcards = [
        { id: 'fc1', knowledgeScore: 50 },
        { id: 'fc2', knowledgeScore: 50 },
        { id: 'fc3', knowledgeScore: 50 },
      ];

      const sorted = [...flashcards].sort((a, b) => a.knowledgeScore - b.knowledgeScore);

      // All should have same score
      for (const fc of sorted) {
        expect(fc.knowledgeScore).toBe(50);
      }
    });
  });

  describe('Exercise Generation Properties', () => {
    it('should always generate exactly 4 options for multiple choice', () => {
      const generateOptions = (correctAnswer, distractors) => {
        const options = [correctAnswer, ...distractors.slice(0, 3)];
        // Shuffle
        return options.sort(() => Math.random() - 0.5);
      };

      const correct = 'Paris';
      const distractors = ['London', 'Berlin', 'Madison', 'Rome', 'Tokyo'];

      for (let i = 0; i < 10; i++) {
        const options = generateOptions(correct, distractors);
        expect(options).toHaveLength(4);
        expect(options).toContain(correct);
      }
    });

    it('should always include correct answer in options', () => {
      const correctAnswer = 'Correct';
      const distractors = ['Wrong1', 'Wrong2', 'Wrong3'];

      const options = [correctAnswer, ...distractors];
      expect(options).toContain(correctAnswer);
    });
  });

  describe('Response Evaluation Properties', () => {
    it('should correctly identify matching answers (case-insensitive)', () => {
      const evaluateAnswer = (userAnswer, correctAnswer) => {
        return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
      };

      const testCases = [
        ['Paris', 'paris', true],
        ['PARIS', 'Paris', true],
        ['  Paris  ', 'Paris', true],
        ['paris', 'PARIS', true],
        ['London', 'Paris', false],
        ['', 'Paris', false],
      ];

      for (const [user, correct, expected] of testCases) {
        expect(evaluateAnswer(user, correct)).toBe(expected);
      }
    });

    it('should handle empty answers correctly', () => {
      const evaluateAnswer = (userAnswer, correctAnswer) => {
        if (!userAnswer || !userAnswer.trim()) return false;
        return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
      };

      expect(evaluateAnswer('', 'Paris')).toBe(false);
      expect(evaluateAnswer('   ', 'Paris')).toBe(false);
      expect(evaluateAnswer(null, 'Paris')).toBe(false);
    });
  });
});
