import { apiClient } from './apiClient'
import { compressImage } from './imageCompression'

export const flashcardService = {
  async uploadAndScan(file, userId, confidenceThreshold = 0.5, onProgress) {
    // Compress image before upload
    let uploadFile = file
    try {
      console.log('Compressing image before upload...')
      const result = await compressImage(file)
      uploadFile = result.file
      console.log(`Compression complete: ${(result.compressionRatio * 100).toFixed(1)}% of original size`)
    } catch (error) {
      console.warn('Image compression failed, uploading original:', error.message)
      // Continue with original file if compression fails
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
}
