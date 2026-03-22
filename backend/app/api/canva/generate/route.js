/**
 * POST /api/canva/generate
 * Generate a Canva presentation for a topic using Civic MCP Hub.
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

  // Get the Civic Auth token from the request
  // Try Authorization header first (frontend can send this)
  let civicAuthToken = null;
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    civicAuthToken = authHeader.slice(7);
  }

  // If not in header, try to get from Civic Auth session
  if (!civicAuthToken) {
    try {
      const { getTokens } = await import('@civic/auth/nextjs');
      const tokens = await getTokens();
      civicAuthToken = tokens?.accessToken;
    } catch (err) {
      console.log('getTokens() failed:', err.message);
    }
  }

  // Try to read from cookies directly as last resort
  if (!civicAuthToken) {
    try {
      const cookieHeader = request.headers.get('cookie') || '';
      // Log available cookies for debugging
      const cookies = cookieHeader.split(';').map(c => c.trim().split('=')[0]);
      console.log('Available cookies:', cookies);
      
      // Look for Civic Auth session cookie (varies by version)
      for (const cookieName of cookies) {
        if (cookieName.includes('civic') || cookieName.includes('auth') || cookieName.includes('session')) {
          const match = cookieHeader.match(new RegExp(`${cookieName}=([^;]+)`));
          if (match) {
            try {
              const value = decodeURIComponent(match[1]);
              // Try parsing as JSON
              const parsed = JSON.parse(value);
              if (parsed?.accessToken) {
                civicAuthToken = parsed.accessToken;
                console.log('Found token in cookie:', cookieName);
                break;
              }
            } catch {
              // Not JSON, check if it's a raw token
              if (match[1].startsWith('ey')) {
                civicAuthToken = match[1];
                break;
              }
            }
          }
        }
      }
    } catch (err) {
      console.log('Cookie parsing failed:', err.message);
    }
  }

  console.log('Civic token available:', !!civicAuthToken);

  const effectiveUserId = userId || 'anonymous';

  try {
    const presentationData = await generatePresentation(topic, civicAuthToken, moduleId);

    // Save to Firestore
    await db.collection('presentations').doc(presentationData.designId).set({
      userId: effectiveUserId,
      topic,
      moduleId: moduleId || null,
      designId: presentationData.designId,
      editUrl: presentationData.editUrl,
      viewUrl: presentationData.viewUrl,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      hasToken: !!civicAuthToken,
    });

    return successResponse({
      designId: presentationData.designId,
      editUrl: presentationData.editUrl,
      viewUrl: presentationData.viewUrl,
    });
  } catch (err) {
    console.error('Presentation generation error:', err);
    return errorResponse(`Failed to generate presentation: ${err.message}`, 500);
  }
});
