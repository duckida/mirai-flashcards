/**
 * Canva Service (Client-side)
 *
 * Handles communication with Canva API endpoints.
 * The backend extracts the Civic Auth token server-side from the session cookie.
 */

const apiClient = require('./apiClient');

/**
 * Request a presentation for a topic or flashcard
 * @param {string} topic - The topic to generate presentation for
 * @param {string} [flashcardId] - Optional flashcard ID for context
 * @returns {Promise<{designId: string, editUrl: string, viewUrl: string}>}
 */
async function requestPresentation(topic, flashcardId = null) {
  return apiClient.post('/api/canva/generate', { topic, flashcardId });
}

/**
 * Get design details
 * @param {string} designId - The design ID
 * @returns {Promise<{designId: string, title: string, editUrl: string, viewUrl: string}>}
 */
async function getDesignDetails(designId) {
  return apiClient.get(`/api/canva/${designId}`);
}

/**
 * Export design to PDF
 * @param {string} designId - The design ID
 * @returns {Promise<{downloadUrl: string, expiresAt: string}>}
 */
async function exportDesignToPdf(designId) {
  return apiClient.get(`/api/canva/${designId}`);
}

module.exports = { requestPresentation, getDesignDetails, exportDesignToPdf };
