import { apiClient } from './apiClient'

export const voiceService = {
  async getSignedUrl() {
    const data = await apiClient.get('/api/quiz/speech-token')
    return data.signedUrl
  },
}
