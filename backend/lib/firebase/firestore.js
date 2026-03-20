import { getFirestore } from './admin.js';

/**
 * Firestore Service Layer
 * Provides common operations for all Firestore collections
 */
export class FirestoreService {
  constructor() {
    this.db = getFirestore();
  }

  // ============================================
  // Users Collection
  // ============================================

  /**
   * Create a new user document
   * @param {string} userId - User's Civic.ai ID
   * @param {Object} userData - User data
   * @returns {Promise<void>}
   */
  async createUser(userId, userData) {
    await this.db.collection('users').doc(userId).set({
      id: userId,
      ...userData,
      createdAt: new Date(),
      lastLoginAt: new Date(),
    });
  }

  /**
   * Get user document
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} User data or null if not found
   */
  async getUser(userId) {
    const doc = await this.db.collection('users').doc(userId).get();
    return doc.exists ? doc.data() : null;
  }

  /**
   * Update user document
   * @param {string} userId - User ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<void>}
   */
  async updateUser(userId, updates) {
    await this.db.collection('users').doc(userId).update({
      ...updates,
      updatedAt: new Date(),
    });
  }

  // ============================================
  // Modules Collection
  // ============================================

  /**
   * Create a new module
   * @param {string} userId - Owner's user ID
   * @param {Object} moduleData - Module data (name, description, etc.)
   * @returns {Promise<string>} Module ID
   */
  async createModule(userId, moduleData) {
    const ref = await this.db.collection('modules').add({
      userId,
      ...moduleData,
      flashcardCount: 0,
      aggregateKnowledgeScore: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return ref.id;
  }

  /**
   * Get module by ID
   * @param {string} moduleId - Module ID
   * @returns {Promise<Object|null>} Module data or null if not found
   */
  async getModule(moduleId) {
    const doc = await this.db.collection('modules').doc(moduleId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  /**
   * Get all modules for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of module objects
   */
  async getUserModules(userId) {
    const snapshot = await this.db
      .collection('modules')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Update module
   * @param {string} moduleId - Module ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<void>}
   */
  async updateModule(moduleId, updates) {
    await this.db.collection('modules').doc(moduleId).update({
      ...updates,
      updatedAt: new Date(),
    });
  }

  /**
   * Delete module
   * @param {string} moduleId - Module ID
   * @returns {Promise<void>}
   */
  async deleteModule(moduleId) {
    await this.db.collection('modules').doc(moduleId).delete();
  }

  // ============================================
  // Flashcards Collection
  // ============================================

  /**
   * Create a new flashcard
   * @param {string} userId - Owner's user ID
   * @param {Object} flashcardData - Flashcard data (question, answer, moduleId, etc.)
   * @returns {Promise<string>} Flashcard ID
   */
  async createFlashcard(userId, flashcardData) {
    const ref = await this.db.collection('flashcards').add({
      userId,
      ...flashcardData,
      knowledgeScore: 0,
      reviewCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return ref.id;
  }

  /**
   * Get flashcard by ID
   * @param {string} flashcardId - Flashcard ID
   * @returns {Promise<Object|null>} Flashcard data or null if not found
   */
  async getFlashcard(flashcardId) {
    const doc = await this.db.collection('flashcards').doc(flashcardId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  /**
   * Get all flashcards in a module, ordered by knowledge score (ascending)
   * @param {string} moduleId - Module ID
   * @returns {Promise<Array>} Array of flashcard objects
   */
  async getModuleFlashcards(moduleId) {
    const snapshot = await this.db
      .collection('flashcards')
      .where('moduleId', '==', moduleId)
      .orderBy('knowledgeScore', 'asc')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Get flashcards for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of flashcard objects
   */
  async getUserFlashcards(userId) {
    const snapshot = await this.db
      .collection('flashcards')
      .where('userId', '==', userId)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Update flashcard
   * @param {string} flashcardId - Flashcard ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<void>}
   */
  async updateFlashcard(flashcardId, updates) {
    await this.db.collection('flashcards').doc(flashcardId).update({
      ...updates,
      updatedAt: new Date(),
    });
  }

  /**
   * Delete flashcard
   * @param {string} flashcardId - Flashcard ID
   * @returns {Promise<void>}
   */
  async deleteFlashcard(flashcardId) {
    await this.db.collection('flashcards').doc(flashcardId).delete();
  }

  /**
   * Delete all flashcards in a module
   * @param {string} moduleId - Module ID
   * @returns {Promise<number>} Number of deleted flashcards
   */
  async deleteModuleFlashcards(moduleId) {
    const flashcards = await this.getModuleFlashcards(moduleId);
    const batch = this.db.batch();
    flashcards.forEach(flashcard => {
      batch.delete(this.db.collection('flashcards').doc(flashcard.id));
    });
    await batch.commit();
    return flashcards.length;
  }

  // ============================================
  // Quiz Sessions Collection
  // ============================================

  /**
   * Create a new quiz session
   * @param {string} userId - User ID
   * @param {Object} sessionData - Session data (moduleId, type, flashcardIds, etc.)
   * @returns {Promise<string>} Session ID
   */
  async createQuizSession(userId, sessionData) {
    const ref = await this.db.collection('quiz_sessions').add({
      userId,
      ...sessionData,
      status: 'active',
      responses: [],
      scoreChanges: {},
      startedAt: new Date(),
    });
    return ref.id;
  }

  /**
   * Get quiz session by ID
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object|null>} Session data or null if not found
   */
  async getQuizSession(sessionId) {
    const doc = await this.db.collection('quiz_sessions').doc(sessionId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  /**
   * Get all quiz sessions for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of session objects
   */
  async getUserQuizSessions(userId) {
    const snapshot = await this.db
      .collection('quiz_sessions')
      .where('userId', '==', userId)
      .orderBy('startedAt', 'desc')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Update quiz session
   * @param {string} sessionId - Session ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<void>}
   */
  async updateQuizSession(sessionId, updates) {
    await this.db.collection('quiz_sessions').doc(sessionId).update(updates);
  }

  /**
   * Add response to quiz session
   * @param {string} sessionId - Session ID
   * @param {Object} response - Response object
   * @returns {Promise<void>}
   */
  async addQuizResponse(sessionId, response) {
    await this.db.collection('quiz_sessions').doc(sessionId).update({
      responses: admin.firestore.FieldValue.arrayUnion(response),
    });
  }

  // ============================================
  // Presentations Collection
  // ============================================

  /**
   * Create a new presentation
   * @param {string} userId - User ID
   * @param {Object} presentationData - Presentation data (topic, flashcardId, etc.)
   * @returns {Promise<string>} Presentation ID
   */
  async createPresentation(userId, presentationData) {
    const ref = await this.db.collection('presentations').add({
      userId,
      ...presentationData,
      status: 'pending',
      createdAt: new Date(),
    });
    return ref.id;
  }

  /**
   * Get presentation by ID
   * @param {string} presentationId - Presentation ID
   * @returns {Promise<Object|null>} Presentation data or null if not found
   */
  async getPresentation(presentationId) {
    const doc = await this.db.collection('presentations').doc(presentationId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  /**
   * Get all presentations for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of presentation objects
   */
  async getUserPresentations(userId) {
    const snapshot = await this.db
      .collection('presentations')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Update presentation
   * @param {string} presentationId - Presentation ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<void>}
   */
  async updatePresentation(presentationId, updates) {
    await this.db.collection('presentations').doc(presentationId).update(updates);
  }

  /**
   * Delete presentation
   * @param {string} presentationId - Presentation ID
   * @returns {Promise<void>}
   */
  async deletePresentation(presentationId) {
    await this.db.collection('presentations').doc(presentationId).delete();
  }

  // ============================================
  // Batch Operations
  // ============================================

  /**
   * Get a batch writer for bulk operations
   * @returns {admin.firestore.WriteBatch} Firestore batch writer
   */
  getBatch() {
    return this.db.batch();
  }

  /**
   * Commit a batch of operations
   * @param {admin.firestore.WriteBatch} batch - Batch writer
   * @returns {Promise<void>}
   */
  async commitBatch(batch) {
    await batch.commit();
  }
}

// Export singleton instance
export default new FirestoreService();
