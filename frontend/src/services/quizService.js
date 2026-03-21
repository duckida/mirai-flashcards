import { apiClient } from './apiClient'

export const quizService = {
  async startSession(userId, moduleId, type, cardCount, flashcardId) {
    return apiClient.post('/api/quiz/start', { userId, moduleId, type, cardCount, flashcardId })
  },

  async getNextQuestion(sessionId) {
    return apiClient.get(`/api/quiz/${sessionId}/question`)
  },

  async submitAnswer(sessionId, questionId, answer) {
    return apiClient.post(`/api/quiz/${sessionId}/answer`, { questionId, answer })
  },

  async endSession(sessionId) {
    return apiClient.post(`/api/quiz/${sessionId}/end`)
  },

  async getSessionSummary(sessionId) {
    return apiClient.get(`/api/quiz/${sessionId}/summary`)
  },
}
