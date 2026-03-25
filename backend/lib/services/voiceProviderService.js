import { ElevenLabsProvider, GeminiProvider } from '@/lib/voiceProviders/index.js';

/**
 * Service for managing voice provider selection and fallback.
 */
class VoiceProviderService {
  /**
   * Get provider configuration from environment variables.
   * @returns {{provider: string, fallback: string}}
   */
  getProviderConfig() {
    return {
      provider: process.env.VOICE_PROVIDER_DEFAULT || 'gemini',
      fallback: 'elevenlabs',
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
   * @returns {Promise<{provider: import('@/lib/voiceProviders/VoiceProvider.js').VoiceProvider, isPrimary: boolean, fallbackOccurred: boolean, fallbackReason?: string}>}
   */
  async getProvider() {
    const config = this.getProviderConfig();

    try {
      const provider = this.createProvider(config.provider);
      const isValid = await provider.validateCredentials();

      if (isValid) {
        console.log('[VoiceProvider] Using primary provider', { provider: config.provider });
        return { provider, isPrimary: true, fallbackOccurred: false };
      }

      throw new Error(`Provider ${config.provider} credentials invalid`);
    } catch (error) {
      console.error(`[VoiceProvider] Primary provider ${config.provider} failed:`, error.message);

      // Attempt fallback
      try {
        const fallbackName = config.fallback;
        if (fallbackName === config.provider) {
          throw error;
        }

        const fallbackProvider = this.createProvider(fallbackName);
        const isValid = await fallbackProvider.validateCredentials();

        if (isValid) {
          console.warn('[VoiceProvider] Falling back to provider', {
            provider: fallbackName,
            reason: error.message,
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
        });
        throw new Error('All voice providers unavailable');
      }
    }
  }
}

export const voiceProviderService = new VoiceProviderService();
