/**
 * Module Service
 *
 * Handles module CRUD operations and flashcard retrieval by module.
 * Communicates with the backend API for module management.
 */

const apiClient = require('./apiClient');

class ModuleService {
  /**
   * Get all modules for a user
   * @param {string} userId - The user ID
   * @returns {Promise<Object>} - { success, modules }
   */
  async getModules(userId) {
    return apiClient.get(`/api/modules?userId=${encodeURIComponent(userId)}`);
  }

  /**
   * Create a new module
   * @param {string} userId - The user ID
   * @param {string} name - Module name
   * @param {string} [description] - Optional description
   * @param {string} [color] - Optional color hex
   * @returns {Promise<Object>} - { success, module, message }
   */
  async createModule(userId, name, description, color) {
    return apiClient.post('/api/modules', { userId, name, description, color });
  }

  /**
   * Get module details by ID
   * @param {string} moduleId - The module ID
   * @returns {Promise<Object>} - { success, module }
   */
  async getModule(moduleId) {
    return apiClient.get(`/api/modules/${moduleId}`);
  }

  /**
   * Update a module
   * @param {string} moduleId - The module ID
   * @param {Object} updates - Fields to update (name, description, color)
   * @returns {Promise<Object>} - { success, module, message }
   */
  async updateModule(moduleId, updates) {
    return apiClient.patch(`/api/modules/${moduleId}`, updates);
  }

  /**
   * Delete a module and all its flashcards
   * @param {string} moduleId - The module ID
   * @returns {Promise<Object>} - { success, message }
   */
  async deleteModule(moduleId) {
    return apiClient.delete(`/api/modules/${moduleId}`);
  }

  /**
   * Get all flashcards in a module
   * @param {string} moduleId - The module ID
   * @returns {Promise<Object>} - { success, module, flashcards }
   */
  async getModuleFlashcards(moduleId) {
    return apiClient.get(`/api/flashcards/${moduleId}`);
  }
}

const moduleService = new ModuleService();

module.exports = moduleService;
module.exports.ModuleService = ModuleService;
