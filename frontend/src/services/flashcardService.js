import { apiClient } from './apiClient'

export const flashcardService = {
  uploadAndScan(file, userId, confidenceThreshold = 0.5, onProgress) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('userId', userId)
    formData.append('confidenceThreshold', confidenceThreshold.toString())
    return apiClient.upload('/api/flashcards/upload-and-scan', formData, onProgress)
  },

  async saveFlashcards(userId, flashcards) {
    return apiClient.post('/api/flashcards', { userId, flashcards })
  },

  async getModuleFlashcards(moduleId) {
    const data = await apiClient.get(`/api/flashcards/${moduleId}`)
    return { success: true, flashcards: data.flashcards || [] }
  },

  async updateFlashcard(flashcardId, updates) {
    return apiClient.patch(`/api/flashcards/${flashcardId}`, updates)
  },

  async deleteFlashcard(flashcardId) {
    return apiClient.delete(`/api/flashcards/${flashcardId}`)
  },
}
