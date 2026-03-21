/**
 * POST /api/flashcards/upload-and-scan
 * Combined endpoint for uploading an image, scanning it, and extracting flashcards
 */

import { uploadImage } from '@/lib/services/uploadService';
import { processImage } from '@/lib/services/scannerService';
import { apiHandler } from '@/lib/api/middleware.js';
import { errorResponse, successResponse } from '@/lib/api/errorHandler.js';

/**
 * POST handler for combined upload and scan
 * Expects multipart form data with:
 * - file: The image file to upload
 * - userId: The user ID
 * - confidenceThreshold: Optional confidence threshold (default: 0.5)
 */
export const POST = apiHandler(async (request) => {
  const formData = await request.formData();
  const file = formData.get('file');
  const userId = formData.get('userId');
  const confidenceThreshold = parseFloat(formData.get('confidenceThreshold') || '0.5');

  if (!file) {
    return errorResponse('No file provided', 400);
  }

  if (!userId) {
    return errorResponse('User ID is required', 400);
  }

  // Upload the image to storage
  const uploadResult = await uploadImage(file, userId);
  if (!uploadResult.success) {
    return errorResponse(uploadResult.error, 500);
  }

  // Process the uploaded image to extract flashcards
  const scanResult = await processImage(uploadResult.url, { confidenceThreshold });

  if (!scanResult.success) {
    return errorResponse(scanResult.error, 500, {
      uploadInfo: { url: uploadResult.url, fileName: uploadResult.fileName },
    });
  }

  return successResponse({
    upload: { url: uploadResult.url, fileName: uploadResult.fileName },
    scan: {
      flashcards: scanResult.flashcards,
      stats: scanResult.stats,
      validation: scanResult.validation,
    },
  }, `Successfully uploaded and scanned image. Extracted ${scanResult.flashcards?.length || 0} flashcards.`);
});
