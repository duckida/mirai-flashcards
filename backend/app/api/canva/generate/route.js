/**
 * POST /api/canva/generate
 * Generate a Canva presentation for a topic or flashcard.
 * Uses Civic Auth token from session to invoke Canva MCP tools via Civic Hub.
 */

import { getFirestore } from '@/lib/firebase/admin.js';
import { generatePresentation } from '@/lib/services/canvaService';
import { apiHandler } from '@/lib/api/middleware.js';
import { errorResponse, successResponse } from '@/lib/api/errorHandler.js';

const db = getFirestore();

export const POST = apiHandler(async (request) => {
  const { topic, moduleId, userId } = await request.json();

  if (!topic) {
    return errorResponse('Topic is required', 400);
  }

  // Try to get Civic Auth token from cookies
  // The Civic Auth middleware sets cookies that contain the auth session
  let civicAuthToken = null;
  
  // First try: get from authorization header if frontend sends it
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    civicAuthToken = authHeader.slice(7);
  }

  // Second try: get tokens from Civic Auth session cookies
  if (!civicAuthToken) {
    try {
      // Dynamic import to avoid errors if not available
      const { getTokens } = await import('@civic/auth/nextjs');
      const tokens = await getTokens();
      civicAuthToken = tokens?.accessToken;
      console.log('Civic tokens result:', civicAuthToken ? 'Token found' : 'No token');
    } catch (err) {
      console.warn('Failed to get Civic tokens:', err.message);
    }
  }

  // Third try: extract token from cookies directly
  if (!civicAuthToken) {
    try {
      const cookies = request.headers.get('cookie') || '';
      // Civic Auth stores tokens in cookies with a specific pattern
      // Look for civic auth session cookie
      const sessionMatch = cookies.match(/civic-auth-[^=]+=(.*?)(?:;|$)/);
      if (sessionMatch) {
        try {
          const sessionData = JSON.parse(decodeURIComponent(sessionMatch[1]));
          civicAuthToken = sessionData?.accessToken;
          console.log('Token from cookie:', civicAuthToken ? 'Found' : 'Not found');
        } catch {
          // Cookie might not be JSON, skip
        }
      }
    } catch (err) {
      console.warn('Failed to extract token from cookies:', err.message);
    }
  }

  const effectiveUserId = userId || 'anonymous';

  // Try to generate presentation with whatever we have
  try {
    // If we have a token, use it to call Canva MCP
    if (civicAuthToken) {
      const presentationData = await generatePresentation(topic, civicAuthToken, moduleId);

      const presentationRef = db.collection('presentations').doc(presentationData.designId);
      await presentationRef.set({
        userId: effectiveUserId,
        topic,
        moduleId: moduleId || null,
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
    } else {
      // No token - generate a mock design ID and redirect to Canva to create manually
      const designId = `fl-${Date.now()}`;
      
      // Still save to Firestore for tracking
      const presentationRef = db.collection('presentations').doc(designId);
      await presentationRef.set({
        userId: effectiveUserId,
        topic,
        moduleId: moduleId || null,
        designId,
        editUrl: null,
        viewUrl: null,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'pending_auth',
      });

      return successResponse({
        designId,
        editUrl: 'https://www.canva.com/designs/create',
        viewUrl: null,
        message: 'Civic Auth token not available. Open Canva to create your presentation manually.',
      });
    }
  } catch (err) {
    console.error('Canva presentation generation error:', err);
    return errorResponse(`Failed to generate presentation: ${err.message}`, 500);
  }
});
