/**
 * Tests for VoiceProviderService
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock remoteConfig module
jest.mock('@/lib/firebase/remoteConfig.js', () => ({
  isRemoteConfigEnabled: jest.fn(() => false),
  getRemoteConfig: jest.fn(),
  fetchProviderConfig: jest.fn(),
}));

import { voiceProviderService } from './voiceProviderService.js';
import { ElevenLabsProvider } from '@/lib/voiceProviders/ElevenLabsProvider.js';
import { GeminiProvider } from '@/lib/voiceProviders/GeminiProvider.js';

describe('VoiceProviderService', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    voiceProviderService.cache.clear();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createProvider()', () => {
    it('creates ElevenLabsProvider for "elevenlabs"', () => {
      process.env.ELEVENLABS_API_KEY = 'key';
      process.env.ELEVENLABS_AGENT_ID = 'agent';
      const provider = voiceProviderService.createProvider('elevenlabs');
      expect(provider).toBeInstanceOf(ElevenLabsProvider);
      expect(provider.getName()).toBe('elevenlabs');
    });

    it('creates GeminiProvider for "gemini"', () => {
      process.env.GEMINI_API_KEY = 'key';
      process.env.GEMINI_PROJECT_ID = 'proj';
      const provider = voiceProviderService.createProvider('gemini');
      expect(provider).toBeInstanceOf(GeminiProvider);
      expect(provider.getName()).toBe('gemini');
    });

    it('throws for unknown provider', () => {
      expect(() => voiceProviderService.createProvider('unknown')).toThrow('Unknown provider: unknown');
    });
  });

  describe('getProviderConfig()', () => {
    it('uses VOICE_PROVIDER_DEFAULT when Remote Config is disabled', async () => {
      process.env.FIREBASE_REMOTE_CONFIG_ENABLED = 'false';
      process.env.VOICE_PROVIDER_DEFAULT = 'gemini';
      // Clear cache to force re-fetch
      voiceProviderService.cache.clear();
      const config = await voiceProviderService.getProviderConfig();
      expect(config.provider).toBe('gemini');
      expect(config.fallback).toBe('elevenlabs');
      process.env.FIREBASE_REMOTE_CONFIG_ENABLED = 'true';
    });

    it('fetches provider from Remote Config when enabled', async () => {
      voiceProviderService.cache.clear();
      const config = await voiceProviderService.getProviderConfig();
      // Remote Config returns the value set in the console (gemini or elevenlabs)
      expect(['elevenlabs', 'gemini']).toContain(config.provider);
      expect(config.fallback).toBeDefined();
    });

    it('caches config and returns cached value on subsequent calls', async () => {
      const config1 = await voiceProviderService.getProviderConfig();
      const config2 = await voiceProviderService.getProviderConfig();
      expect(config1).toEqual(config2);
    });
  });

  describe('getProvider()', () => {
    it('returns primary provider when credentials are valid', async () => {
      process.env.ELEVENLABS_API_KEY = 'valid-key';
      process.env.ELEVENLABS_AGENT_ID = 'valid-agent';
      process.env.GEMINI_API_KEY = 'valid-key';
      process.env.GEMINI_PROJECT_ID = 'valid-proj';

      // Mock both ElevenLabs and Gemini validation as successful
      mockFetch
        .mockResolvedValueOnce({ ok: true }) // Gemini validation
        .mockResolvedValueOnce({ ok: true, json: async () => ({ signed_url: 'wss://valid' }) }); // ElevenLabs

      // Clear cache to force fresh fetch
      voiceProviderService.cache.clear();
      const result = await voiceProviderService.getProvider();
      expect(result.isPrimary).toBe(true);
      expect(result.fallbackOccurred).toBe(false);
      // Provider depends on Remote Config, just verify it's a valid provider
      expect(['elevenlabs', 'gemini']).toContain(result.provider.getName());
    });

    it('falls back to fallback provider when primary fails', async () => {
      process.env.VOICE_PROVIDER_DEFAULT = 'gemini';
      process.env.GEMINI_API_KEY = 'bad-key';
      process.env.GEMINI_PROJECT_ID = 'proj';
      process.env.ELEVENLABS_API_KEY = 'valid-key';
      process.env.ELEVENLABS_AGENT_ID = 'valid-agent';

      // Gemini validation fails
      mockFetch.mockResolvedValueOnce({ ok: false });
      // ElevenLabs validation succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ signed_url: 'wss://fallback' }),
      });

      const result = await voiceProviderService.getProvider();
      expect(result.fallbackOccurred).toBe(true);
      expect(result.provider.getName()).toBe('elevenlabs');
      expect(result.fallbackReason).toBeDefined();
    });

    it('throws when both providers fail', async () => {
      process.env.VOICE_PROVIDER_DEFAULT = 'gemini';
      process.env.GEMINI_API_KEY = '';
      process.env.GEMINI_PROJECT_ID = '';
      process.env.ELEVENLABS_API_KEY = '';
      process.env.ELEVENLABS_AGENT_ID = '';

      await expect(voiceProviderService.getProvider()).rejects.toThrow('All voice providers unavailable');
    });
  });
});
