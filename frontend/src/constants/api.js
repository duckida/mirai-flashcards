/**
 * Application Constants
 *
 * Central configuration for API endpoints, messages, and app settings.
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    SESSION: '/api/auth/session',
  },
  USER: {
    PROFILE: '/api/user',
  },
  FLASHCARDS: {
    UPLOAD: '/api/flashcards/upload',
    LIST: (moduleId) => `/api/flashcards/${moduleId}`,
    CREATE: '/api/flashcards',
    UPDATE: (id) => `/api/flashcards/${id}`,
    DELETE: (id) => `/api/flashcards/${id}`,
  },
  MODULES: {
    LIST: '/api/modules',
    CREATE: '/api/modules',
    GET: (id) => `/api/modules/${id}`,
    UPDATE: (id) => `/api/modules/${id}`,
  },
  QUIZ: {
    START: '/api/quiz/start',
    QUESTION: (sessionId) => `/api/quiz/${sessionId}/question`,
    ANSWER: (sessionId) => `/api/quiz/${sessionId}/answer`,
    END: (sessionId) => `/api/quiz/${sessionId}/end`,
    SUMMARY: (sessionId) => `/api/quiz/${sessionId}/summary`,
  },
  CANVA: {
    GENERATE: '/api/canva/generate',
    STATUS: (id) => `/api/canva/${id}/status`,
    LINK: (id) => `/api/canva/${id}/link`,
  },
};

const MESSAGES = {
  AUTH: {
    LOGIN_FAILED: 'Sign in failed. Please try again.',
    SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
    LOGOUT_FAILED: 'Sign out failed. Please try again.',
  },
  UPLOAD: {
    INVALID_FORMAT: 'Invalid file format. Please upload a JPEG, PNG, or WEBP image.',
    FILE_TOO_LARGE: 'File is too large. Maximum size is 20MB.',
    UPLOAD_FAILED: 'Upload failed. Please try again.',
  },
  QUIZ: {
    SESSION_START_FAILED: 'Failed to start quiz session. Please try again.',
    ANSWER_SUBMIT_FAILED: 'Failed to submit answer. Please try again.',
    CONNECTION_LOST: 'Connection lost. Attempting to reconnect...',
  },
};

const QUIZ_TYPES = {
  VOICE: 'voice',
  IMAGE: 'image',
  MIXED: 'mixed',
};

const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
};

module.exports = {
  API_BASE_URL,
  API_ENDPOINTS,
  MESSAGES,
  QUIZ_TYPES,
  THEMES,
};
