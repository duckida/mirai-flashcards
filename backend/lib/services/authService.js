/**
 * Authentication Service
 *
 * Manages user sessions and authentication state with Firestore.
 * Integrates with Civic.ai OAuth for identity verification.
 */

import { getFirestore } from '../firebase/admin.js';

const DEFAULT_PREFERENCES = {
  quizType: 'voice',
  speechRate: 1.0,
  theme: 'light',
};

/**
 * Create or update user document on login
 * @param {Object} user - User object from Civic Auth
 * @returns {Promise<Object>} User document from Firestore
 */
export async function upsertUser(user) {
  const db = getFirestore();
  const userRef = db.collection('users').doc(user.id);
  const userDoc = await userRef.get();

  if (userDoc.exists) {
    await userRef.update({
      email: user.email || userDoc.data().email,
      name: user.name || userDoc.data().name,
      picture: user.picture || userDoc.data().picture,
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    });
    const updated = await userRef.get();
    return { id: updated.id, ...updated.data() };
  }

  const newUser = {
    id: user.id,
    email: user.email || '',
    name: user.name || '',
    picture: user.picture || '',
    preferences: { ...DEFAULT_PREFERENCES },
    createdAt: new Date(),
    lastLoginAt: new Date(),
    updatedAt: new Date(),
  };

  await userRef.set(newUser);
  return newUser;
}

/**
 * Get user by ID
 * @param {string} userId - Civic Auth user ID
 * @returns {Promise<Object|null>} User document or null
 */
export async function getUser(userId) {
  const db = getFirestore();
  const userDoc = await db.collection('users').doc(userId).get();
  return userDoc.exists ? { id: userDoc.id, ...userDoc.data() } : null;
}

/**
 * Update user preferences
 * @param {string} userId - User ID
 * @param {Object} preferences - Preference fields to update
 * @returns {Promise<Object>} Updated user document
 */
export async function updateUserPreferences(userId, preferences) {
  const db = getFirestore();
  const userRef = db.collection('users').doc(userId);

  await userRef.update({
    preferences: {
      ...preferences,
    },
    updatedAt: new Date(),
  });

  const updated = await userRef.get();
  return { id: updated.id, ...updated.data() };
}

/**
 * Get user preferences
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User preferences
 */
export async function getUserPreferences(userId) {
  const user = await getUser(userId);
  return user?.preferences || { ...DEFAULT_PREFERENCES };
}

export default {
  upsertUser,
  getUser,
  updateUserPreferences,
  getUserPreferences,
};
