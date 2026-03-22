import { apiClient } from './apiClient'

export const canvaService = {
  /**
   * Request a Canva presentation to be generated for a topic
   * @param {string} topic - The topic/module name to create a presentation for
   * @param {string} [moduleId] - Optional module ID for context
   * @param {string} [userId] - Optional user ID
   * @returns {Promise<{designId: string, editUrl: string, viewUrl: string}>}
   */
  async requestPresentation(topic, moduleId, userId) {
    return apiClient.post('/api/canva/generate', { topic, moduleId, userId })
  },

  /**
   * Get design details by ID
   * @param {string} designId - The Canva design ID
   * @returns {Promise<Object>} Design details
   */
  async getDesignDetails(designId) {
    return apiClient.get(`/api/canva/${designId}`)
  },
}
