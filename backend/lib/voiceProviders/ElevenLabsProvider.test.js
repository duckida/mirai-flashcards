/**
 * Tests for ElevenLabsProvider
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { ElevenLabsProvider } from './ElevenLabsProvider.js';
import { VoiceProvider } from './VoiceProvider.js';

describe('ElevenLabsProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('extends VoiceProvider', () => {
    const provider = new ElevenLabsProvider('key', 'agent');
    expect(provider).toBeInstanceOf(VoiceProvider);
  });

  it('getName() returns elevenlabs', () => {
    const provider = new ElevenLabsProvider('key', 'agent');
    expect(provider.getName()).toBe('elevenlabs');
  });

  describe('getSignedUrl()', () => {
    it('calls ElevenLabs API and returns signed_url', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ signed_url: 'wss://elevenlabs.example.com/signed' }),
      });

      const provider = new ElevenLabsProvider('test-api-key', 'test-agent-id');
      const url = await provider.getSignedUrl();

      expect(url).toBe('wss://elevenlabs.example.com/signed');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=test-agent-id',
        expect.objectContaining({
          method: 'GET',
          headers: { 'xi-api-key': 'test-api-key' },
        })
      );
    });

    it('throws on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      const provider = new ElevenLabsProvider('bad-key', 'agent');
      await expect(provider.getSignedUrl()).rejects.toThrow('ElevenLabs API error: 401');
    });
  });

  describe('getCapabilities()', () => {
    it('returns ElevenLabs-specific capabilities', () => {
      const provider = new ElevenLabsProvider('key', 'agent');
      const caps = provider.getCapabilities();
      expect(caps).toEqual({
        supportsFeedback: true,
        supportsMute: true,
        supportsContextualUpdates: true,
      });
    });
  });

  describe('validateCredentials()', () => {
    it('returns false when apiKey is missing', async () => {
      const provider = new ElevenLabsProvider('', 'agent');
      expect(await provider.validateCredentials()).toBe(false);
    });

    it('returns false when agentId is missing', async () => {
      const provider = new ElevenLabsProvider('key', '');
      expect(await provider.validateCredentials()).toBe(false);
    });

    it('returns true when credentials are valid', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ signed_url: 'wss://valid' }),
      });

      const provider = new ElevenLabsProvider('key', 'agent');
      expect(await provider.validateCredentials()).toBe(true);
    });

    it('returns false when API call fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const provider = new ElevenLabsProvider('key', 'agent');
      expect(await provider.validateCredentials()).toBe(false);
    });
  });

  describe('getFrontendConfig()', () => {
    it('returns correct frontend config', () => {
      const provider = new ElevenLabsProvider('key', 'agent');
      const config = provider.getFrontendConfig();
      expect(config).toEqual({
        provider: 'elevenlabs',
        connectionType: 'websocket',
        clientLibrary: '@elevenlabs/client',
      });
    });
  });
});
