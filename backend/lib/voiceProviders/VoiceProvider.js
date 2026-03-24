/**
 * Base class for voice providers.
 * All provider adapters must extend this class and implement all methods.
 */
export class VoiceProvider {
  /** @returns {string} Provider identifier */
  getName() {
    throw new Error('Not implemented');
  }

  /** @returns {Promise<string>} Signed URL or WebSocket endpoint */
  async getSignedUrl() {
    throw new Error('Not implemented');
  }

  /** @returns {Object} Capability flags */
  getCapabilities() {
    return {
      supportsFeedback: false,
      supportsMute: false,
      supportsContextualUpdates: false,
    };
  }

  /** @returns {Promise<boolean>} True if credentials are valid */
  async validateCredentials() {
    throw new Error('Not implemented');
  }

  /** @returns {Object} Frontend configuration */
  getFrontendConfig() {
    throw new Error('Not implemented');
  }
}
