import { initializeAdmin } from './admin.js';

let remoteConfigClient;

/**
 * Get Firebase Remote Config client instance.
 * Lazily initializes on first access.
 * @returns {import('firebase-admin').remoteConfig.RemoteConfig}
 */
export function getRemoteConfig() {
  if (remoteConfigClient) {
    return remoteConfigClient;
  }

  const app = initializeAdmin();
  remoteConfigClient = app.remoteConfig();
  return remoteConfigClient;
}

/**
 * Check if Firebase Remote Config is enabled via environment variable.
 * @returns {boolean}
 */
export function isRemoteConfigEnabled() {
  return process.env.FIREBASE_REMOTE_CONFIG_ENABLED === 'true';
}

/**
 * Fetch provider configuration from Remote Config.
 * @returns {Promise<Object>} Parsed configuration object
 */
export async function fetchProviderConfig() {
  const rc = getRemoteConfig();
  const template = await rc.getTemplate();

  const providerSelection =
    template.parameters?.voice_provider_selection?.defaultValue?.value || 'elevenlabs';
  const fallbackProvider =
    template.parameters?.voice_provider_fallback?.defaultValue?.value || 'elevenlabs';
  const cacheTTL =
    parseInt(template.parameters?.voice_config_cache_ttl_seconds?.defaultValue?.value || '3600', 10);

  return {
    provider: providerSelection,
    fallback: fallbackProvider,
    cacheTTL: cacheTTL * 1000,
  };
}
