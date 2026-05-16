import { apiClient } from './apiClient'
import { compressImage } from './imageCompression'

export const flashcardService = {
  async uploadAndScan(file, userId, confidenceThreshold = 0.5, onProgress) {
    let uploadFile = file
    try {
      const result = await compressImage(file)
      uploadFile = result.file
    } catch (error) {
      console.warn('Image compression failed, uploading original:', error.message)
    }
    
    const formData = new FormData()
    formData.append('file', uploadFile)
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

  async uploadImage(file) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('userId', 'crop-upload')
    return apiClient.upload('/api/flashcards/upload', formData)
  },

  async getAllUserFlashcards(userId) {
    const data = await apiClient.get(`/api/flashcards/all?userId=${userId}`)
    return data.flashcards || []
  },
}
