/**
 * POST /api/flashcards/upload
 * Handles image uploads for flashcard scanning
 */

import { uploadImage, validateImageFile } from '@/lib/services/uploadService';

/**
 * POST handler for image upload
 * Expects multipart/form-data with:
 * - file: The image file to upload
 * - userId: The user ID (from auth session)
 */
export async function POST(request) {
  try {
    // Get the form data
    const formData = await request.formData();
    const file = formData.get('file');
    const userId = formData.get('userId');

    // Validate inputs
    if (!file) {
      return Response.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!userId) {
      return Response.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Validate file format and size
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      return Response.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Upload the file
    const result = await uploadImage(file, userId);

    if (!result.success) {
      return Response.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return Response.json(
      {
        success: true,
        url: result.url,
        fileName: result.fileName,
        message: 'Image uploaded successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Upload endpoint error:', error);
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS(request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
