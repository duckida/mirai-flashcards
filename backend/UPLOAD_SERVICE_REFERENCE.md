# Upload Service Reference

Quick reference for using the image upload service in the AI Flashcard Quizzer backend.

## Service Location

- **Service**: `lib/services/uploadService.js`
- **API Endpoint**: `POST /api/flashcards/upload`
- **Tests**: `lib/services/uploadService.test.js` and `app/api/flashcards/upload/route.test.js`

## Usage Examples

### Server-Side Usage

```javascript
import { uploadImage, validateImageFile } from '@/lib/services/uploadService';

// Validate a file before uploading
const file = req.file; // From multer or similar
const validation = validateImageFile(file);

if (!validation.isValid) {
  return res.status(400).json({ error: validation.error });
}

// Upload the file
const result = await uploadImage(file, userId);

if (result.success) {
  console.log('File uploaded to:', result.url);
  // Store result.url in database for later retrieval
} else {
  console.error('Upload failed:', result.error);
}
```

### Client-Side Usage

```javascript
// Upload an image from a form
async function uploadImage(file, userId) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('userId', userId);

  const response = await fetch('/api/flashcards/upload', {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();

  if (data.success) {
    console.log('Image uploaded:', data.url);
    return data.url;
  } else {
    console.error('Upload failed:', data.error);
    throw new Error(data.error);
  }
}

// Usage
const imageUrl = await uploadImage(fileInput.files[0], currentUserId);
```

## API Reference

### POST /api/flashcards/upload

Upload an image file to Vercel Storage.

**Request:**
```
POST /api/flashcards/upload
Content-Type: multipart/form-data

file: <binary file data>
userId: <user-id-string>
```

**Response (200 OK):**
```json
{
  "success": true,
  "url": "https://your-blob-store.vercel-storage.com/uploads/user123/1704067200000-abc123.jpg",
  "fileName": "uploads/user123/1704067200000-abc123.jpg",
  "message": "Image uploaded successfully"
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "File size exceeds 20MB limit. Your file is 25.50MB"
}
```

**Response (500 Internal Server Error):**
```json
{
  "success": false,
  "error": "Vercel Storage is not configured. Please set up Vercel Blob Storage."
}
```

## Service Functions

### validateImageFile(file)

Validates a file for format and size.

**Parameters:**
- `file` (File): The file object to validate

**Returns:**
```javascript
{
  isValid: boolean,
  error?: string // Only present if isValid is false
}
```

**Example:**
```javascript
const file = document.getElementById('fileInput').files[0];
const validation = validateImageFile(file);

if (!validation.isValid) {
  alert(validation.error);
}
```

### uploadImage(file, userId)

Uploads a file to Vercel Storage.

**Parameters:**
- `file` (File): The file to upload
- `userId` (string): User ID for organization

**Returns:**
```javascript
Promise<{
  success: boolean,
  url?: string,        // Storage URL (if successful)
  fileName?: string,   // Storage path (if successful)
  error?: string       // Error message (if failed)
}>
```

**Example:**
```javascript
const result = await uploadImage(file, 'user123');

if (result.success) {
  console.log('Stored at:', result.url);
  // Use result.url for further processing
} else {
  console.error('Failed:', result.error);
}
```

### validateBatchFiles(files)

Validates multiple files and separates valid from invalid.

**Parameters:**
- `files` (File[]): Array of files to validate

**Returns:**
```javascript
{
  valid: File[],
  invalid: Array<{
    file: File,
    error: string
  }>
}
```

**Example:**
```javascript
const files = Array.from(document.getElementById('fileInput').files);
const { valid, invalid } = validateBatchFiles(files);

console.log(`Valid: ${valid.length}, Invalid: ${invalid.length}`);

invalid.forEach(({ file, error }) => {
  console.error(`${file.name}: ${error}`);
});
```

### generateStorageFileName(originalFileName, userId)

Generates a unique filename for storage.

**Parameters:**
- `originalFileName` (string): Original file name
- `userId` (string): User ID for organization

