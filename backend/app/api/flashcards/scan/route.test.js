/**
 * Tests for the scan endpoint
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { POST, GET } from './route';

// Mock the scanner service
jest.mock('@/lib/services/scannerService', () => ({
  processImage: jest.fn()
}));

import { processImage } from '@/lib/services/scannerService';

describe('POST /api/flashcards/scan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should extract flashcards from image URL', async () => {
    const mockFlashcards = [
      { question: 'What is the capital of France?', answer: 'Paris', confidence: 0.9 },
      { question: 'What is 2+2?', answer: '4', confidence: 0.8 }
    ];

    processImage.mockResolvedValue({
      success: true,
      flashcards: mockFlashcards,
      stats: { averageConfidence: 0.85 }
    });

    const request = new Request('http://localhost:3000/api/flashcards/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: 'https://example.com/image.jpg',
        confidenceThreshold: 0.5
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.flashcards).toHaveLength(2);
  });

  it('should return 400 for missing imageUrl', async () => {
    const request = new Request('http://localhost:3000/api/flashcards/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('should handle scanner service errors', async () => {
    processImage.mockRejectedValue(new Error('AI service unavailable'));

    const request = new Request('http://localhost:3000/api/flashcards/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: 'https://example.com/image.jpg'
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
  });
});

describe('GET /api/flashcards/scan', () => {
  it('should return service status', async () => {
    const request = new Request('http://localhost:3000/api/flashcards/scan', {
      method: 'GET'
    });

    const response = await GET(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.service).toBe('flashcard-scanner');
    expect(data).toHaveProperty('status');
  });
});