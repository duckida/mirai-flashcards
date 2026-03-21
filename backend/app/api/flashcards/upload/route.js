/**
 * POST /api/flashcards/upload
 * Handles image uploads for flashcard scanning
 */

import { uploadImage, validateImageFile } from '@/lib/services/uploadService';
import { apiHandler } from '@/lib/api/middleware.js';
import { errorResponse, successResponse } from '@/lib/api/errorHandler.js';

/**
 * POST handler for image upload
 * Expects multipart/form-data with:
 * - file: The image file to upload
 * - userId: The user ID (from auth session)
 */
export const POST = apiHandler(async (request) => {
  const formData = await request.formData();
  const file = formData.get('file');
  const userId = formData.get('userId');

  if (!file) {
    return errorResponse('No file provided', 400);
  }

  if (!userId) {
    return errorResponse('User ID is required', 400);
  }

  // Validate file format and size
  const validation = validateImageFile(file);
  if (!validation.isValid) {
    return errorResponse(validation.error, 400);
  }

  const result = await uploadImage(file, userId);

  if (!result.success) {
    return errorResponse(result.error, 500);
  }

  return successResponse({
    url: result.url,
    fileName: result.fileName,
  }, 'Image uploaded successfully');
});
