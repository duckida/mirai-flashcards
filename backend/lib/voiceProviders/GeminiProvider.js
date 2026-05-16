import { VoiceProvider } from './VoiceProvider.js';

let lastValidated = null;
let isValidCache = null;
const CACHE_TTL = 300000;

export class GeminiProvider extends VoiceProvider {
  constructor(apiKey, projectId) {
    super();
    this.apiKey = apiKey;
    this.projectId = projectId;
  }

  getName() {
    return 'gemini';
  }

  async getSignedUrl() {
    return '/api/quiz/gemini-live';
  }

  getCapabilities() {
    return {
      supportsFeedback: false,
      supportsMute: true,
      supportsContextualUpdates: true,
    };
  }

  async validateCredentials() {
    if (!this.apiKey) {
      return false;
    }
    if (lastValidated && Date.now() - lastValidated < CACHE_TTL) {
      return isValidCache;
    }
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash?key=${this.apiKey}`,
        { method: 'GET' }
      );
      isValidCache = response.ok;
      lastValidated = Date.now();
      return isValidCache;
    } catch (error) {
      isValidCache = false;
      lastValidated = Date.now();
      return false;
    }
  }

  getFrontendConfig() {
    return {
      provider: 'gemini',
      connectionType: 'websocket',
      clientLibrary: null,
      model: 'gemini-3.1-flash-live-preview',
    };
  }
}
