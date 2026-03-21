import { apiClient } from './apiClient'

export const moduleService = {
  async getModules(userId) {
    const data = await apiClient.get(`/api/modules?userId=${userId}`)
    return { success: true, modules: data.modules || [] }
  },

  async getModuleFlashcards(moduleId) {
    const [moduleData, flashcardsData] = await Promise.all([
      apiClient.get(`/api/modules/${moduleId}`),
      apiClient.get(`/api/flashcards/${moduleId}`),
    ])
    return {
      success: true,
      module: moduleData.module,
      flashcards: flashcardsData.flashcards || [],
    }
  },

  async createModule(userId, name, color) {
    return apiClient.post('/api/modules', { userId, name, color })
  },
}
