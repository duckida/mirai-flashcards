/**
 * POST /api/flashcards/upload-and-scan
 * Combined endpoint for uploading an image, scanning it, and extracting flashcards
 */

import { uploadImage } from '@/lib/services/uploadService';
import { processImage } from '@/lib/services/scannerService';

/**
 * POST handler for combined upload and scan
 * Expects multipart form data with:
 * - file: The image file to upload
 * - userId: The user ID
 * - confidenceThreshold: Optional confidence threshold (default: 0.5)
 */
export async function POST(request) {
  try {
    // Get the form data
    const formData = await request.formData();
    const file = formData.get('file');
    const userId = formData.get('userId');
    const confidenceThreshold = parseFloat(formData.get('confidenceThreshold') || '0.5');

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

    // Upload the image to storage
    const uploadResult = await uploadImage(file, userId);
    if (!uploadResult.success) {
      return Response.json(
        { success: false, error: uploadResult.error },
        { status: 500 }
      );
    }

    // Process the uploaded image to extract flashcards
    const scanResult = await processImage(uploadResult.url, { confidenceThreshold });

    if (!scanResult.success) {
      return Response.json(
        { 
          success: false, 
          error: scanResult.error,
          uploadInfo: {
            url: uploadResult.url,
            fileName: uploadResult.fileName
          }
        },
        { status: 500 }
      );
    }

    // Return combined result
    return Response.json({
      success: true,
      upload: {
        url: uploadResult.url,
        fileName: uploadResult.fileName
      },
      scan: {
        flashcards: scanResult.flashcards,
        stats: scanResult.stats,
        validation: scanResult.validation
      },
      message: `Successfully uploaded and scanned image. Extracted ${scanResult.flashcards?.length || 0} flashcards.`
    });

  } catch (error) {
    console.error('Upload and scan error:', error);
    return Response.json(
      { 
        success: false, 
        error: 'Failed to process image',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}