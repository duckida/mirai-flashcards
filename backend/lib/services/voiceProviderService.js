import { ElevenLabsProvider, GeminiProvider } from '@/lib/voiceProviders/index.js';
import {
  getRemoteConfig,
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
      try {
        const rc = getRemoteConfig();
        const template = await rc.getTemplate();

        const providerSelection =
          template.parameters?.voice_provider_selection?.defaultValue?.value || 'elevenlabs';
        const fallbackProvider =
          template.parameters?.voice_provider_fallback?.defaultValue?.value || 'elevenlabs';
        const cacheTTL =
          parseInt(
            template.parameters?.voice_config_cache_ttl_seconds?.defaultValue?.value || '3600',
            10
          );

        const config = {
          provider: providerSelection,
          fallback: fallbackProvider,
          cacheTTL: cacheTTL * 1000,
        };

        this.cacheTTL = config.cacheTTL;
        this.cache.set(cacheKey, { config, timestamp: Date.now() });
        console.log('[VoiceProvider] Remote Config fetch successful', {
          provider: config.provider,
          fallback: config.fallback,
        });

        return config;
      } catch (error) {
        console.error('[VoiceProvider] Remote Config fetch failed:', error);

        // Return stale cache if available
        if (cached) {
          console.warn('[VoiceProvider] Using stale cached config due to Remote Config failure');
          return cached.config;
        }

        // Ultimate fallback
        return this._getDefaultConfig();
      }
    }

    // Remote Config disabled — use default
    const config = this._getDefaultConfig();
    this.cache.set(cacheKey, { config, timestamp: Date.now() });
    return config;
  }

  _getDefaultConfig() {
    return {
      provider: process.env.VOICE_PROVIDER_DEFAULT || 'elevenlabs',
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
        // Skip fallback if it's the same as primary
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
