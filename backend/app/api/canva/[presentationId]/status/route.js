/**
 * GET /api/canva/[designId]/status
 * Get design details and links.
 * Uses Civic Auth token to fetch design information from Canva MCP.
 */

import { getFirestore } from '@/lib/firebase/admin.js';
import { getDesignDetails } from '@/lib/services/canvaService';
import { getTokens } from '@civic/auth/nextjs';
import { apiHandler } from '@/lib/api/middleware.js';
import { errorResponse, successResponse } from '@/lib/api/errorHandler.js';

const db = getFirestore();

export const GET = apiHandler(async (request, { params }) => {
  const userId = request.headers.get('x-user-id');
  const tokens = await getTokens();
  const civicAuthToken = tokens?.accessToken;

  if (!userId || !civicAuthToken) {
    return errorResponse('Unauthorized', 401);
  }

  const { designId } = params;

  const presentationRef = db.collection('presentations').doc(designId);
  const presentationDoc = await presentationRef.get();

  if (!presentationDoc.exists) {
    return errorResponse('Design not found', 404);
  }

  const presentationData = presentationDoc.data();
  if (presentationData.userId !== userId) {
    return errorResponse('Forbidden', 403);
  }

  const designDetails = await getDesignDetails(designId, civicAuthToken);

  return successResponse({
    designId: designDetails.designId,
    title: designDetails.title,
    editUrl: designDetails.editUrl,
    viewUrl: designDetails.viewUrl,
  });
});
