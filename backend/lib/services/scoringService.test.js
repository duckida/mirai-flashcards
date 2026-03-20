/**
 * Tests for Scoring Service
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock the Firebase admin module
const mockBatch = {
  update: jest.fn(),
  set: jest.fn(),
  commit: jest.fn(),
};

const mockDoc = {
  get: jest.fn(),
  update: jest.fn(),
};

const mockCollection = {
  doc: jest.fn(() => mockDoc),
  where: jest.fn(() => ({
    get: jest.fn(),
  })),
  orderBy: jest.fn(() => ({
    limit: jest.fn(() => ({
      get: jest.fn(),
    })),
  })),
};

const mockFirestore = {
  collection: jest.fn(() => mockCollection),
  batch: jest.fn(() => mockBatch),
};

jest.mock('../firebase/admin.js', () => ({
  getFirestore: () => mockFirestore,
}));

import {
  calculateScoreDelta,
  applyScoreDelta,
  calculateModuleAggregate,
  getScoreCategory,
  updateFlashcardScore,
  batchUpdateScores,
  recalculateModuleAggregate,
  getScoreHistory,
  getFlashcardStats,
} from './scoringService';

describe('Scoring Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFirestore.collection.mockReturnValue(mockCollection);
    mockCollection.doc.mockReturnValue(mockDoc);
    mockFirestore.batch.mockReturnValue(mockBatch);
  });

  describe('calculateScoreDelta', () => {
    it('should return positive delta for correct answers', () => {
      const delta = calculateScoreDelta(0.8, true);

      expect(delta).toBeGreaterThan(0);
      expect(delta).toBeLessThanOrEqual(10);
      expect(delta).toBeGreaterThanOrEqual(1);
    });

    it('should return negative delta for incorrect answers', () => {
      const delta = calculateScoreDelta(0.8, false);

      expect(delta).toBeLessThan(0);
      expect(delta).toBeGreaterThanOrEqual(-10);
      expect(delta).toBeLessThanOrEqual(-1);
    });

    it('should map confidence 0 to minimum delta', () => {
      const correctDelta = calculateScoreDelta(0, true);
      const incorrectDelta = calculateScoreDelta(0, false);

      expect(Math.abs(correctDelta)).toBe(1);
      expect(Math.abs(incorrectDelta)).toBe(1);
    });

    it('should map confidence 1 to maximum delta', () => {
      const correctDelta = calculateScoreDelta(1, true);
      const incorrectDelta = calculateScoreDelta(1, false);

      expect(correctDelta).toBe(10);
      expect(incorrectDelta).toBe(-10);
    });

    it('should clamp confidence values to 0-1 range', () => {
      const deltaHigh = calculateScoreDelta(1.5, true);
      const deltaLow = calculateScoreDelta(-0.5, true);

      expect(deltaHigh).toBe(10); // Clamped to 1
      expect(deltaLow).toBe(1); // Clamped to 0
    });

    it('should return symmetric deltas for correct/incorrect', () => {
      const confidence = 0.7;
      const correctDelta = calculateScoreDelta(confidence, true);
      const incorrectDelta = calculateScoreDelta(confidence, false);

      expect(correctDelta).toBe(-incorrectDelta);
    });
  });

  describe('applyScoreDelta', () => {
    it('should apply positive delta correctly', () => {
      const result = applyScoreDelta(50, 10);

      expect(result.newScore).toBe(60);
      expect(result.appliedDelta).toBe(10);
    });

    it('should apply negative delta correctly', () => {
      const result = applyScoreDelta(50, -10);

      expect(result.newScore).toBe(40);
      expect(result.appliedDelta).toBe(-10);
    });

    it('should enforce minimum score of 0', () => {
      const result = applyScoreDelta(5, -10);

      expect(result.newScore).toBe(0);
      expect(result.appliedDelta).toBe(-5);
    });

    it('should enforce maximum score of 100', () => {
      const result = applyScoreDelta(95, 10);

      expect(result.newScore).toBe(100);
      expect(result.appliedDelta).toBe(5);
    });

    it('should not change score when delta is 0', () => {
      const result = applyScoreDelta(50, 0);

      expect(result.newScore).toBe(50);
      expect(result.appliedDelta).toBe(0);
    });

    it('should handle score at boundary (0)', () => {
      const result = applyScoreDelta(0, 5);

      expect(result.newScore).toBe(5);
      expect(result.appliedDelta).toBe(5);
    });

    it('should handle score at boundary (100)', () => {
      const result = applyScoreDelta(100, -5);

      expect(result.newScore).toBe(95);
      expect(result.appliedDelta).toBe(-5);
    });
  });

  describe('calculateModuleAggregate', () => {
    it('should calculate mean of flashcard scores', () => {
      const flashcards = [
        { knowledgeScore: 80 },
        { knowledgeScore: 60 },
        { knowledgeScore: 70 },
      ];

      const aggregate = calculateModuleAggregate(flashcards);

      expect(aggregate).toBe(70);
    });

    it('should return 0 for empty array', () => {
      const aggregate = calculateModuleAggregate([]);

      expect(aggregate).toBe(0);
    });

    it('should return 0 for null input', () => {
      const aggregate = calculateModuleAggregate(null);

      expect(aggregate).toBe(0);
    });

    it('should handle flashcards with missing knowledgeScore', () => {
      const flashcards = [
        { knowledgeScore: 80 },
        { knowledgeScore: undefined },
        { knowledgeScore: 60 },
      ];

      const aggregate = calculateModuleAggregate(flashcards);

      expect(aggregate).toBe(47); // (80 + 0 + 60) / 3 = 46.67, rounded to 47
    });

    it('should round to nearest integer', () => {
      const flashcards = [
        { knowledgeScore: 50 },
        { knowledgeScore: 51 },
      ];

      const aggregate = calculateModuleAggregate(flashcards);

      expect(aggregate).toBe(51); // 50.5 rounded to 51
    });
  });

  describe('getScoreCategory', () => {
    it('should return "strong" for scores >= 70', () => {
      expect(getScoreCategory(70)).toBe('strong');
      expect(getScoreCategory(85)).toBe('strong');
      expect(getScoreCategory(100)).toBe('strong');
    });

    it('should return "moderate" for scores 40-69', () => {
      expect(getScoreCategory(40)).toBe('moderate');
      expect(getScoreCategory(55)).toBe('moderate');
      expect(getScoreCategory(69)).toBe('moderate');
    });

    it('should return "weak" for scores < 40', () => {
      expect(getScoreCategory(0)).toBe('weak');
      expect(getScoreCategory(20)).toBe('weak');
      expect(getScoreCategory(39)).toBe('weak');
    });
  });

  describe('updateFlashcardScore', () => {
    it('should update flashcard score correctly', async () => {
      const flashcardData = {
        knowledgeScore: 50,
        reviewCount: 5,
        correctCount: 3,
        incorrectCount: 2,
        moduleId: 'mod1',
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => flashcardData,
      });

      mockBatch.commit.mockResolvedValue();

      // Mock for recalculateModuleAggregate
      mockCollection.where.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [
            { data: () => ({ knowledgeScore: 60 }) },
            { data: () => ({ knowledgeScore: 50 }) },
          ],
        }),
      });

      const result = await updateFlashcardScore('fc1', true, 0.8);

      expect(result.newScore).toBeGreaterThan(50);
      expect(result.scoreDelta).toBeGreaterThan(0);
      expect(result.reviewCount).toBe(6);
      expect(result.correctCount).toBe(4);
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should handle flashcard not found', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });

      await expect(updateFlashcardScore('nonexistent', true, 0.8))
        .rejects.toThrow('Flashcard nonexistent not found');
    });

    it('should update incorrectCount for wrong answers', async () => {
      const flashcardData = {
        knowledgeScore: 50,
        reviewCount: 5,
        correctCount: 3,
        incorrectCount: 2,
        moduleId: 'mod1',
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => flashcardData,
      });

      mockBatch.commit.mockResolvedValue();

      mockCollection.where.mockReturnValue({
        get: jest.fn().mockResolvedValue({ docs: [] }),
      });

      const result = await updateFlashcardScore('fc1', false, 0.8);

      expect(result.newScore).toBeLessThan(50);
      expect(result.incorrectCount).toBe(3);
    });

    it('should enforce score bounds', async () => {
      const flashcardData = {
        knowledgeScore: 5,
        reviewCount: 1,
        correctCount: 0,
        incorrectCount: 1,
        moduleId: 'mod1',
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => flashcardData,
      });

      mockBatch.commit.mockResolvedValue();

      mockCollection.where.mockReturnValue({
        get: jest.fn().mockResolvedValue({ docs: [] }),
      });

      const result = await updateFlashcardScore('fc1', false, 1.0);

      expect(result.newScore).toBe(0);
    });
  });

  describe('batchUpdateScores', () => {
    it('should update multiple flashcard scores', async () => {
      const scoreUpdates = [
        { flashcardId: 'fc1', isCorrect: true, confidence: 0.8 },
        { flashcardId: 'fc2', isCorrect: false, confidence: 0.7 },
      ];

      mockDoc.get
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ knowledgeScore: 50, moduleId: 'mod1' }),
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ knowledgeScore: 60, moduleId: 'mod1' }),
        });

      mockBatch.commit.mockResolvedValue();

      mockCollection.where.mockReturnValue({
        get: jest.fn().mockResolvedValue({ docs: [] }),
      });

      const results = await batchUpdateScores(scoreUpdates);

      expect(results).toHaveLength(2);
      expect(results[0].flashcardId).toBe('fc1');
      expect(results[1].flashcardId).toBe('fc2');
    });

    it('should handle missing flashcards in batch', async () => {
      const scoreUpdates = [
        { flashcardId: 'fc1', isCorrect: true, confidence: 0.8 },
        { flashcardId: 'nonexistent', isCorrect: false, confidence: 0.7 },
      ];

      mockDoc.get
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ knowledgeScore: 50, moduleId: 'mod1' }),
        })
        .mockResolvedValueOnce({ exists: false });

      mockBatch.commit.mockResolvedValue();

      mockCollection.where.mockReturnValue({
        get: jest.fn().mockResolvedValue({ docs: [] }),
      });

      const results = await batchUpdateScores(scoreUpdates);

      expect(results).toHaveLength(2);
      expect(results[1].error).toBe('Flashcard not found');
    });
  });

  describe('recalculateModuleAggregate', () => {
    it('should recalculate and update module aggregate', async () => {
      const flashcards = [
        { knowledgeScore: 80 },
        { knowledgeScore: 60 },
      ];

      mockCollection.where.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: flashcards.map((fc) => ({ data: () => fc })),
        }),
      });

      mockDoc.update.mockResolvedValue();

      const result = await recalculateModuleAggregate('mod1');

      expect(result.aggregateScore).toBe(70);
      expect(result.flashcardCount).toBe(2);
      expect(mockDoc.update).toHaveBeenCalledWith({
        aggregateKnowledgeScore: 70,
        flashcardCount: 2,
        updatedAt: expect.any(Date),
      });
    });
  });

  describe('getScoreHistory', () => {
    it('should return score history for a flashcard', async () => {
      const history = [
        { id: 'h1', timestamp: new Date(), previousScore: 50, newScore: 60 },
        { id: 'h2', timestamp: new Date(), previousScore: 60, newScore: 55 },
      ];

      mockCollection.orderBy.mockReturnValue({
        limit: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            docs: history.map((h) => ({
              id: h.id,
              data: () => h,
            })),
          }),
        }),
      });

      const result = await getScoreHistory('fc1', 10);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('h1');
    });
  });

  describe('getFlashcardStats', () => {
    it('should return flashcard statistics', async () => {
      const flashcardData = {
        knowledgeScore: 75,
        reviewCount: 10,
        correctCount: 8,
        incorrectCount: 2,
        lastReviewedAt: new Date(),
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => flashcardData,
      });

      const result = await getFlashcardStats('fc1');

      expect(result.knowledgeScore).toBe(75);
      expect(result.scoreCategory).toBe('strong');
      expect(result.reviewCount).toBe(10);
      expect(result.correctCount).toBe(8);
      expect(result.incorrectCount).toBe(2);
      expect(result.accuracy).toBe(80);
    });

    it('should handle flashcard not found', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });

      await expect(getFlashcardStats('nonexistent'))
        .rejects.toThrow('Flashcard nonexistent not found');
    });

    it('should handle zero reviews', async () => {
      const flashcardData = {
        knowledgeScore: 0,
        reviewCount: 0,
        correctCount: 0,
        incorrectCount: 0,
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => flashcardData,
      });

      const result = await getFlashcardStats('fc1');

      expect(result.accuracy).toBe(0);
    });
  });
});
