/**
 * Scoring Service
 *
 * Handles knowledge score operations via the backend scoring API.
 * Provides methods for updating scores and retrieving score history.
 */

const apiClient = require('./apiClient');

class ScoringService {
  /**
   * Update a flashcard's knowledge score
   * @param {string} flashcardId - The flashcard ID
   * @param {boolean} isCorrect - Whether the answer was correct
   * @param {number} [confidence=0.5] - Confidence value 0-1
   * @returns {Promise<Object>} - { success, newScore, scoreDelta, ... }
   */
  async updateScore(flashcardId, isCorrect, confidence = 0.5) {
    return apiClient.post(`/api/flashcards/${flashcardId}/score`, {
      isCorrect,
      confidence,
    });
  }

  /**
   * Get score statistics for a flashcard
   * @param {string} flashcardId - The flashcard ID
   * @param {boolean} [includeHistory=false] - Whether to include score history
   * @param {number} [historyLimit=50] - Max history entries
   * @returns {Promise<Object>} - { success, knowledgeScore, reviewCount, accuracy, ... }
   */
  async getStats(flashcardId, includeHistory = false, historyLimit = 50) {
    const params = new URLSearchParams();
    if (includeHistory) params.set('history', 'true');
    if (historyLimit !== 50) params.set('limit', String(historyLimit));
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get(`/api/flashcards/${flashcardId}/score${query}`);
  }

  /**
   * Get score category label
   * @param {number} score - Knowledge score (0-100)
   * @returns {string} - 'Strong', 'Moderate', or 'Weak'
   */
  getScoreCategory(score) {
    if (score >= 70) return 'Strong';
    if (score >= 40) return 'Moderate';
    return 'Weak';
  }
}

const scoringService = new ScoringService();

module.exports = scoringService;
module.exports.ScoringService = ScoringService;
