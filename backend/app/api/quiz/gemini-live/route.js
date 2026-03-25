/**
 * GET /api/quiz/gemini-live
 * Creates a short-lived ephemeral token for Gemini Live API.
 * The token is single-use and expires after 30 minutes.
 */
import { GoogleGenAI } from '@google/genai';
import { apiHandler } from '@/lib/api/middleware.js';
import { errorResponse, successResponse } from '@/lib/api/errorHandler.js';

export const GET = apiHandler(async () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return errorResponse('GEMINI_API_KEY not configured', 500);
  }

  const model = 'gemini-2.5-flash-native-audio-preview-12-2025';

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: 'v1alpha' },
    });

    const now = new Date();
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(now.getTime() + 2 * 60 * 1000).toISOString(),
        liveConnectConstraints: {
          model,
          config: {
            responseModalities: ['AUDIO'],
          },
        },
        httpOptions: { apiVersion: 'v1alpha' },
      },
    });

    return successResponse({
      token: token.name,
      model,
    });
  } catch (err) {
    console.error('[gemini-live] Failed to create ephemeral token:', err);
    return errorResponse('Failed to create ephemeral token', 500);
  }
});
