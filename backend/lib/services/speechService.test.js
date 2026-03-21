/**
 * Tests for Speech Service
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SpeechService } from './speechService';

// Mock the node-fetch module
const fetchMock = jest.fn();
jest.mock('node-fetch', () => fetchMock);

describe('SpeechService', () => {
  const mockAgentId = 'test_agent_id';
  const mockApiKey = 'test_api_key';
  const mockSignedUrl = 'wss://test.signed.url';

  beforeEach(() => {
    fetchMock.mockClear();
    process.env.ELEVENLABS_API_KEY = mockApiKey;
    process.env.ELEVENLABS_AGENT_ID = mockAgentId;
  });

  afterEach(() => {
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.ELEVENLABS_AGENT_ID;
  });

  describe('getSignedUrl', () => {
    it('should fetch signed URL successfully', async () => {
      // Mock successful response
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ signed_url: mockSignedUrl })
      });

      const url = await SpeechService.getSignedUrl(mockAgentId);
      expect(url).toBe(mockSignedUrl);
      
      expect(fetchMock).toHaveBeenCalledWith(
        `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${mockAgentId}`,
        {
          method: 'GET',
          headers: {
            'xi-api-key': mockApiKey,
          },
        }
      );
    });

    it('should throw error when API key is missing', async () => {
      delete process.env.ELEVENLABS_API_KEY;
      
      await expect(SpeechService.getSignedUrl(mockAgentId))
        .rejects.toThrow('ElevenLabs API key not configured');
    });

    it('should throw error when API request fails', async () => {
      // Mock failed response
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ detail: 'Internal error' })
      });

      await expect(SpeechService.getSignedUrl(mockAgentId))
        .rejects.toThrow('Failed to get signed URL: Internal error');
    });

    it('should throw error when network fails', async () => {
      // Mock network error
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      await expect(SpeechService.getSignedUrl(mockAgentId))
        .rejects.toThrow('Network error');
    });
  });

  describe('buildConversationContext', () => {
    it('should build context with all fields', () => {
      const session = {
        id: 'session_123',
        currentQuestionIndex: 2,
        moduleName: 'Test Module',
        questionCount: 10,
        score: { correct: 5, incorrect: 3 },
        isComplete: false,
        lastFeedback: 'Good job!'
      };
      
      const flashcards = [
        { question: 'Q1', answer: 'A1' },
        { question: 'Q2', answer: 'A2' },
        { question: 'Q3', answer: 'A3' }
      ];
      
      const user = { id: 'user_123', name: 'Test User' };

      const context = SpeechService.buildConversationContext(session, flashcards, user);
      
      expect(context).toEqual({
        user_id: 'user_123',
        user_name: 'Test User',
        session_id: 'session_123',
        module_name: 'Test Module',
        current_question_index: 2,
        total_questions: 10,
        current_question: 'Q3',
        correct_answer: 'A3',
        score_correct: 5,
        score_incorrect: 3,
        is_complete: false,
        feedback: 'Good job!'
      });
    });

    it('should handle missing fields gracefully', () => {
      const session = {};
      const flashcards = [];
      const user = {};

      const context = SpeechService.buildConversationContext(session, flashcards, user);
      
      expect(context).toEqual({
        user_id: undefined,
        user_name: 'User',
        session_id: undefined,
        module_name: 'Unknown Module',
        current_question_index: 0,
        total_questions: 0,
        current_question: null,
        correct_answer: null,
        score_correct: 0,
        score_incorrect: 0,
        is_complete: false,
        feedback: null
      });
    });
  });

  describe('buildSessionOverrides', () => {
    it('should build session overrides correctly', () => {
      const moduleName = 'Test Module';
      const userName = 'Test User';
      
      const overrides = SpeechService.buildSessionOverrides(moduleName, userName);
      
      expect(overrides).toEqual({
        agent: {
          prompt: {
            prompt: `You are a helpful quiz assistant for the "${moduleName}" module. Greet the user by name (${userName}) and help them study by asking questions from their flashcards. Read questions clearly, wait for their responses, and provide encouraging feedback. Keep your responses concise and focused on the quiz.`,
          },
          first_message: `Hello ${userName}! I'm your quiz assistant for ${moduleName}. Let's start studying!`,
        }
      });
    });
  });
});