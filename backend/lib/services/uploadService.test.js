/**
 * Tests for Upload Service
 * Unit tests for image validation and upload functionality
 */

import {
  uploadImage,
  validateImageFile,
  validateBatchFiles,
  generateStorageFileName,
  ALLOWED_FORMATS,
  MAX_FILE_SIZE,
  ALLOWED_EXTENSIONS,
} from './uploadService';

describe('uploadService', () => {
  describe('validateImageFile', () => {
    it('should accept valid JPEG files', () => {
      const file = {
        name: 'test.jpg',
        type: 'image/jpeg',
        size: 1024 * 1024, // 1MB
      };
      const result = validateImageFile(file);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept valid PNG files', () => {
      const file = {
        name: 'test.png',
        type: 'image/png',
        size: 5 * 1024 * 1024, // 5MB
      };
      const result = validateImageFile(file);
      expect(result.isValid).toBe(true);
    });

    it('should accept valid WEBP files', () => {
      const file = {
        name: 'test.webp',
        type: 'image/webp',
        size: 2 * 1024 * 1024, // 2MB
      };
      const result = validateImageFile(file);
      expect(result.isValid).toBe(true);
    });

    it('should reject files exceeding 20MB limit', () => {
      const file = {
        name: 'large.jpg',
        type: 'image/jpeg',
        size: 21 * 1024 * 1024, // 21MB
      };
      const result = validateImageFile(file);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds 20MB limit');
    });

    it('should reject unsupported file formats', () => {
      const file = {
        name: 'test.gif',
        type: 'image/gif',
        size: 1024 * 1024,
      };
      const result = validateImageFile(file);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Unsupported image format');
    });

    it('should reject files with invalid extensions', () => {
      const file = {
        name: 'test.bmp',
        type: 'image/jpeg', // Mismatch between type and extension
        size: 1024 * 1024,
      };
      const result = validateImageFile(file);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid file extension');
    });

    it('should reject null or undefined files', () => {
      const result1 = validateImageFile(null);
      expect(result1.isValid).toBe(false);
      expect(result1.error).toContain('No file provided');

      const result2 = validateImageFile(undefined);
      expect(result2.isValid).toBe(false);
    });

    it('should accept files at exactly 20MB limit', () => {
      const file = {
        name: 'max.jpg',
        type: 'image/jpeg',
        size: 20 * 1024 * 1024, // Exactly 20MB
      };
      const result = validateImageFile(file);
      expect(result.isValid).toBe(true);
    });

    it('should accept files at 1 byte', () => {
      const file = {
        name: 'tiny.jpg',
        type: 'image/jpeg',
        size: 1,
      };
      const result = validateImageFile(file);
      expect(result.isValid).toBe(true);
    });

    it('should be case-insensitive for file extensions', () => {
      const file = {
        name: 'TEST.JPG',
        type: 'image/jpeg',
        size: 1024 * 1024,
      };
      const result = validateImageFile(file);
      expect(result.isValid).toBe(true);
    });
  });

  describe('generateStorageFileName', () => {
    it('should generate a unique filename with user ID', () => {
      const fileName = generateStorageFileName('photo.jpg', 'user123');
      expect(fileName).toContain('uploads/user123/');
      expect(fileName).toContain('.jpg');
    });

    it('should preserve file extension', () => {
      const extensions = ['.jpg', '.jpeg', '.png', '.webp'];
      extensions.forEach((ext) => {
        const fileName = generateStorageFileName(`photo${ext}`, 'user123');
        expect(fileName.endsWith(ext)).toBe(true);
      });
    });

    it('should generate different filenames for same input', () => {
      const fileName1 = generateStorageFileName('photo.jpg', 'user123');
      const fileName2 = generateStorageFileName('photo.jpg', 'user123');
      expect(fileName1).not.toBe(fileName2);
    });

    it('should include timestamp in filename', () => {
      const before = Date.now();
      const fileName = generateStorageFileName('photo.jpg', 'user123');
      const after = Date.now();

      // Extract timestamp from filename (format: uploads/userId/timestamp-random.ext)
      const parts = fileName.split('/');
      const fileNamePart = parts[parts.length - 1];
      const timestamp = parseInt(fileNamePart.split('-')[0]);

      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('validateBatchFiles', () => {
    it('should separate valid and invalid files', () => {
      const files = [
        { name: 'valid1.jpg', type: 'image/jpeg', size: 1024 * 1024 },
        { name: 'valid2.png', type: 'image/png', size: 2 * 1024 * 1024 },
        { name: 'invalid.gif', type: 'image/gif', size: 1024 * 1024 },
        { name: 'toolarge.jpg', type: 'image/jpeg', size: 21 * 1024 * 1024 },
      ];

      const result = validateBatchFiles(files);
      expect(result.valid).toHaveLength(2);
      expect(result.invalid).toHaveLength(2);
    });

    it('should return empty arrays for empty input', () => {
      const result = validateBatchFiles([]);
      expect(result.valid).toHaveLength(0);
      expect(result.invalid).toHaveLength(0);
    });

    it('should include error messages for invalid files', () => {
      const files = [
        { name: 'invalid.gif', type: 'image/gif', size: 1024 * 1024 },
      ];

      const result = validateBatchFiles(files);
      expect(result.invalid[0]).toHaveProperty('file');
      expect(result.invalid[0]).toHaveProperty('error');
      expect(result.invalid[0].error).toContain('Unsupported');
    });

    it('should handle all valid files', () => {
      const files = [
        { name: 'photo1.jpg', type: 'image/jpeg', size: 1024 * 1024 },
        { name: 'photo2.png', type: 'image/png', size: 2 * 1024 * 1024 },
        { name: 'photo3.webp', type: 'image/webp', size: 3 * 1024 * 1024 },
      ];

      const result = validateBatchFiles(files);
      expect(result.valid).toHaveLength(3);
      expect(result.invalid).toHaveLength(0);
    });
  });

  describe('Constants', () => {
    it('should have correct allowed formats', () => {
      expect(ALLOWED_FORMATS).toContain('image/jpeg');
      expect(ALLOWED_FORMATS).toContain('image/png');
      expect(ALLOWED_FORMATS).toContain('image/webp');
      expect(ALLOWED_FORMATS).toHaveLength(3);
    });

    it('should have correct max file size', () => {
      expect(MAX_FILE_SIZE).toBe(20 * 1024 * 1024);
    });

    it('should have correct allowed extensions', () => {
      expect(ALLOWED_EXTENSIONS).toContain('.jpg');
      expect(ALLOWED_EXTENSIONS).toContain('.jpeg');
      expect(ALLOWED_EXTENSIONS).toContain('.png');
      expect(ALLOWED_EXTENSIONS).toContain('.webp');
    });
  });
});
