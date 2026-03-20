/**
 * Quiz Service
 *
 * Handles quiz session lifecycle: start, get questions,
 * submit answers, end session, and get summary.
 * Communicates with the backend API.
 */

const apiClient = require('./apiClient');

class QuizService {
  /**
   * Start a new quiz session
   * @param {string} userId - The user ID
   * @param {string} moduleId - The module ID to quiz on
   * @param {'voice' | 'image'} type - Quiz type
   * @param {number} [cardCount=10] - Number of cards in the quiz
   * @returns {Promise<Object>} - { success, session }
   */
  async startSession(userId, moduleId, type, cardCount = 10) {
    return apiClient.post('/api/quiz/start', {
      userId,
      moduleId,
      type,
      cardCount,
    });
  }

  /**
   * Get the next question for a quiz session
   * @param {string} sessionId - The quiz session ID
   * @returns {Promise<Object>} - { success, question } or { success, question: null } if done
   */
  async getNextQuestion(sessionId) {
    return apiClient.get(`/api/quiz/${sessionId}/question`);
  }

  /**
   * Submit an answer to a quiz question
   * @param {string} sessionId - The quiz session ID
   * @param {string} questionId - The question ID
   * @param {string} answer - The user's answer
   * @returns {Promise<Object>} - { success, result } with isCorrect, scoreChange, feedback, correctAnswer
   */
  async submitAnswer(sessionId, questionId, answer) {
    return apiClient.post(`/api/quiz/${sessionId}/answer`, {
      questionId,
      answer,
    });
  }

  /**
   * End a quiz session
   * @param {string} sessionId - The quiz session ID
   * @returns {Promise<Object>} - { success, summary }
   */
  async endSession(sessionId) {
    return apiClient.post(`/api/quiz/${sessionId}/end`, {});
  }

  /**
   * Get session summary (for completed or in-progress sessions)
   * @param {string} sessionId - The quiz session ID
   * @returns {Promise<Object>} - { success, summary }
   */
  async getSessionSummary(sessionId) {
    return apiClient.get(`/api/quiz/${sessionId}/summary`);
  }
}

const quizService = new QuizService();

module.exports = quizService;
module.exports.QuizService = QuizService;
