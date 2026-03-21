/**
 * POST /api/quiz/speech-token
 * Get a signed ElevenLabs conversation URL for voice quizzes with flashcard context
 */
import { apiHandler } from '@/lib/api/middleware.js';
import { errorResponse, successResponse } from '@/lib/api/errorHandler.js';

export const POST = apiHandler(async (request) => {
  const body = await request.json();
  const { content, moduleName } = body;

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;

  if (!apiKey || !agentId) {
    return errorResponse('ElevenLabs configuration missing', 500);
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
    {
      method: 'GET',
      headers: { 'xi-api-key': apiKey },
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    return errorResponse(
      `Failed to get signed URL: ${errorData.detail || response.statusText}`,
      response.status
    );
  }

  const data = await response.json();

  return successResponse({ 
    signedUrl: data.signed_url,
    context: content ? `Quiz me on this: ${content}` : `Quiz topic: ${moduleName || 'General'}`
  });
});
