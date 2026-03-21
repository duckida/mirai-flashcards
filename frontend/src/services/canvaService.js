import { apiClient } from './apiClient'

export const speechService = {
  async getSignedUrl() {
    const data = await apiClient.get('/api/quiz/speech-token')
    return data.signedUrl
  },
}

export const canvaService = {
  async requestPresentation(topic) {
    return apiClient.post('/api/canva/generate', { topic })
  },

  async getDesignDetails(designId) {
    return apiClient.get(`/api/canva/${designId}`)
  },
}
