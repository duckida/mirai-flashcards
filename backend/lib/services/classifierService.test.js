/**
 * Tests for Classifier Service
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock the AI SDK modules
const mockGenerateObject = jest.fn();

jest.mock('ai', () => ({
  gateway: jest.fn((model) => model),
  generateObject: mockGenerateObject,
}));

jest.mock('zod', () => ({
  z: {
    object: jest.fn(() => ({
      describe: jest.fn(() => ({})),
    })),
    string: jest.fn(() => ({
      describe: jest.fn(() => ({})),
    })),
    enum: jest.fn(() => ({
      describe: jest.fn(() => ({})),
    })),
    number: jest.fn(() => ({
      min: jest.fn(() => ({
        max: jest.fn(() => ({
          describe: jest.fn(() => ({})),
        })),
      })),
    })),
  },
}));

import {
  classifyFlashcard,
  batchClassifyFlashcards,
  findMatchingModule,
  checkConfiguration,
} from './classifierService';

describe('Classifier Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateObject.mockReset();
  });

  describe('classifyFlashcard', () => {
    it('should successfully classify a flashcard to a new module', async () => {
      const flashcard = {
        question: 'What is photosynthesis?',
        answer: 'The process by which plants convert sunlight into energy',
      };

      mockGenerateObject.mockResolvedValue({
        object: {
          moduleName: 'Biology',
          action: 'new',
          confidence: 0.9,
          reason: 'This is a biology-related question about plant processes',
        },
      });

      const result = await classifyFlashcard(flashcard);

      expect(result.success).toBe(true);
      expect(result.assignment).toMatchObject({
        moduleName: 'Biology',
        action: 'new',
        confidence: 0.9,
      });
    });

    it('should classify to an existing module', async () => {
      const flashcard = {
        question: 'What is the mitochondria?',
        answer: 'The powerhouse of the cell',
      };

      const existingModules = ['Biology', 'Chemistry', 'Physics'];

      mockGenerateObject.mockResolvedValue({
        object: {
          moduleName: 'Biology',
          action: 'existing',
          confidence: 0.85,
          reason: 'This is a cell biology question',
        },
      });

      const result = await classifyFlashcard(flashcard, existingModules);

      expect(result.success).toBe(true);
      expect(result.assignment.action).toBe('existing');
      expect(result.assignment.moduleName).toBe('Biology');
    });

    it('should clamp confidence values to 0-1 range', async () => {
      const flashcard = {
        question: 'Test question?',
        answer: 'Test answer',
      };

      mockGenerateObject.mockResolvedValue({
        object: {
          moduleName: 'Test Module',
          action: 'new',
          confidence: 1.5, // Out of range
          reason: 'Test reason',
        },
      });

      const result = await classifyFlashcard(flashcard);

      expect(result.success).toBe(true);
      expect(result.assignment.confidence).toBe(1); // Clamped to 1
    });

    it('should handle API key configuration errors', async () => {
      const flashcard = {
        question: 'Test question?',
        answer: 'Test answer',
      };

      mockGenerateObject.mockRejectedValue(new Error('API key not configured'));

      const result = await classifyFlashcard(flashcard);

      expect(result.success).toBe(false);
      expect(result.error).toContain('API key');
    });

    it('should handle rate limit errors', async () => {
      const flashcard = {
        question: 'Test question?',
        answer: 'Test answer',
      };

      mockGenerateObject.mockRejectedValue(new Error('rate limit exceeded'));

      const result = await classifyFlashcard(flashcard);

      expect(result.success).toBe(false);
      expect(result.error).toContain('rate limit');
    });

    it('should handle generic classification errors', async () => {
      const flashcard = {
        question: 'Test question?',
        answer: 'Test answer',
      };

      mockGenerateObject.mockRejectedValue(new Error('Unknown error'));

      const result = await classifyFlashcard(flashcard);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Classification failed');
    });
  });

  describe('batchClassifyFlashcards', () => {
    it('should classify multiple flashcards', async () => {
      const flashcards = [
        { question: 'Q1?', answer: 'A1' },
        { question: 'Q2?', answer: 'A2' },
      ];

      mockGenerateObject
        .mockResolvedValueOnce({
          object: {
            moduleName: 'Module A',
            action: 'new',
            confidence: 0.9,
            reason: 'Reason 1',
          },
        })
        .mockResolvedValueOnce({
          object: {
            moduleName: 'Module B',
            action: 'new',
            confidence: 0.8,
            reason: 'Reason 2',
          },
        });

      const results = await batchClassifyFlashcards(flashcards);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should update module list when new modules are created', async () => {
      const flashcards = [
        { question: 'Q1?', answer: 'A1' },
        { question: 'Q2?', answer: 'A2' },
      ];

      mockGenerateObject
        .mockResolvedValueOnce({
          object: {
            moduleName: 'Module A',
            action: 'new',
            confidence: 0.9,
            reason: 'Reason 1',
          },
        })
        .mockResolvedValueOnce({
          object: {
            moduleName: 'Module A',
            action: 'existing',
            confidence: 0.85,
            reason: 'Reason 2',
          },
        });

      const results = await batchClassifyFlashcards(flashcards);

      expect(results[1].assignment.action).toBe('existing');
    });
  });

  describe('findMatchingModule', () => {
    it('should find an existing module match', async () => {
      const flashcard = {
        question: 'What is DNA?',
        answer: 'Deoxyribonucleic acid',
      };

      const modules = [
        { id: 'mod1', name: 'Biology' },
        { id: 'mod2', name: 'Chemistry' },
      ];

      mockGenerateObject.mockResolvedValue({
        object: {
          moduleName: 'Biology',
          action: 'existing',
          confidence: 0.95,
          reason: 'DNA is a biology topic',
        },
      });

      const result = await findMatchingModule(flashcard, modules);

      expect(result.moduleId).toBe('mod1');
      expect(result.moduleName).toBe('Biology');
      expect(result.shouldCreateNew).toBe(false);
    });

    it('should suggest creating a new module when no match found', async () => {
      const flashcard = {
        question: 'What is quantum computing?',
        answer: 'Computing using quantum mechanics',
      };

      const modules = [
        { id: 'mod1', name: 'Biology' },
        { id: 'mod2', name: 'Chemistry' },
      ];

      mockGenerateObject.mockResolvedValue({
        object: {
          moduleName: 'Computer Science',
          action: 'new',
          confidence: 0.8,
          reason: 'Quantum computing is a CS topic',
        },
      });

      const result = await findMatchingModule(flashcard, modules);

      expect(result.moduleId).toBeNull();
      expect(result.moduleName).toBe('Computer Science');
      expect(result.shouldCreateNew).toBe(true);
    });

    it('should return Uncategorized on classification failure', async () => {
      const flashcard = {
        question: 'Test?',
        answer: 'Test',
      };

      const modules = [{ id: 'mod1', name: 'Module 1' }];

      mockGenerateObject.mockRejectedValue(new Error('API error'));

      const result = await findMatchingModule(flashcard, modules);

      expect(result.moduleId).toBeNull();
      expect(result.moduleName).toBe('Uncategorized');
      expect(result.shouldCreateNew).toBe(true);
    });

    it('should handle case where matched module name does not exist in list', async () => {
      const flashcard = {
        question: 'Test?',
        answer: 'Test',
      };

      const modules = [{ id: 'mod1', name: 'Existing Module' }];

      mockGenerateObject.mockResolvedValue({
        object: {
          moduleName: 'Nonexistent Module',
          action: 'existing',
          confidence: 0.9,
          reason: 'Matched module',
        },
      });

      const result = await findMatchingModule(flashcard, modules);

      expect(result.moduleId).toBeNull();
      expect(result.shouldCreateNew).toBe(true);
    });
  });

  describe('checkConfiguration', () => {
    it('should return configuration status', () => {
      const result = checkConfiguration();

      expect(result).toHaveProperty('configured');
      expect(result).toHaveProperty('model');
      expect(typeof result.configured).toBe('boolean');
      expect(typeof result.model).toBe('string');
    });
  });
});
