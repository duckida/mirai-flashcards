/**
 * Upload Service
 * Handles image uploads to Vercel Storage with validation
 */

const ALLOWED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB in bytes
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

/**
 * Validates image file format and size
 * @param {File} file - The file to validate
 * @returns {Object} - { isValid: boolean, error?: string }
 */
function validateImageFile(file) {
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds 20MB limit. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    };
  }

  // Check MIME type
  if (!ALLOWED_FORMATS.includes(file.type)) {
    return {
      isValid: false,
      error: `Unsupported image format. Allowed formats: JPEG, PNG, WEBP. Received: ${file.type}`,
    };
  }

  // Check file extension as additional validation
  const fileName = file.name.toLowerCase();
  const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
  if (!hasValidExtension) {
    return {
      isValid: false,
      error: `Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

  return { isValid: true };
}

/**
 * Generates a unique filename for storage
 * @param {string} originalFileName - Original file name
 * @param {string} userId - User ID for organization
 * @returns {string} - Unique filename
 */
function generateStorageFileName(originalFileName, userId) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = originalFileName.substring(originalFileName.lastIndexOf('.'));
  return `uploads/${userId}/${timestamp}-${random}${ext}`;
}

/**
 * Uploads an image file to Vercel Storage
 * @param {File} file - The file to upload
 * @param {string} userId - User ID for organization
 * @returns {Promise<Object>} - { success: boolean, url?: string, error?: string }
 */
async function uploadImage(file, userId) {
  try {
    // Validate file
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    // Import Vercel Blob dynamically to avoid issues in non-Vercel environments
    let put;
    try {
      const vercelBlob = await import('@vercel/blob');
      put = vercelBlob.put;
    } catch (err) {
      return {
        success: false,
        error: 'Vercel Storage is not configured. Please set up Vercel Blob Storage.',
      };
    }

    // Generate unique filename
    const fileName = generateStorageFileName(file.name, userId);

    // Upload to Vercel Storage
    const blob = await put(fileName, file, {
      access: 'public',
      contentType: file.type,
    });

    return {
      success: true,
      url: blob.url,
      fileName: blob.pathname,
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: `Upload failed: ${error.message}`,
    };
  }
}

/**
 * Validates multiple files for batch upload
 * @param {File[]} files - Array of files to validate
 * @returns {Object} - { valid: File[], invalid: Array<{file: File, error: string}> }
 */
function validateBatchFiles(files) {
  const valid = [];
  const invalid = [];

  files.forEach((file) => {
    const validation = validateImageFile(file);
    if (validation.isValid) {
      valid.push(file);
    } else {
      invalid.push({ file, error: validation.error });
    }
  });

  return { valid, invalid };
}

export {
  uploadImage,
  validateImageFile,
  validateBatchFiles,
  generateStorageFileName,
  ALLOWED_FORMATS,
  MAX_FILE_SIZE,
  ALLOWED_EXTENSIONS,
};
