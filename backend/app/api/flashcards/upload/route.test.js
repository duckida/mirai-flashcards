/**
 * Integration tests for the upload API endpoint
 * Tests the POST /api/flashcards/upload endpoint
 */

import { POST } from './route';

// Mock the upload service
jest.mock('@/lib/services/uploadService', () => ({
  uploadImage: jest.fn(),
  validateImageFile: jest.fn(),
}));

import { uploadImage, validateImageFile } from '@/lib/services/uploadService';

describe('POST /api/flashcards/upload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully upload a valid image', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('file', mockFile);
    formData.append('userId', 'user123');

    validateImageFile.mockReturnValue({ isValid: true });
    uploadImage.mockResolvedValue({
      success: true,
      url: 'https://example.com/uploads/user123/123456-abc.jpg',
      fileName: 'uploads/user123/123456-abc.jpg',
    });

    const request = new Request('http://localhost:3000/api/flashcards/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.url).toBeDefined();
    expect(data.fileName).toBeDefined();
    expect(data.message).toContain('successfully');
  });

  it('should reject request without file', async () => {
    const formData = new FormData();
    formData.append('userId', 'user123');

    const request = new Request('http://localhost:3000/api/flashcards/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('No file provided');
  });

  it('should reject request without userId', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('file', mockFile);

    const request = new Request('http://localhost:3000/api/flashcards/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('User ID is required');
  });

  it('should reject invalid file format', async () => {
    const mockFile = new File(['test'], 'test.gif', { type: 'image/gif' });
    const formData = new FormData();
    formData.append('file', mockFile);
    formData.append('userId', 'user123');

    validateImageFile.mockReturnValue({
      isValid: false,
      error: 'Unsupported image format',
    });

    const request = new Request('http://localhost:3000/api/flashcards/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Unsupported');
  });

  it('should reject file exceeding size limit', async () => {
    const mockFile = new File(['x'.repeat(21 * 1024 * 1024)], 'large.jpg', {
      type: 'image/jpeg',
    });
    const formData = new FormData();
    formData.append('file', mockFile);
    formData.append('userId', 'user123');

    validateImageFile.mockReturnValue({
      isValid: false,
      error: 'File size exceeds 20MB limit',
    });

    const request = new Request('http://localhost:3000/api/flashcards/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('exceeds 20MB');
  });

  it('should handle upload service errors', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('file', mockFile);
    formData.append('userId', 'user123');

    validateImageFile.mockReturnValue({ isValid: true });
    uploadImage.mockResolvedValue({
      success: false,
      error: 'Vercel Storage is not configured',
    });

    const request = new Request('http://localhost:3000/api/flashcards/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toContain('not configured');
  });

  it('should handle unexpected errors gracefully', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('file', mockFile);
    formData.append('userId', 'user123');

    validateImageFile.mockImplementation(() => {
      throw new Error('Unexpected error');
    });

    const request = new Request('http://localhost:3000/api/flashcards/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Internal server error');
  });
});
