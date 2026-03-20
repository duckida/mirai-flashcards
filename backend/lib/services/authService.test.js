/**
 * Tests for Auth Service
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock the Firebase admin module
const mockFirestore = {
  collection: jest.fn(),
};

const mockDoc = {
  get: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
};

const mockCollection = {
  doc: jest.fn(() => mockDoc),
};

mockFirestore.collection.mockReturnValue(mockCollection);

jest.mock('../firebase/admin.js', () => ({
  getFirestore: () => mockFirestore,
}));

import { upsertUser, getUser, updateUserPreferences, getUserPreferences } from './authService';

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFirestore.collection.mockReturnValue(mockCollection);
    mockCollection.doc.mockReturnValue(mockDoc);
  });

  describe('upsertUser', () => {
    it('should create a new user when user does not exist', async () => {
      const user = {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/pic.jpg',
      };

      mockDoc.get.mockResolvedValue({ exists: false });
      mockDoc.set.mockResolvedValue();
      mockDoc.update.mockResolvedValue();

      const result = await upsertUser(user);

      expect(mockFirestore.collection).toHaveBeenCalledWith('users');
      expect(mockCollection.doc).toHaveBeenCalledWith('user123');
      expect(mockDoc.set).toHaveBeenCalled();
      expect(result).toMatchObject({
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/pic.jpg',
      });
      expect(result.preferences).toEqual({
        quizType: 'voice',
        speechRate: 1.0,
        theme: 'light',
      });
    });

    it('should update an existing user', async () => {
      const user = {
        id: 'user123',
        email: 'updated@example.com',
        name: 'Updated User',
      };

      const existingData = {
        email: 'old@example.com',
        name: 'Old Name',
        picture: 'https://example.com/old.jpg',
        preferences: { quizType: 'image', speechRate: 1.5, theme: 'dark' },
      };

      mockDoc.get
        .mockResolvedValueOnce({ exists: true, data: () => existingData, id: 'user123' })
        .mockResolvedValueOnce({
          exists: true,
          id: 'user123',
          data: () => ({ ...existingData, ...user }),
        });
      mockDoc.update.mockResolvedValue();

      const result = await upsertUser(user);

      expect(mockDoc.update).toHaveBeenCalled();
      expect(result.email).toBe('updated@example.com');
    });

    it('should preserve existing data when updating with partial data', async () => {
      const user = {
        id: 'user123',
        email: 'test@example.com',
      };

      const existingData = {
        email: 'old@example.com',
        name: 'Existing Name',
        picture: 'https://example.com/pic.jpg',
      };

      mockDoc.get
        .mockResolvedValueOnce({ exists: true, data: () => existingData, id: 'user123' })
        .mockResolvedValueOnce({
          exists: true,
          id: 'user123',
          data: () => ({ ...existingData, email: user.email }),
        });
      mockDoc.update.mockResolvedValue();

      const result = await upsertUser(user);

      expect(result.name).toBe('Existing Name');
    });
  });

  describe('getUser', () => {
    it('should return user when exists', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'user123',
        data: () => userData,
      });

      const result = await getUser('user123');

      expect(mockFirestore.collection).toHaveBeenCalledWith('users');
      expect(mockCollection.doc).toHaveBeenCalledWith('user123');
      expect(result).toEqual({
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
      });
    });

    it('should return null when user does not exist', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });

      const result = await getUser('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateUserPreferences', () => {
    it('should update user preferences', async () => {
      const preferences = {
        quizType: 'image',
        speechRate: 1.5,
        theme: 'dark',
      };

      const updatedData = {
        email: 'test@example.com',
        name: 'Test User',
        preferences,
      };

      mockDoc.update.mockResolvedValue();
      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'user123',
        data: () => updatedData,
      });

      const result = await updateUserPreferences('user123', preferences);

      expect(mockDoc.update).toHaveBeenCalledWith({
        preferences,
        updatedAt: expect.any(Date),
      });
      expect(result.preferences).toEqual(preferences);
    });
  });

  describe('getUserPreferences', () => {
    it('should return user preferences when user exists', async () => {
      const preferences = {
        quizType: 'image',
        speechRate: 1.2,
        theme: 'dark',
      };

      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'user123',
        data: () => ({ preferences }),
      });

      const result = await getUserPreferences('user123');

      expect(result).toEqual(preferences);
    });

    it('should return default preferences when user does not exist', async () => {
      mockDoc.get.mockResolvedValue({ exists: false });

      const result = await getUserPreferences('nonexistent');

      expect(result).toEqual({
        quizType: 'voice',
        speechRate: 1.0,
        theme: 'light',
      });
    });

    it('should return default preferences when user has no preferences', async () => {
      mockDoc.get.mockResolvedValue({
        exists: true,
        id: 'user123',
        data: () => ({}),
      });

      const result = await getUserPreferences('user123');

      expect(result).toEqual({
        quizType: 'voice',
        speechRate: 1.0,
        theme: 'light',
      });
    });
  });
});
