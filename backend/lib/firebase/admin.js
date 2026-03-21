import admin from 'firebase-admin';
import dotenv from 'dotenv';

// Load environment variables from .env.local in development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.local' });
}

// Initialize Firebase Admin SDK
let adminApp;

/**
 * Initialize Firebase Admin SDK with service account credentials
 * @returns {admin.app.App} Firebase Admin app instance
 * @throws {Error} If FIREBASE_SERVICE_ACCOUNT_JSON is not set or invalid
 */
export function initializeAdmin() {
  if (adminApp) {
    return adminApp;
  }
  
  if (admin.apps.length > 0) {
    adminApp = admin.apps[0];
    return adminApp;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!serviceAccountJson) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set. ' +
      'Please configure Firebase credentials in your environment.'
    );
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch (error) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON. ' +
      'Please ensure the environment variable contains valid JSON.'
    );
  }

  // Validate required fields
  const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
  const missingFields = requiredFields.filter(field => !serviceAccount[field]);

  if (missingFields.length > 0) {
    throw new Error(
      `FIREBASE_SERVICE_ACCOUNT_JSON is missing required fields: ${missingFields.join(', ')}`
    );
  }

  adminApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });

  return adminApp;
}

/**
 * Get Firestore database instance
 * @returns {admin.firestore.Firestore} Firestore database instance
 */
export function getFirestore() {
  const app = initializeAdmin();
  return admin.firestore(app);
}

/**
 * Get Firebase Authentication instance
 * @returns {admin.auth.Auth} Firebase Auth instance
 */
export function getAuth() {
  const app = initializeAdmin();
  return admin.auth(app);
}

/**
 * Get Firebase Storage instance
 * @returns {admin.storage.Storage} Firebase Storage instance
 */
export function getStorage() {
  const app = initializeAdmin();
  return admin.storage(app);
}

export default {
  initializeAdmin,
  getFirestore,
  getAuth,
  getStorage,
};
