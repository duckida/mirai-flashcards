/**
 * Integration Tests
 * Tests the flow between different services and components
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock Firebase admin
const mockBatchCommit = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchSet = jest.fn();
const mockAdd = jest.fn();
const mockGet = jest.fn();
const mockUpdate = jest.fn();
const mockWhere = jest.fn();
const mockOrderBy = jest.fn();
const mockLimit = jest.fn();

const mockDoc = {
  get: mockGet,
  update: mockUpdate,
};

const mockCollection = {
  add: mockAdd,
  doc: jest.fn(() => mockDoc),
  where: mockWhere,
  orderBy: mockOrderBy,
};

const mockBatch = {
  update: mockBatchUpdate,
  set: mockBatchSet,
  commit: mockBatchCommit,
};

const mockFirestore = {
  collection: jest.fn(() => mockCollection),
  batch: jest.fn(() => mockBatch),
};

jest.mock('@/lib/firebase/admin.js', () => ({
  getFirestore: () => mockFirestore,
}));

// Mock AI SDK
const mockGenerateObject = jest.fn();

jest.mock('ai', () => ({
  gateway: jest.fn((model) => model),
  generateObject: mockGenerateObject,
}));

jest.mock('zod', () => ({
  z: {
    object: jest.fn(() => ({ describe: jest.fn(() => ({})) })),
    string: jest.fn(() => ({ describe: jest.fn(() => ({})) })),
    enum: jest.fn(() => ({ describe: jest.fn(() => ({})) })),
    number: jest.fn(() => ({
      min: jest.fn(() => ({
        max: jest.fn(() => ({ describe: jest.fn(() => ({})) })),
      })),
    })),
  },
}));

import { classifyFlashcard, findMatchingModule } from '@/lib/services/classifierService';
import {
  calculateScoreDelta,
  applyScoreDelta,
  updateFlashcardScore,
  recalculateModuleAggregate,
} from '@/lib/services/scoringService';
import { upsertUser, getUserPreferences } from '@/lib/services/authService';

describe('Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFirestore.collection.mockReturnValue(mockCollection);
    mockCollection.doc.mockReturnValue(mockDoc);
    mockFirestore.batch.mockReturnValue(mockBatch);
  });

  describe('Upload → Classify → Save Flow', () => {
    it('should classify and save flashcards to correct modules', async () => {
      const userId = 'user123';
      const flashcard = {
        question: 'What is photosynthesis?',
        answer: 'The process by which plants convert sunlight into energy',
      };

      // Step 1: Classify the flashcard
      mockGenerateObject.mockResolvedValue({
        object: {
          moduleName: 'Biology',
          action: 'new',
          confidence: 0.9,
          reason: 'This is a biology question',
        },
      });

      const classification = await classifyFlashcard(flashcard);

      expect(classification.success).toBe(true);
      expect(classification.assignment.moduleName).toBe('Biology');

      // Step 2: Find or create module
      const existingModules = [];
      const match = await findMatchingModule(flashcard, existingModules);

      expect(match.shouldCreateNew).toBe(true);
      expect(match.moduleName).toBe('Biology');

      // Step 3: Verify the flow would create a module and flashcard
      expect(classification.assignment.action).toBe('new');
      expect(match.moduleId).toBeNull();
    });

    it('should match existing module when flashcard fits', async () => {
      const flashcard = {
        question: 'What is the mitochondria?',
        answer: 'The powerhouse of the cell',
      };

      const existingModules = [
        { id: 'mod1', name: 'Biology' },
        { id: 'mod2', name: 'Chemistry' },
      ];

      mockGenerateObject.mockResolvedValue({
        object: {
          moduleName: 'Biology',
          action: 'existing',
          confidence: 0.95,
          reason: 'This is a cell biology question',
        },
      });

      const match = await findMatchingModule(flashcard, existingModules);

      expect(match.shouldCreateNew).toBe(false);
      expect(match.moduleId).toBe('mod1');
      expect(match.moduleName).toBe('Biology');
    });
  });

  describe('Quiz → Scoring Flow', () => {
    it('should update scores correctly after quiz answer', async () => {
      const flashcardId = 'fc1';
      const flashcardData = {
        knowledgeScore: 50,
        reviewCount: 5,
        correctCount: 3,
        incorrectCount: 2,
        moduleId: 'mod1',
      };

      mockGet.mockResolvedValue({
        exists: true,
        data: () => flashcardData,
      });

      mockBatchCommit.mockResolvedValue();

      mockWhere.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [
            { data: () => ({ knowledgeScore: 50 }) },
            { data: () => ({ knowledgeScore: 60 }) },
          ],
        }),
      });

      mockUpdate.mockResolvedValue();

      // Simulate correct answer with high confidence
      const result = await updateFlashcardScore(flashcardId, true, 0.9);

      expect(result.newScore).toBeGreaterThan(50);
      expect(result.scoreDelta).toBeGreaterThan(0);
      expect(result.reviewCount).toBe(6);
      expect(result.correctCount).toBe(4);
      expect(mockBatchCommit).toHaveBeenCalled();
    });

    it('should decrease score for incorrect answers', async () => {
      const flashcardId = 'fc1';
      const flashcardData = {
        knowledgeScore: 70,
        reviewCount: 10,
        correctCount: 8,
        incorrectCount: 2,
        moduleId: 'mod1',
      };

      mockGet.mockResolvedValue({
        exists: true,
        data: () => flashcardData,
      });

      mockBatchCommit.mockResolvedValue();

      mockWhere.mockReturnValue({
        get: jest.fn().mockResolvedValue({ docs: [] }),
      });

      mockUpdate.mockResolvedValue();

      const result = await updateFlashcardScore(flashcardId, false, 0.8);

      expect(result.newScore).toBeLessThan(70);
      expect(result.scoreDelta).toBeLessThan(0);
      expect(result.incorrectCount).toBe(3);
    });

    it('should enforce score bounds in quiz flow', async () => {
      // Test minimum bound
      const flashcardLow = {
        knowledgeScore: 5,
        reviewCount: 1,
        correctCount: 0,
        incorrectCount: 1,
        moduleId: 'mod1',
      };

      mockGet.mockResolvedValue({
        exists: true,
        data: () => flashcardLow,
      });

      mockBatchCommit.mockResolvedValue();
      mockWhere.mockReturnValue({
        get: jest.fn().mockResolvedValue({ docs: [] }),
      });
      mockUpdate.mockResolvedValue();

      const resultLow = await updateFlashcardScore('fc1', false, 1.0);

      expect(resultLow.newScore).toBe(0);

      // Test maximum bound
      const flashcardHigh = {
        knowledgeScore: 98,
        reviewCount: 20,
        correctCount: 19,
        incorrectCount: 1,
        moduleId: 'mod1',
      };

      mockGet.mockResolvedValue({
        exists: true,
        data: () => flashcardHigh,
      });

      const resultHigh = await updateFlashcardScore('fc2', true, 1.0);

      expect(resultHigh.newScore).toBe(100);
    });
  });

  describe('Score → Module Aggregate Flow', () => {
    it('should update module aggregate when flashcard scores change', async () => {
      const moduleId = 'mod1';
      const flashcards = [
        { knowledgeScore: 80 },
        { knowledgeScore: 60 },
        { knowledgeScore: 70 },
      ];

      mockWhere.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: flashcards.map((fc) => ({ data: () => fc })),
        }),
      });

      mockUpdate.mockResolvedValue();

      const result = await recalculateModuleAggregate(moduleId);

      expect(result.aggregateScore).toBe(70);
      expect(result.flashcardCount).toBe(3);
      expect(mockUpdate).toHaveBeenCalledWith({
        aggregateKnowledgeScore: 70,
        flashcardCount: 3,
        updatedAt: expect.any(Date),
      });
    });

    it('should handle empty module aggregate calculation', async () => {
      mockWhere.mockReturnValue({
        get: jest.fn().mockResolvedValue({ docs: [] }),
      });

      mockUpdate.mockResolvedValue();

      const result = await recalculateModuleAggregate('mod1');

      expect(result.aggregateScore).toBe(0);
      expect(result.flashcardCount).toBe(0);
    });
  });

  describe('Auth → User Preferences Flow', () => {
    it('should create user with default preferences on first login', async () => {
      const user = {
        id: 'user123',
        email: 'new@example.com',
        name: 'New User',
      };

      mockGet.mockResolvedValue({ exists: false });
      mockAdd.mockResolvedValue();
      mockUpdate.mockResolvedValue();

      const result = await upsertUser(user);

      expect(result.preferences).toEqual({
        quizType: 'voice',
        speechRate: 1.0,
        theme: 'light',
      });
    });

    it('should retrieve user preferences with defaults fallback', async () => {
      // User exists with preferences
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          preferences: {
            quizType: 'image',
            speechRate: 1.5,
            theme: 'dark',
          },
        }),
      });

      const prefs = await getUserPreferences('user123');

      expect(prefs.quizType).toBe('image');
      expect(prefs.speechRate).toBe(1.5);
      expect(prefs.theme).toBe('dark');

      // User doesn't exist
      mockGet.mockResolvedValue({ exists: false });

      const defaultPrefs = await getUserPreferences('nonexistent');

      expect(defaultPrefs.quizType).toBe('voice');
      expect(defaultPrefs.speechRate).toBe(1.0);
      expect(defaultPrefs.theme).toBe('light');
    });
  });

  describe('Score Calculation Edge Cases', () => {
    it('should handle boundary score calculations', () => {
      // Test all confidence levels
      for (let conf = 0; conf <= 1; conf += 0.1) {
        const correctDelta = calculateScoreDelta(conf, true);
        const incorrectDelta = calculateScoreDelta(conf, false);

        expect(correctDelta).toBeGreaterThan(0);
        expect(correctDelta).toBeLessThanOrEqual(10);
        expect(incorrectDelta).toBeLessThan(0);
        expect(incorrectDelta).toBeGreaterThanOrEqual(-10);
        expect(correctDelta).toBe(-incorrectDelta);
      }
    });

    it('should correctly apply deltas with bounds', () => {
      // From 0, can only go up
      const fromZero = applyScoreDelta(0, -5);
      expect(fromZero.newScore).toBe(0);
      expect(fromZero.appliedDelta).toBe(0);

      // From 100, can only go down
      const fromHundred = applyScoreDelta(100, 5);
      expect(fromHundred.newScore).toBe(100);
      expect(fromHundred.appliedDelta).toBe(0);

      // Normal case
      const normal = applyScoreDelta(50, 10);
      expect(normal.newScore).toBe(60);
      expect(normal.appliedDelta).toBe(10);
    });
  });

  describe('Classification with Existing Modules', () => {
    it('should track new modules during batch classification', async () => {
      const flashcards = [
        { question: 'Q1 about biology?', answer: 'A1' },
        { question: 'Q2 about biology?', answer: 'A2' },
      ];

      // First card creates new module
      mockGenerateObject
        .mockResolvedValueOnce({
          object: {
            moduleName: 'Biology',
            action: 'new',
            confidence: 0.9,
            reason: 'New biology topic',
          },
        })
        // Second card should match the newly created module
        .mockResolvedValueOnce({
          object: {
            moduleName: 'Biology',
            action: 'existing',
            confidence: 0.85,
            reason: 'Matches existing module',
          },
        });

      const existingModules = [];
      const results = [];

      for (const card of flashcards) {
        const result = await classifyFlashcard(card, existingModules.map((m) => m.name));
        results.push(result);

        if (result.success && result.assignment.action === 'new') {
          existingModules.push({ name: result.assignment.moduleName });
        }
      }

      expect(results[0].assignment.action).toBe('new');
      expect(results[1].assignment.action).toBe('existing');
    });
  });

  describe('Error Recovery Flows', () => {
    it('should handle classification failure gracefully', async () => {
      mockGenerateObject.mockRejectedValue(new Error('API error'));

      const result = await classifyFlashcard({
        question: 'Test?',
        answer: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle score update for missing flashcard', async () => {
      mockGet.mockResolvedValue({ exists: false });

      await expect(updateFlashcardScore('nonexistent', true, 0.8))
        .rejects.toThrow('Flashcard nonexistent not found');
    });
  });
});
