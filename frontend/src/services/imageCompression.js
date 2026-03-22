/**
 * Image Compression Service
 * Compresses images using Canvas API before upload
 */

const DEFAULT_MAX_WIDTH = 1200;
const DEFAULT_MAX_HEIGHT = 1200;
const DEFAULT_QUALITY = 0.8;
const OUTPUT_FORMAT = 'image/jpeg';

/**
 * Compresses an image file using Canvas API
 * @param {File} file - Original image file
 * @param {Object} options - Compression options
 * @param {number} options.maxWidth - Maximum width in pixels (default: 1200)
 * @param {number} options.maxHeight - Maximum height in pixels (default: 1200)
 * @param {number} options.quality - JPEG quality 0-1 (default: 0.8)
 * @returns {Promise<{file: File, originalSize: number, compressedSize: number}>}
 */
export async function compressImage(file, options = {}) {
  const {
    maxWidth = DEFAULT_MAX_WIDTH,
    maxHeight = DEFAULT_MAX_HEIGHT,
    quality = DEFAULT_QUALITY,
  } = options;

  const originalSize = file.size;

  // Skip compression for very small files (under 100KB)
  if (originalSize < 100 * 1024) {
    console.log(`Image already small (${(originalSize / 1024).toFixed(1)}KB), skipping compression`);
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1,
    };
  }

  // Check if Canvas API is available
  if (!document || !document.createElement || !HTMLCanvasElement) {
    console.warn('Canvas API not available, skipping compression');
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1,
    };
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = () => {
      try {
        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        
        // Only downscale, never upscale
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        // Draw image to canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert canvas to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            
            // Create new file with same name but .jpg extension
            const originalName = file.name.replace(/\.[^/.]+$/, '');
            const compressedFile = new File([blob], `${originalName}.jpg`, {
              type: OUTPUT_FORMAT,
              lastModified: Date.now(),
            });
            
            const compressedSize = blob.size;
            const compressionRatio = compressedSize / originalSize;
            
            console.log(`Compressed image: ${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(compressedSize / 1024 / 1024).toFixed(2)}MB (${(compressionRatio * 100).toFixed(1)}%)`);
            
            resolve({
              file: compressedFile,
              originalSize,
              compressedSize,
              compressionRatio,
            });
          },
          OUTPUT_FORMAT,
          quality
        );
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };
    
    img.src = objectUrl;
  });
}

/**
 * Helper to format file size for display
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default {
  compressImage,
  formatFileSize,
};