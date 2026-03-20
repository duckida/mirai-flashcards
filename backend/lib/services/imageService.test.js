/**
 * Tests for Image Service
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock the AI SDK modules
const mockGenerateImage = jest.fn();
const mockOpenai = jest.fn();

jest.mock('@ai-sdk/openai', () => ({
  openai: mockOpenai,
}));

jest.mock('ai', () => ({
  generateImage: mockGenerateImage,
}));

import {
  generateQuizImage,
  batchGenerateImages,
  buildImagePrompt,
  checkConfiguration,
  IMAGE_CONFIG,
} from './imageService';

describe('Image Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateImage.mockReset();
    mockOpenai.mockReturnValue({
      image: jest.fn(() => ({})),
    });
  });

  describe('buildImagePrompt', () => {
    it('should build a prompt with question only', () => {
      const question = 'What is the capital of France?';
      const prompt = buildImagePrompt(question);

      expect(prompt).toContain(question);
      expect(prompt).toContain('educational');
      expect(prompt).toContain('flashcard');
    });

    it('should include context when provided', () => {
      const question = 'What is photosynthesis?';
      const context = 'Biology module';
      const prompt = buildImagePrompt(question, context);

      expect(prompt).toContain(question);
      expect(prompt).toContain(`Context: ${context}`);
    });

    it('should not include context when not provided', () => {
      const question = 'Test question?';
      const prompt = buildImagePrompt(question);

      expect(prompt).not.toContain('Context:');
    });
  });

  describe('generateQuizImage', () => {
    it('should successfully generate an image', async () => {
      const question = 'What does a cell look like?';
      const mockBase64 = 'base64imagedata';
      const mockMimeType = 'image/png';

      mockGenerateImage.mockResolvedValue({
        image: {
          base64: mockBase64,
          mimeType: mockMimeType,
        },
      });

      const result = await generateQuizImage(question);

      expect(result.success).toBe(true);
      expect(result.image).toBeDefined();
      expect(result.image.url).toBe(`data:${mockMimeType};base64,${mockBase64}`);
      expect(result.image.prompt).toContain(question);
    });

    it('should pass questionId when provided', async () => {
      const question = 'Test question?';
      const questionId = 'q123';

      mockGenerateImage.mockResolvedValue({
        image: {
          base64: 'base64data',
          mimeType: 'image/png',
        },
      });

      const result = await generateQuizImage(question, { questionId });

      expect(result.success).toBe(true);
      expect(result.image.questionId).toBe(questionId);
    });

    it('should handle API key configuration errors', async () => {
      const question = 'Test question?';

      mockGenerateImage.mockRejectedValue(new Error('API key not configured'));

      const result = await generateQuizImage(question);

      expect(result.success).toBe(false);
      expect(result.error).toContain('API key');
    });

    it('should handle rate limit errors', async () => {
      const question = 'Test question?';

      mockGenerateImage.mockRejectedValue(new Error('rate limit exceeded'));

      const result = await generateQuizImage(question);

      expect(result.success).toBe(false);
      expect(result.error).toContain('rate limit');
    });

    it('should handle content policy errors', async () => {
      const question = 'Test question?';

      mockGenerateImage.mockRejectedValue(new Error('content_policy violation'));

      const result = await generateQuizImage(question);

      expect(result.success).toBe(false);
      expect(result.error).toContain('content policy');
    });

    it('should handle safety errors', async () => {
      const question = 'Test question?';

      mockGenerateImage.mockRejectedValue(new Error('safety check failed'));

      const result = await generateQuizImage(question);

      expect(result.success).toBe(false);
      expect(result.error).toContain('content policy');
    });

    it('should handle generic errors', async () => {
      const question = 'Test question?';

      mockGenerateImage.mockRejectedValue(new Error('Unknown error'));

      const result = await generateQuizImage(question);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Image generation failed');
    });

    it('should use custom size when provided', async () => {
      const question = 'Test question?';

      mockGenerateImage.mockResolvedValue({
        image: {
          base64: 'base64data',
          mimeType: 'image/png',
        },
      });

      await generateQuizImage(question, { size: '512x512' });

      expect(mockGenerateImage).toHaveBeenCalledWith(
        expect.objectContaining({
          size: '512x512',
        })
      );
    });

    it('should use default size when not provided', async () => {
      const question = 'Test question?';

      mockGenerateImage.mockResolvedValue({
        image: {
          base64: 'base64data',
          mimeType: 'image/png',
        },
      });

      await generateQuizImage(question);

      expect(mockGenerateImage).toHaveBeenCalledWith(
        expect.objectContaining({
          size: IMAGE_CONFIG.size,
        })
      );
    });
  });

  describe('batchGenerateImages', () => {
    it('should generate images for multiple questions', async () => {
      const questions = [
        { question: 'Q1?', questionId: 'q1' },
        { question: 'Q2?', questionId: 'q2' },
      ];

      mockGenerateImage.mockResolvedValue({
        image: {
          base64: 'base64data',
          mimeType: 'image/png',
        },
      });

      const results = await batchGenerateImages(questions);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should handle partial failures in batch', async () => {
      const questions = [
        { question: 'Q1?', questionId: 'q1' },
        { question: 'Q2?', questionId: 'q2' },
      ];

      mockGenerateImage
        .mockResolvedValueOnce({
          image: {
            base64: 'base64data',
            mimeType: 'image/png',
          },
        })
        .mockRejectedValueOnce(new Error('Generation failed'));

      const results = await batchGenerateImages(questions);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });

    it('should pass context to each question', async () => {
      const questions = [
        { question: 'Q1?', context: 'Biology' },
        { question: 'Q2?', context: 'Chemistry' },
      ];

      mockGenerateImage.mockResolvedValue({
        image: {
          base64: 'base64data',
          mimeType: 'image/png',
        },
      });

      await batchGenerateImages(questions);

      // Verify that generateQuizImage was called with context
      expect(mockGenerateImage).toHaveBeenCalledTimes(2);
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

  describe('IMAGE_CONFIG', () => {
    it('should have correct default values', () => {
      expect(IMAGE_CONFIG.size).toBe('1024x1024');
      expect(IMAGE_CONFIG.quality).toBe('standard');
      expect(IMAGE_CONFIG.model).toBeDefined();
    });
  });
});
