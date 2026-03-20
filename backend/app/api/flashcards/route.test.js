/**
 * Tests for Flashcards API Route
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock Firebase admin
const mockAdd = jest.fn();
const mockGet = jest.fn();
const mockUpdate = jest.fn();
const mockWhere = jest.fn();
const mockDoc = {
  get: mockGet,
  update: mockUpdate,
};

const mockCollection = {
  add: mockAdd,
  doc: jest.fn(() => mockDoc),
  where: mockWhere,
};

const mockFirestore = {
  collection: jest.fn(() => mockCollection),
};

jest.mock('@/lib/firebase/admin.js', () => ({
  getFirestore: () => mockFirestore,
}));

// Mock classifier service
const mockFindMatchingModule = jest.fn();

jest.mock('@/lib/services/classifierService', () => ({
  findMatchingModule: mockFindMatchingModule,
}));

import { POST, OPTIONS } from './flashcards/route';

describe('Flashcards API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFirestore.collection.mockReturnValue(mockCollection);
    mockCollection.doc.mockReturnValue(mockDoc);
  });

  describe('POST /api/flashcards', () => {
    it('should return 400 when userId is missing', async () => {
      const request = new Request('http://localhost/api/flashcards', {
        method: 'POST',
        body: JSON.stringify({
          flashcards: [{ question: 'Q?', answer: 'A' }],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('User ID is required');
    });

    it('should return 400 when flashcards array is empty', async () => {
      const request = new Request('http://localhost/api/flashcards', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user123',
          flashcards: [],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('At least one flashcard is required');
    });

    it('should return 400 when flashcard question is empty', async () => {
      const request = new Request('http://localhost/api/flashcards', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user123',
          flashcards: [{ question: '', answer: 'Answer' }],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Question is required');
    });

    it('should return 400 when flashcard answer is empty', async () => {
      const request = new Request('http://localhost/api/flashcards', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user123',
          flashcards: [{ question: 'Question?', answer: '' }],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Answer is required');
    });

    it('should save flashcards to specified module', async () => {
      const moduleId = 'mod123';
      const userId = 'user123';
      const flashcards = [
        { question: 'Q1?', answer: 'A1' },
        { question: 'Q2?', answer: 'A2' },
      ];

      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ name: 'Test Module', flashcardCount: 0 }),
      });

      mockAdd.mockResolvedValue({ id: 'fc1' });

      mockWhere.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [],
        }),
      });

      mockUpdate.mockResolvedValue();

      const request = new Request('http://localhost/api/flashcards', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          moduleId,
          flashcards,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.flashcards).toHaveLength(2);
      expect(mockAdd).toHaveBeenCalledTimes(2);
    });

    it('should return 404 when specified module does not exist', async () => {
      mockGet.mockResolvedValue({ exists: false });

      const request = new Request('http://localhost/api/flashcards', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user123',
          moduleId: 'nonexistent',
          flashcards: [{ question: 'Q?', answer: 'A' }],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Specified module not found');
    });

    it('should classify flashcards when no moduleId is provided', async () => {
      const userId = 'user123';
      const flashcards = [{ question: 'What is DNA?', answer: 'Deoxyribonucleic acid' }];

      // Mock existing modules query
      mockWhere.mockReturnValue({
        get: jest.fn().mockResolvedValue({
          docs: [
            {
              id: 'mod1',
              data: () => ({ name: 'Biology', flashcardCount: 5 }),
            },
          ],
        }),
      });

      // Mock classifier
      mockFindMatchingModule.mockResolvedValue({
        moduleId: 'mod1',
        moduleName: 'Biology',
        confidence: 0.9,
        shouldCreateNew: false,
      });

      mockAdd.mockResolvedValue({ id: 'fc1' });
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ name: 'Biology', flashcardCount: 5 }),
      });
      mockUpdate.mockResolvedValue();

      const request = new Request('http://localhost/api/flashcards', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          flashcards,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(mockFindMatchingModule).toHaveBeenCalled();
    });

    it('should create new module when classifier suggests it', async () => {
      const userId = 'user123';
      const flashcards = [{ question: 'What is quantum computing?', answer: 'Computing using quantum mechanics' }];

      // Mock no existing modules
      mockWhere.mockReturnValue({
        get: jest.fn().mockResolvedValue({ docs: [] }),
      });

      mockAdd
        .mockResolvedValueOnce({ id: 'mod1' }) // New module
        .mockResolvedValueOnce({ id: 'fc1' }); // New flashcard

      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ name: 'Computer Science', flashcardCount: 0 }),
      });
      mockUpdate.mockResolvedValue();

      const request = new Request('http://localhost/api/flashcards', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          flashcards,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(mockAdd).toHaveBeenCalledTimes(2); // Module + flashcard
    });

    it('should handle server errors gracefully', async () => {
      const request = new Request('http://localhost/api/flashcards', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user123',
          flashcards: [{ question: 'Q?', answer: 'A' }],
        }),
      });

      // Mock Firestore to throw an error
      mockWhere.mockReturnValue({
        get: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  describe('OPTIONS /api/flashcards', () => {
    it('should return CORS headers', async () => {
      const response = await OPTIONS();

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });
  });
});