**Returns:**
- `string`: Unique filename (e.g., `uploads/user123/1704067200000-abc123.jpg`)

**Example:**
```javascript
const fileName = generateStorageFileName('photo.jpg', 'user123');
// Returns: "uploads/user123/1704067200000-abc123.jpg"
```

## Constants

### ALLOWED_FORMATS

Array of allowed MIME types:
```javascript
['image/jpeg', 'image/png', 'image/webp']
```

### MAX_FILE_SIZE

Maximum file size in bytes:
```javascript
20 * 1024 * 1024 // 20MB
```

### ALLOWED_EXTENSIONS

Array of allowed file extensions:
```javascript
['.jpg', '.jpeg', '.png', '.webp']
```

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "No file provided" | File parameter is missing | Ensure file is selected |
| "User ID is required" | userId parameter is missing | Pass userId from auth session |
| "File size exceeds 20MB limit" | File is too large | Compress or select smaller file |
| "Unsupported image format" | File format not allowed | Use JPEG, PNG, or WEBP |
| "Invalid file extension" | Extension doesn't match MIME type | Verify file integrity |
| "Vercel Storage is not configured" | BLOB_READ_WRITE_TOKEN missing | Set up Vercel Blob Storage |

### Error Recovery

```javascript
async function uploadWithRetry(file, userId, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await uploadImage(file, userId);
      if (result.success) {
        return result.url;
      }
      
      // Retry on server errors
      if (result.error.includes('Internal server error')) {
        console.log(`Retry ${i + 1}/${maxRetries}...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      
      // Don't retry on validation errors
      throw new Error(result.error);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
}
```

## Testing

### Run All Tests

```bash
npm test -- uploadService
```

### Run Specific Test Suite

```bash
# Unit tests
npm test -- lib/services/uploadService.test.js

# Integration tests
npm test -- app/api/flashcards/upload/route.test.js
```

### Test Coverage

```bash
npm test -- --coverage uploadService
```

## Performance Considerations

### Upload Size

- Typical JPEG: 1-5MB
- Typical PNG: 2-10MB
- Typical WEBP: 0.5-3MB

### Upload Time

- 1MB file: ~100-500ms
- 5MB file: ~500ms-2s
- 20MB file: ~2-5s

### Optimization Tips

1. **Compress images** before upload
2. **Use WEBP format** for smaller file sizes
3. **Implement progress tracking** for large files
4. **Use parallel uploads** for multiple files
5. **Cache upload results** to avoid re-uploads

## Integration with Scanner Service

After uploading an image, pass the URL to the Scanner Service:

```javascript
// 1. Upload image
const uploadResult = await uploadImage(file, userId);

if (!uploadResult.success) {
  throw new Error(uploadResult.error);
}

// 2. Extract flashcards from uploaded image
const imageUrl = uploadResult.url;
const flashcards = await scannerService.extractFlashcards(imageUrl);

// 3. Present to user for confirmation
displayFlashcardPreview(flashcards);
```

## Security Best Practices

1. **Always validate on server** - Never trust client-side validation
2. **Implement rate limiting** - Prevent upload abuse
3. **Use user IDs** - Organize files by user
4. **Monitor storage** - Track usage and costs
5. **Implement cleanup** - Remove old files periodically
6. **Use signed URLs** - For sensitive content
7. **Scan for malware** - Consider adding virus scanning

## Troubleshooting

### Upload fails silently

**Check:**
1. Browser console for errors
2. Network tab for failed requests
3. Server logs for error details

### File validation passes but upload fails

**Check:**
1. BLOB_READ_WRITE_TOKEN is set
2. Token is valid and not expired
3. Vercel Blob Storage is enabled
4. Network connectivity

### Files not appearing in storage

**Check:**
1. Upload response shows success
2. URL is accessible
3. File permissions are correct
4. Storage quota not exceeded

## Related Documentation

- [Vercel Storage Setup Guide](./VERCEL_STORAGE_SETUP.md)
- [Scanner Service](./lib/services/scannerService.js) (coming soon)
- [API Routes](./app/api/flashcards/upload/route.js)
