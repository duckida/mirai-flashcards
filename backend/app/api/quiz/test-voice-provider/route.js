/**
 * GET /api/quiz/test-voice-provider?provider=elevenlabs|gemini
 * Validates connectivity for a specified voice provider.
 * Supports query parameter to override Remote Config selection.
 */
import { apiHandler } from '@/lib/api/middleware.js';
import { errorResponse, successResponse } from '@/lib/api/errorHandler.js';
import { voiceProviderService } from '@/lib/services/voiceProviderService.js';

export const GET = apiHandler(async (request) => {
  const url = new URL(request.url);
  const providerName = url.searchParams.get('provider');

  if (!providerName || !['elevenlabs', 'gemini'].includes(providerName)) {
    return errorResponse(
      'Missing or invalid "provider" query parameter. Use ?provider=elevenlabs or ?provider=gemini',
      400
    );
  }

  try {
    const provider = voiceProviderService.createProvider(providerName);
    const start = Date.now();
    const isValid = await provider.validateCredentials();
    const latency = Date.now() - start;

    const capabilities = provider.getCapabilities();
    const frontendConfig = provider.getFrontendConfig();

    return successResponse({
      provider: provider.getName(),
      status: isValid ? 'connected' : 'credentials_invalid',
      latencyMs: latency,
      capabilities,
      config: frontendConfig,
    });
  } catch (error) {
    console.error('[test-voice-provider] Validation error:', {
      provider: providerName,
      error: error.message,
    });
    return errorResponse(`Provider validation failed: ${error.message}`, 500);
  }
});
