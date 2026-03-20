/**
 * Canva Service (Client-side)
 * 
 * Handles communication with Canva API endpoints.
 * Passes Civic Auth token from session to backend for MCP Hub authentication.
 */

import { apiClient } from './apiClient';

/**
 * Request a presentation for a topic or flashcard
 * @param {string} topic - The topic to generate presentation for
 * @param {string} civicAuthToken - Civic Auth token from session
 * @param {string} [flashcardId] - Optional flashcard ID for context
 * @returns {Promise<{designId: string, editUrl: string, viewUrl: string}>}
 */
export async function requestPresentation(topic, civicAuthToken, flashcardId = null) {
  try {
    const response = await apiClient.post(
      '/api/canva/generate',
      {
        topic,
        flashcardId,
      },
      {
        headers: {
          'x-civic-auth-token': civicAuthToken,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error requesting presentation:', error);
    throw error;
  }
}

/**
 * Get design details
 * @param {string} designId - The design ID
 * @param {string} civicAuthToken - Civic Auth token from session
 * @returns {Promise<{designId: string, title: string, editUrl: string, viewUrl: string}>}
 */
export async function getDesignDetails(designId, civicAuthToken) {
  try {
    const response = await apiClient.get(`/api/canva/${designId}`, {
      headers: {
        'x-civic-auth-token': civicAuthToken,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching design details:', error);
    throw error;
  }
}

/**
 * Export design to PDF
 * @param {string} designId - The design ID
 * @param {string} civicAuthToken - Civic Auth token from session
 * @returns {Promise<{downloadUrl: string, expiresAt: string}>}
 */
export async function exportDesignToPdf(designId, civicAuthToken) {
  try {
    const response = await apiClient.get(`/api/canva/${designId}/export`, {
      headers: {
        'x-civic-auth-token': civicAuthToken,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error exporting design to PDF:', error);
    throw error;
  }
}
