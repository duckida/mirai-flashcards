/**
 * POST /api/canva/generate
 * Generate a Canva presentation for a topic or flashcard.
 * Uses Civic Auth token from session to invoke Canva MCP tools via Civic Hub.
 */

import { getFirestore } from '@/lib/firebase/admin.js';
import { generatePresentation } from '@/lib/services/canvaService';
import { getTokens } from '@civic/auth/nextjs';
import { apiHandler } from '@/lib/api/middleware.js';
import { errorResponse, successResponse } from '@/lib/api/errorHandler.js';

const db = getFirestore();

export const POST = apiHandler(async (request) => {
  const userId = request.headers.get('x-user-id');
  const tokens = await getTokens();
  const civicAuthToken = tokens?.accessToken;

  if (!userId || !civicAuthToken) {
    return errorResponse('Unauthorized', 401);
  }

  const { topic, flashcardId } = await request.json();

  if (!topic) {
    return errorResponse('Topic is required', 400);
  }

  const presentationData = await generatePresentation(topic, civicAuthToken, flashcardId);

  const presentationRef = db.collection('presentations').doc(presentationData.designId);
  await presentationRef.set({
    userId,
    topic,
    flashcardId: flashcardId || null,
    designId: presentationData.designId,
    editUrl: presentationData.editUrl,
    viewUrl: presentationData.viewUrl,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  return successResponse({
    designId: presentationData.designId,
    editUrl: presentationData.editUrl,
    viewUrl: presentationData.viewUrl,
  });
});
