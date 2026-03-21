/**
 * POST /api/canva/generate
 *
 * Generate a Canva presentation for a topic or flashcard.
 * Uses Civic Auth token from session to invoke Canva MCP tools via Civic Hub.
 * Stores presentation metadata in Firestore.
 */

import { getFirestore } from '@/lib/firebase/admin.js';
import { generatePresentation } from '@/lib/services/canvaService';
import { getTokens } from '@civic/auth/nextjs';

const db = getFirestore();

export async function POST(request) {
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

    const { topic, flashcardId } = await request.json();

    if (!topic) {
      return new Response(
        JSON.stringify({ error: 'Topic is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate presentation via Canva MCP (using Civic Auth token)
    const presentationData = await generatePresentation(topic, civicAuthToken, flashcardId);

    // Store presentation metadata in Firestore
    const presentationRef = db.collection('presentations').doc(presentationData.designId);
    await presentationRef.set({
      userId,
      topic,
      flashcardId: flashcardId || null,
      designId: presentationData.designId,
      editUrl: presentationData.editUrl,
      viewUrl: presentationData.viewUrl,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    return new Response(
      JSON.stringify({
        designId: presentationData.designId,
        editUrl: presentationData.editUrl,
        viewUrl: presentationData.viewUrl,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating presentation:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate presentation' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
