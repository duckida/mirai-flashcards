/**
 * Tests for GeminiProvider
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { GeminiProvider } from './GeminiProvider.js';
import { VoiceProvider } from './VoiceProvider.js';

describe('GeminiProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('extends VoiceProvider', () => {
    const provider = new GeminiProvider('key', 'project');
    expect(provider).toBeInstanceOf(VoiceProvider);
  });

  it('getName() returns gemini', () => {
    const provider = new GeminiProvider('key', 'project');
    expect(provider.getName()).toBe('gemini');
  });

  describe('getSignedUrl()', () => {
    it('returns API path for ephemeral token endpoint', async () => {
      const provider = new GeminiProvider('test-gemini-key', 'proj-1');
      const url = await provider.getSignedUrl();

      expect(url).toBe('/api/quiz/gemini-live');
    });
  });

  describe('getCapabilities()', () => {
    it('returns Gemini-specific capabilities', () => {
      const provider = new GeminiProvider('key', 'project');
      const caps = provider.getCapabilities();
      expect(caps).toEqual({
        supportsFeedback: false,
        supportsMute: true,
        supportsContextualUpdates: true,
      });
    });
  });

  describe('validateCredentials()', () => {
    it('returns false when apiKey is missing', async () => {
      const provider = new GeminiProvider('', 'project');
      expect(await provider.validateCredentials()).toBe(false);
    });

    it('returns false when projectId is missing', async () => {
      const provider = new GeminiProvider('key', '');
      expect(await provider.validateCredentials()).toBe(false);
    });

    it('returns true when API responds OK', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const provider = new GeminiProvider('valid-key', 'proj');
      expect(await provider.validateCredentials()).toBe(true);
    });

    it('returns false when API responds non-OK', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      const provider = new GeminiProvider('bad-key', 'proj');
      expect(await provider.validateCredentials()).toBe(false);
    });

    it('returns false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const provider = new GeminiProvider('key', 'proj');
      expect(await provider.validateCredentials()).toBe(false);
    });
  });

  describe('getFrontendConfig()', () => {
    it('returns correct frontend config', () => {
      const provider = new GeminiProvider('key', 'project');
      const config = provider.getFrontendConfig();
      expect(config).toEqual({
        provider: 'gemini',
        connectionType: 'websocket',
        clientLibrary: null,
        model: 'gemini-2.5-flash-native-audio-latest',
      });
    });
  });
});
