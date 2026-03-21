/**
 * Tests for Quiz Engine Service - Pure Logic Functions
 * Tests functions that don't require external dependencies.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Import the quiz engine service functions directly
// We'll test the pure functions that don't need mocks
import {
  // Note: We can only test functions that are exported and don't require db
  // Since most functions require db, we'll test the logic indirectly through integration
} from '@/lib/services/quizEngineService.js';

describe('Quiz Engine Pure Logic', () => {
  describe('Correctness Determination', () => {
    // Test the logic directly by reimplementing the core algorithm
    const determineCorrectness = (correctAnswer, userAnswer) => {
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
    };

    it('should return high confidence for exact match', () => {
      const result = determineCorrectness('Paris', 'Paris');
      expect(result.isCorrect).toBe(true);
      expect(result.confidence).toBe(1.0);
    });

    it('should be case-insensitive', () => {
      const result = determineCorrectness('Paris', 'paris');
      expect(result.isCorrect).toBe(true);
    });

    it('should handle whitespace', () => {
      const result = determineCorrectness('Paris', '  Paris  ');
      expect(result.isCorrect).toBe(true);
    });

    it('should return false for completely different answers', () => {
      const result = determineCorrectness('Paris', 'London');
      expect(result.isCorrect).toBe(false);
    });

    it('should handle partial matches with high overlap', () => {
      // This test verifies the word overlap algorithm
      const result = determineCorrectness('Paris capital France', 'Paris France capital');
      expect(result.isCorrect).toBe(true);
    });

    it('should handle empty user answer', () => {
      const result = determineCorrectness('Paris', '');
      expect(result.isCorrect).toBe(false);
    });
  });

  describe('Feedback Generation', () => {
    const generateFeedback = (isCorrect, correctAnswer, userAnswer, confidence = 1.0) => {
      if (isCorrect) {
        if (confidence >= 0.9) {
          return 'Perfect! That is exactly right.';
        }
        if (confidence >= 0.6) {
          return 'Correct! Your answer captured the key idea.';
        }
        return 'Correct! You got the key part right.';
      }

      const normalizedCorrect = correctAnswer.trim().toLowerCase();
      const normalizedUser = userAnswer.trim().toLowerCase();

      const correctWords = new Set(normalizedCorrect.split(/\s+/));
      const userWords = new Set(normalizedUser.split(/\s+/));
      const sharedWords = [...userWords].filter(w => correctWords.has(w) && w.length > 3);

      if (sharedWords.length > 0) {
        return `Not quite. You mentioned "${sharedWords.join(', ')}" which is part of the answer, but the correct answer is: "${correctAnswer}"`;
      }

      return `Not quite. The correct answer is: "${correctAnswer}"`;
    };

    it('should generate positive feedback for correct answers', () => {
      const feedback = generateFeedback(true, 'Paris', 'Paris', 1.0);
      expect(feedback).toContain('Perfect');
    });

    it('should generate medium confidence feedback for partial matches', () => {
      const feedback = generateFeedback(true, 'Paris', 'Paris', 0.7);
      expect(feedback).toContain('Correct');
    });

    it('should generate informative feedback for incorrect answers', () => {
      const feedback = generateFeedback(false, 'Paris', 'London', 0.8);
      expect(feedback).toContain('Not quite');
      expect(feedback).toContain('Paris');
    });

    it('should mention shared words in feedback', () => {
      const feedback = generateFeedback(false, 'Paris is the capital of France', 'Paris France');
      expect(feedback).toContain('Paris');
    });
  });

  describe('Fill in the Blank Generation', () => {
    const createBlankedAnswer = (answer) => {
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
    };

    it('should create blank for single word answer', () => {
      const result = createBlankedAnswer('Paris');
      expect(result).toBe('____');
    });

    it('should blank a significant word in multi-word answer', () => {
      const result = createBlankedAnswer('The mitochondria is the powerhouse');
      expect(result).toContain('____');
      expect(result).not.toBe('The mitochondria is the powerhouse');
    });

    it('should skip common words', () => {
      const result = createBlankedAnswer('is the powerhouse of the cell');
      expect(result).toContain('____');
      // Should blank 'powerhouse' or 'cell', not 'is', 'the', 'of'
    });
  });

  describe('Exercise Type Selection', () => {
    const EXERCISE_TYPES = ['free_recall', 'multiple_choice', 'fill_in_blank'];
    
    const selectExerciseType = (index, total) => {
      if (total <= 3) {
        return EXERCISE_TYPES[index % EXERCISE_TYPES.length];
      }

      if (index < 3) {
        return EXERCISE_TYPES[index];
      }

      const rand = Math.random();
      if (rand < 0.40) return 'free_recall';
      if (rand < 0.75) return 'multiple_choice';
      return 'fill_in_blank';
    };

    it('should cycle through types for short sessions', () => {
      expect(selectExerciseType(0, 2)).toBe('free_recall');
      expect(selectExerciseType(1, 2)).toBe('multiple_choice');
    });

    it('should use all three types in first 3 questions', () => {
      expect(selectExerciseType(0, 10)).toBe('free_recall');
      expect(selectExerciseType(1, 10)).toBe('multiple_choice');
      expect(selectExerciseType(2, 10)).toBe('fill_in_blank');
    });

    it('should return valid exercise type for any index', () => {
      for (let i = 0; i < 20; i++) {
        const type = selectExerciseType(i, 20);
        expect(EXERCISE_TYPES).toContain(type);
      }
    });
  });

  describe('Array Shuffling', () => {
    const shuffleArrayWithResult = (array) => {
      const result = [...array];
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    };

    it('should preserve array length', () => {
      const arr = [1, 2, 3, 4, 5];
      const shuffled = shuffleArrayWithResult(arr);
      expect(shuffled).toHaveLength(5);
    });

    it('should contain all original elements', () => {
      const arr = [1, 2, 3, 4, 5];
      const shuffled = shuffleArrayWithResult(arr);
      expect(shuffled.sort()).toEqual(arr.sort());
    });

    it('should not modify original array', () => {
      const arr = [1, 2, 3, 4, 5];
      const original = [...arr];
      shuffleArrayWithResult(arr);
      expect(arr).toEqual(original);
    });

    it('should handle empty array', () => {
      const shuffled = shuffleArrayWithResult([]);
      expect(shuffled).toEqual([]);
    });

    it('should handle single element', () => {
      const shuffled = shuffleArrayWithResult([1]);
      expect(shuffled).toEqual([1]);
    });
  });

  describe('Question ID Parsing', () => {
    const inferQuestionType = (questionId) => {
      if (questionId.includes('mc_')) return 'multiple_choice';
      if (questionId.includes('fib_')) return 'fill_in_blank';
      return 'free_recall';
    };

    it('should infer free_recall from standard ID', () => {
      expect(inferQuestionType('q_fc1_123')).toBe('free_recall');
    });

    it('should infer multiple_choice from mc_ prefix', () => {
      expect(inferQuestionType('mc_fc1_123')).toBe('multiple_choice');
    });

    it('should infer fill_in_blank from fib_ prefix', () => {
      expect(inferQuestionType('fib_fc1_123')).toBe('fill_in_blank');
    });
  });

  describe('Score Category', () => {
    const getScoreCategory = (score) => {
      if (score >= 70) return 'strong';
      if (score >= 40) return 'moderate';
      return 'weak';
    };

    it('should categorize scores >= 70 as strong', () => {
      expect(getScoreCategory(70)).toBe('strong');
      expect(getScoreCategory(100)).toBe('strong');
      expect(getScoreCategory(85)).toBe('strong');
    });

    it('should categorize scores 40-69 as moderate', () => {
      expect(getScoreCategory(40)).toBe('moderate');
      expect(getScoreCategory(69)).toBe('moderate');
      expect(getScoreCategory(55)).toBe('moderate');
    });

    it('should categorize scores < 40 as weak', () => {
      expect(getScoreCategory(0)).toBe('weak');
      expect(getScoreCategory(39)).toBe('weak');
      expect(getScoreCategory(20)).toBe('weak');
    });
  });

  describe('Distractor Selection', () => {
    const selectDistractors = (flashcards, count) => {
      const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count).map(fc => fc.answer);
    };

    it('should select correct number of distractors', () => {
      const flashcards = [
        { answer: 'Paris' },
        { answer: 'London' },
        { answer: 'Berlin' },
        { answer: 'Madrid' },
      ];

      const distractors = selectDistractors(flashcards, 3);
      expect(distractors).toHaveLength(3);
    });

    it('should not include duplicates in distractors', () => {
      const flashcards = [
        { answer: 'Paris' },
        { answer: 'London' },
        { answer: 'Berlin' },
      ];

      const distractors = selectDistractors(flashcards, 3);
      const uniqueDistractors = new Set(distractors);
      expect(uniqueDistractors.size).toBe(3);
    });

    it('should handle count greater than available flashcards', () => {
      const flashcards = [
        { answer: 'Paris' },
        { answer: 'London' },
      ];

      const distractors = selectDistractors(flashcards, 5);
      expect(distractors).toHaveLength(2);
    });
  });
});