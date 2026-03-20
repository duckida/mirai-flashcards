/**
 * Flashcard Service
 *
 * Handles image upload, scanning, and flashcard saving operations.
 * Communicates with the backend API for the full upload-to-flashcard pipeline.
 */

const apiClient = require('./apiClient');

class FlashcardService {
  /**
   * Upload and scan an image in one step
   * @param {File} file - The image file to upload
   * @param {string} userId - The user ID
   * @param {number} confidenceThreshold - Minimum confidence for extraction (0-1)
   * @param {Function} onProgress - Progress callback (0-100)
   * @returns {Promise<Object>} - { success, upload, scan, message }
   */
  async uploadAndScan(file, userId, confidenceThreshold = 0.5, onProgress) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);
    formData.append('confidenceThreshold', String(confidenceThreshold));

    const url = `${apiClient.baseUrl}/api/flashcards/upload-and-scan`;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      });

      xhr.addEventListener('load', () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data);
          } else {
            reject(new Error(data.error || 'Upload and scan failed'));
          }
        } catch (err) {
          reject(new Error('Invalid response from server'));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload was cancelled'));
      });

      xhr.open('POST', url);
      xhr.withCredentials = true;
      xhr.send(formData);
    });
  }

  /**
   * Upload an image file to storage
   * @param {File} file - The image file
   * @param {string} userId - The user ID
   * @param {Function} onProgress - Progress callback (0-100)
   * @returns {Promise<Object>} - { success, url, fileName, message }
   */
  async uploadImage(file, userId, onProgress) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);

    const url = `${apiClient.baseUrl}/api/flashcards/upload`;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      });

      xhr.addEventListener('load', () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data);
          } else {
            reject(new Error(data.error || 'Upload failed'));
          }
        } catch (err) {
          reject(new Error('Invalid response from server'));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload was cancelled'));
      });

      xhr.open('POST', url);
      xhr.withCredentials = true;
      xhr.send(formData);
    });
  }

  /**
   * Scan an uploaded image for flashcards
   * @param {string} imageUrl - URL of the uploaded image
   * @param {number} confidenceThreshold - Minimum confidence (0-1)
   * @returns {Promise<Object>} - { success, flashcards, stats, validation }
   */
  async scanImage(imageUrl, confidenceThreshold = 0.5) {
    return apiClient.post('/api/flashcards/scan', {
      imageUrl,
      confidenceThreshold,
    });
  }

  /**
   * Save confirmed flashcards to the user's account
   * @param {string} userId - The user ID
   * @param {Array} flashcards - Array of { question, answer, sourceImageUrl, confidence }
   * @param {string} [moduleId] - Optional module ID to assign all flashcards to
   * @returns {Promise<Object>} - { success, flashcards, moduleAssignments, message }
   */
  async saveFlashcards(userId, flashcards, moduleId) {
    const body = { userId, flashcards };
    if (moduleId) {
      body.moduleId = moduleId;
    }
    return apiClient.post('/api/flashcards', body);
  }

  /**
   * Get flashcards for a specific module
   * @param {string} moduleId - The module ID
   * @returns {Promise<Object>} - { success, flashcards }
   */
  async getModuleFlashcards(moduleId) {
    return apiClient.get(`/api/flashcards/${moduleId}`);
  }
}

const flashcardService = new FlashcardService();

module.exports = flashcardService;
module.exports.FlashcardService = FlashcardService;
