import { VoiceProvider } from './VoiceProvider.js';

/**
 * Gemini 2.5 Flash Native Audio voice provider implementation.
 * Browser connects directly to Gemini Live API WebSocket.
 */
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
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash?key=${this.apiKey}`,
        { method: 'GET' }
      );
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  getFrontendConfig() {
    return {
      provider: 'gemini',
      connectionType: 'websocket',
      clientLibrary: null,
      model: 'gemini-2.5-flash-native-audio-latest',
    };
  }
}
