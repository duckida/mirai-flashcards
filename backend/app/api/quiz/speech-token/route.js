/**
 * GET /api/quiz/speech-token
 * Returns provider configuration and signed URL for voice session.
 * Delegates to VoiceProviderService for provider selection and fallback.
 */
import { apiHandler } from '@/lib/api/middleware.js';
import { errorResponse, successResponse } from '@/lib/api/errorHandler.js';
import { voiceProviderService } from '@/lib/services/voiceProviderService.js';

export const GET = apiHandler(async (request) => {
  try {
    const userId = request.user?.id || null;

    const { provider, isPrimary, fallbackOccurred, fallbackReason } =
      await voiceProviderService.getProvider(userId);

    const signedUrl = await provider.getSignedUrl();
    const capabilities = provider.getCapabilities();
    const frontendConfig = provider.getFrontendConfig();

    const response = {
      provider: provider.getName(),
      signedUrl,
      capabilities,
      config: frontendConfig,
      fallbackOccurred,
    };

    if (fallbackOccurred) {
      response.fallbackReason = fallbackReason;
    }

    return successResponse(response);
  } catch (error) {
    console.error('[speech-token] Error getting voice provider:', {
      error: error.message,
      stack: error.stack,
    });
    return errorResponse('Failed to initialize voice provider', 500);
  }
});
