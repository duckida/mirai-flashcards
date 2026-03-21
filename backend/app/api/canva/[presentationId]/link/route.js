/**
 * GET /api/canva/[designId]/link
 * Export a design to PDF.
 * Uses Civic Auth token to export design from Canva MCP.
 */

import { getFirestore } from '@/lib/firebase/admin.js';
import { exportDesignToPdf } from '@/lib/services/canvaService';
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

  const { presentationId: designId } = await params;

  const presentationRef = db.collection('presentations').doc(designId);
  const presentationDoc = await presentationRef.get();

  if (!presentationDoc.exists) {
    return errorResponse('Design not found', 404);
  }

  const presentationData = presentationDoc.data();
  if (presentationData.userId !== userId) {
    return errorResponse('Forbidden', 403);
  }

  const exportData = await exportDesignToPdf(designId, civicAuthToken);

  return successResponse({
    downloadUrl: exportData.downloadUrl,
    expiresAt: exportData.expiresAt,
  });
});
