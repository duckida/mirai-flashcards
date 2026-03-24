import { VoiceProvider } from './VoiceProvider.js';

/**
 * ElevenLabs Conversational AI voice provider implementation.
 */
export class ElevenLabsProvider extends VoiceProvider {
  constructor(apiKey, agentId) {
    super();
    this.apiKey = apiKey;
    this.agentId = agentId;
  }

  getName() {
    return 'elevenlabs';
  }

  async getSignedUrl() {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${this.agentId}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': this.apiKey,
        },
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} ${errText}`);
    }

    const body = await response.json();
    return body.signed_url;
  }

  getCapabilities() {
    return {
      supportsFeedback: true,
      supportsMute: true,
      supportsContextualUpdates: true,
    };
  }

  async validateCredentials() {
    if (!this.apiKey || !this.agentId) {
      return false;
    }
    try {
      await this.getSignedUrl();
      return true;
    } catch (error) {
      return false;
    }
  }

  getFrontendConfig() {
    return {
      provider: 'elevenlabs',
      connectionType: 'websocket',
      clientLibrary: '@elevenlabs/client',
    };
  }
}
