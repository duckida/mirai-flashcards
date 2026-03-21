/**
 * GET /api/canva/[designId]
 *
 * Get design details and links.
 * Uses Civic Auth token to fetch design information from Canva MCP.
 */

import { getFirestore } from '@/lib/firebase/admin.js';
import { getDesignDetails } from '@/lib/services/canvaService';
import { getTokens } from '@civic/auth/nextjs';

const db = getFirestore();

export async function GET(request, { params }) {
  try {
    const userId = request.headers.get('x-user-id');
    const tokens = await getTokens();
    const civicAuthToken = tokens?.accessToken;

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

    // Get design details from Canva MCP
    const designDetails = await getDesignDetails(designId, civicAuthToken);

    return new Response(
      JSON.stringify({
        designId: designDetails.designId,
        title: designDetails.title,
        editUrl: designDetails.editUrl,
        viewUrl: designDetails.viewUrl,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching design details:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to fetch design details' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
