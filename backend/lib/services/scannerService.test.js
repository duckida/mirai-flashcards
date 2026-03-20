/**
 * Tests for Scanner Service
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { extractFlashcards, validateExtraction, filterByConfidence, processImage } from './scannerService';

// Mock the AI SDK and fetch
global.fetch = jest.fn();

describe('Scanner Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateExtraction', () => {
    it('should validate valid flashcards', () => {
      const flashcards = [
        { question: 'What is the capital of France?', answer: 'Paris', confidence: 0.9 },
        { question: 'What is 2+2?', answer: '4', confidence: 0.8 }
      ];
      
      const result = validateExtraction(flashcards);
      expect(result.isValid).toBe(true);
      expect(result.validFlashcards).toHaveLength(2);
    });

    it('should reject flashcards with empty questions or answers', () => {
      const flashcards = [
        { question: '', answer: 'Answer', confidence: 0.9 },
        { question: 'Question', answer: '', confidence: 0.8 }
      ];
      
      const result = validateExtraction(flashcards);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('filterByConfidence', () => {
    it('should filter flashcards by confidence threshold', () => {
      const flashcards = [
        { question: 'Q1', answer: 'A1', confidence: 0.9 },
        { question: 'Q2', answer: 'A2', confidence: 0.3 },
        { question: 'Q3', answer: 'A3', confidence: 0.7 }
      ];
      
      const filtered = filterByConfidence(flashcards, 0.5);
      expect(filtered).toHaveLength(2); // Only 0.9 and 0.7 should pass
    });
  });

  describe('processImage', () => {
    it('should handle API errors gracefully', async () => {
      // Mock fetch to simulate API error
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Rate limit exceeded'
      });

      const result = await processImage('https://example.com/image.jpg');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});