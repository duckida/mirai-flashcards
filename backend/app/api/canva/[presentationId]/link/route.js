/**
 * GET /api/canva/[designId]/export
 *
 * Export a design to PDF.
 * Uses Civic Auth token to export design from Canva MCP.
 */

import { getFirestore } from '@/lib/firebase/admin.js';
import { exportDesignToPdf } from '@/lib/services/canvaService';

const db = getFirestore();

export async function GET(request, { params }) {
  try {
    const userId = request.headers.get('x-user-id');
    const civicAuthToken = request.headers.get('x-civic-auth-token');

    if (!userId || !civicAuthToken) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { designId } = params;

    // Verify user owns this design
    const presentationRef = db.collection('presentations').doc(designId);
    const presentationDoc = await presentationRef.get();

    if (!presentationDoc.exists) {
      return new Response(
        JSON.stringify({ error: 'Design not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const presentationData = presentationDoc.data();
    if (presentationData.userId !== userId) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Export design to PDF via Canva MCP
    const exportData = await exportDesignToPdf(designId, civicAuthToken);

    return new Response(
      JSON.stringify({
        downloadUrl: exportData.downloadUrl,
        expiresAt: exportData.expiresAt,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error exporting design:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to export design' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
