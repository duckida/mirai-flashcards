import { initializeAdmin } from './admin.js';

let remoteConfigClient = null;
let initError = null;

/**
 * Check if Firebase Remote Config is enabled via environment variable.
 * @returns {boolean}
 */
export function isRemoteConfigEnabled() {
  return process.env.FIREBASE_REMOTE_CONFIG_ENABLED === 'true';
}

/**
 * Try to get Firebase Remote Config client instance.
 * Returns null if initialization fails (graceful degradation).
 * @returns {import('firebase-admin').remoteConfig.RemoteConfig|null}
 */
export function getRemoteConfig() {
  if (initError) return null;
  if (remoteConfigClient) return remoteConfigClient;

  try {
    const app = initializeAdmin();
    remoteConfigClient = app.remoteConfig();
    return remoteConfigClient;
  } catch (error) {
    initError = error.message;
    console.warn('[RemoteConfig] Init failed:', error.message, '— falling back to defaults');
    return null;
  }
}

/**
 * Fetch provider configuration from Remote Config.
 * Returns null if Remote Config is unavailable.
 * @returns {Promise<{provider: string, fallback: string, cacheTTL: number}|null>}
 */
export async function fetchProviderConfig() {
  const rc = getRemoteConfig();
  if (!rc) return null;

  try {
    const template = await rc.getTemplate();

    const providerSelection =
      template.parameters?.voice_provider_selection?.defaultValue?.value || 'gemini';
    const fallbackProvider =
      template.parameters?.voice_provider_fallback?.defaultValue?.value || 'elevenlabs';
    const cacheTTL =
      parseInt(template.parameters?.voice_config_cache_ttl_seconds?.defaultValue?.value || '3600', 10);

    return {
      provider: providerSelection,
      fallback: fallbackProvider,
      cacheTTL: cacheTTL * 1000,
    };
  } catch (error) {
    console.warn('[RemoteConfig] Fetch failed:', error.message, '— falling back to defaults');
    return null;
  }
}
