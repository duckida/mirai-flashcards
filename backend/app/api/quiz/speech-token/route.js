/**
 * GET /api/quiz/speech-token
 * Returns a signed URL for ElevenLabs Agents WebSocket connection.
 * Requires ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID env vars.
 * This route is called from the frontend to get a token for the voice agent.
 */
import { apiHandler } from '@/lib/api/middleware.js';
import { errorResponse, successResponse } from '@/lib/api/errorHandler.js';

export const GET = apiHandler(async () => {
  const agentId = process.env.ELEVENLABS_AGENT_ID;

  if (!agentId) {
    return errorResponse('ELEVENLABS_AGENT_ID is not configured', 500);
  }

  if (!process.env.ELEVENLABS_API_KEY) {
    return errorResponse('ELEVENLABS_API_KEY is not configured', 500);
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('ElevenLabs signed URL error:', response.status, errText);
      return errorResponse(`Failed to get signed URL from ElevenLabs: ${response.statusText}`, 500);
    }

    const body = await response.json();
    return successResponse({ signedUrl: body.signed_url });
  } catch (err) {
    console.error('Error fetching signed URL:', err);
    return errorResponse('Failed to obtain voice agent session URL', 500);
  }
});
