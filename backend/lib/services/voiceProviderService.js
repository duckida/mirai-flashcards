import { ElevenLabsProvider, GeminiProvider } from '@/lib/voiceProviders/index.js';
import {
  isRemoteConfigEnabled,
  fetchProviderConfig,
} from '@/lib/firebase/remoteConfig.js';

/**
 * Service for managing voice provider selection, caching, and fallback.
 */
class VoiceProviderService {
  constructor() {
    /** @type {Map<string, {config: Object, timestamp: number}>} */
    this.cache = new Map();
    this.cacheTTL = 3600000; // 1 hour default
  }

  /**
   * Get provider configuration — from Remote Config if enabled, otherwise from env/default.
   * @param {string|null} userId
   * @returns {Promise<{provider: string, fallback: string, cacheTTL: number}>}
   */
  async getProviderConfig(userId = null) {
    const cacheKey = `voice_provider_config_${userId || 'default'}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      console.log('[VoiceProvider] Cache hit', { cacheKey });
      return cached.config;
    }

    if (isRemoteConfigEnabled()) {
      console.log('[VoiceProvider] Cache miss — fetching from Remote Config', { cacheKey });
      const rcConfig = await fetchProviderConfig();

      if (rcConfig) {
        this.cacheTTL = rcConfig.cacheTTL;
        this.cache.set(cacheKey, { config: rcConfig, timestamp: Date.now() });
        console.log('[VoiceProvider] Remote Config fetch successful', {
          provider: rcConfig.provider,
          fallback: rcConfig.fallback,
        });
        return rcConfig;
      }

      // Remote Config failed but we have stale cache
      if (cached) {
        console.warn('[VoiceProvider] Remote Config failed, using stale cache');
        return cached.config;
      }
    }

    // Remote Config disabled or unavailable — use defaults
    const config = this._getDefaultConfig();
    this.cache.set(cacheKey, { config, timestamp: Date.now() });
    return config;
  }

  _getDefaultConfig() {
    return {
      provider: process.env.VOICE_PROVIDER_DEFAULT || 'gemini',
      fallback: 'elevenlabs',
      cacheTTL: this.cacheTTL,
    };
  }

  /**
   * Create a provider instance by name.
   * @param {string} providerName
   * @returns {import('@/lib/voiceProviders/VoiceProvider.js').VoiceProvider}
   */
  createProvider(providerName) {
    switch (providerName) {
      case 'elevenlabs':
        return new ElevenLabsProvider(
          process.env.ELEVENLABS_API_KEY,
          process.env.ELEVENLABS_AGENT_ID
        );
      case 'gemini':
        return new GeminiProvider(process.env.GEMINI_API_KEY, process.env.GEMINI_PROJECT_ID);
      default:
        throw new Error(`Unknown provider: ${providerName}`);
    }
  }

  /**
   * Get a working provider with automatic fallback.
   * @param {string|null} userId
   * @returns {Promise<{provider: import('@/lib/voiceProviders/VoiceProvider.js').VoiceProvider, isPrimary: boolean, fallbackOccurred: boolean, fallbackReason?: string}>}
   */
  async getProvider(userId = null) {
    const config = await this.getProviderConfig(userId);

    try {
      const provider = this.createProvider(config.provider);
      const isValid = await provider.validateCredentials();

      if (isValid) {
        console.log('[VoiceProvider] Using primary provider', {
          provider: config.provider,
          userId,
        });
        return { provider, isPrimary: true, fallbackOccurred: false };
      }

      throw new Error(`Provider ${config.provider} credentials invalid`);
    } catch (error) {
      console.error(`[VoiceProvider] Primary provider ${config.provider} failed:`, {
        error: error.message,
        userId,
      });

      // Attempt fallback
      try {
        const fallbackName = config.fallback || 'elevenlabs';
        if (fallbackName === config.provider) {
          throw error;
        }

        const fallbackProvider = this.createProvider(fallbackName);
        const isValid = await fallbackProvider.validateCredentials();

        if (isValid) {
          console.warn('[VoiceProvider] Falling back to provider', {
            provider: fallbackName,
            reason: error.message,
            userId,
          });
          return {
            provider: fallbackProvider,
            isPrimary: false,
            fallbackOccurred: true,
            fallbackReason: error.message,
          };
        }

        throw new Error(`Fallback provider ${fallbackName} credentials invalid`);
      } catch (fallbackError) {
        console.error('[VoiceProvider] All voice providers unavailable', {
          primary: config.provider,
          fallback: config.fallback,
          primaryError: error.message,
          fallbackError: fallbackError.message,
          userId,
        });
        throw new Error('All voice providers unavailable');
      }
    }
  }
}

export const voiceProviderService = new VoiceProviderService();
