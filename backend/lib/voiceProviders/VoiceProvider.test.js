/**
 * Tests for VoiceProvider base class
 */
import { describe, it, expect } from '@jest/globals';
import { VoiceProvider } from './VoiceProvider.js';

describe('VoiceProvider', () => {
  it('getName() throws Not implemented', async () => {
    const provider = new VoiceProvider();
    expect(() => provider.getName()).toThrow('Not implemented');
  });

  it('getSignedUrl() throws Not implemented', async () => {
    const provider = new VoiceProvider();
    await expect(provider.getSignedUrl()).rejects.toThrow('Not implemented');
  });

  it('validateCredentials() throws Not implemented', async () => {
    const provider = new VoiceProvider();
    await expect(provider.validateCredentials()).rejects.toThrow('Not implemented');
  });

  it('getFrontendConfig() throws Not implemented', () => {
    const provider = new VoiceProvider();
    expect(() => provider.getFrontendConfig()).toThrow('Not implemented');
  });

  it('getCapabilities() returns default capability flags', () => {
    const provider = new VoiceProvider();
    const caps = provider.getCapabilities();
    expect(caps).toEqual({
      supportsFeedback: false,
      supportsMute: false,
      supportsContextualUpdates: false,
    });
  });
});
