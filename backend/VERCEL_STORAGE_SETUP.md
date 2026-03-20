# Vercel Storage Configuration Guide

This guide explains how to set up Vercel Storage (Blob Storage) for the AI Flashcard Quizzer backend to handle image uploads.

## Overview

Vercel Storage provides a simple, scalable solution for storing uploaded images. The backend uses it to persist flashcard images before processing them with AI vision APIs.

## Prerequisites

- Backend deployed to Vercel (already completed)
- Vercel CLI installed locally
- Access to Vercel dashboard

## Step 1: Enable Vercel Blob Storage

### Via Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (`backend`)
3. Navigate to **Storage** tab
4. Click **Create Database** or **Create Store**
5. Select **Blob** as the storage type
6. Choose a region (recommended: closest to your users)
7. Click **Create**

### Via Vercel CLI

```bash
cd backend
vercel storage create blob
```

## Step 2: Configure Environment Variables

### Automatic Configuration

When you enable Blob Storage in Vercel, the `BLOB_READ_WRITE_TOKEN` is automatically added to your Vercel environment variables.

### Local Development

1. Pull environment variables from Vercel:
   ```bash
   cd backend
   vercel env pull
   ```

2. This will update your `.env.local` file with the `BLOB_READ_WRITE_TOKEN`

3. Verify the token is present:
   ```bash
   grep BLOB_READ_WRITE_TOKEN backend/.env.local
   ```

## Step 3: Install Dependencies

The `@vercel/blob` package is already added to `package.json`. Install it:

```bash
cd backend
npm install
```

## Step 4: Test the Upload Service

### Unit Tests

Run the upload service unit tests:

```bash
cd backend
npm test -- lib/services/uploadService.test.js
```

### Integration Tests

Run the API endpoint tests:

```bash
cd backend
npm test -- app/api/flashcards/upload/route.test.js
```

### Manual Testing

1. Start the development server:
   ```bash
   cd backend
   npm run dev
   ```

2. Test the upload endpoint with curl:
   ```bash
   curl -X POST http://localhost:3000/api/flashcards/upload \
     -F "file=@/path/to/image.jpg" \
     -F "userId=test-user-123"
   ```

3. Expected response (success):
   ```json
   {
     "success": true,
     "url": "https://your-blob-store.vercel-storage.com/uploads/test-user-123/...",
     "fileName": "uploads/test-user-123/...",
     "message": "Image uploaded successfully"
   }
   ```

## Upload Service Features

### Supported Formats

- JPEG (`.jpg`, `.jpeg`)
- PNG (`.png`)
- WEBP (`.webp`)

### Size Limits

- Maximum file size: **20MB** per file
- Enforced at both client and server level

### Validation

The upload service validates:

1. **File Format**: Checks MIME type and file extension
2. **File Size**: Ensures file doesn't exceed 20MB
3. **User ID**: Requires user ID for organization

### Error Handling

The service provides descriptive error messages:

- `"No file provided"` - File is missing
- `"User ID is required"` - User ID is missing
- `"File size exceeds 20MB limit"` - File too large
- `"Unsupported image format"` - Invalid format
- `"Invalid file extension"` - Extension mismatch
- `"Vercel Storage is not configured"` - Token missing

## API Endpoint

### POST /api/flashcards/upload

Uploads an image file to Vercel Storage.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body:
  - `file` (required): Image file (JPEG, PNG, or WEBP, ≤20MB)
  - `userId` (required): User ID for organization

**Response (Success):**
```json
{
  "success": true,
  "url": "https://...",
  "fileName": "uploads/userId/timestamp-random.ext",
  "message": "Image uploaded successfully"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Error description"
}
```

## File Organization

Uploaded files are organized in Vercel Storage as:

```
uploads/
├── user-id-1/
│   ├── 1704067200000-abc123.jpg
│   ├── 1704067201000-def456.png
│   └── ...
├── user-id-2/
│   ├── 1704067202000-ghi789.webp
│   └── ...
└── ...
```

This structure:
- Organizes files by user
- Includes timestamp for uniqueness
- Includes random suffix to prevent collisions
- Preserves original file extension

## Security Considerations

### Access Control

- Files are stored with `access: 'public'` for retrieval
- Consider implementing signed URLs for sensitive content
- Implement rate limiting on upload endpoint

### Validation

- File format validation prevents malicious uploads
- File size limits prevent storage abuse
- User ID requirement ensures proper organization

### Best Practices

1. **Validate on both client and server** - Never trust client-side validation alone
2. **Implement rate limiting** - Prevent abuse of upload endpoint
3. **Monitor storage usage** - Track costs and usage patterns
4. **Implement cleanup** - Remove old/unused files periodically
5. **Use signed URLs** - For sensitive content, use time-limited signed URLs

## Troubleshooting

### "Vercel Storage is not configured"

**Cause**: `BLOB_READ_WRITE_TOKEN` environment variable is missing

**Solution**:
1. Verify Blob Storage is enabled in Vercel dashboard
2. Pull environment variables: `vercel env pull`
3. Restart development server

### Upload fails with 500 error

**Cause**: Token is invalid or expired

**Solution**:
1. Regenerate token in Vercel dashboard
2. Update `.env.local` with new token
3. Restart development server

### File validation fails

**Cause**: File format or size doesn't meet requirements

**Solution**:
1. Verify file is JPEG, PNG, or WEBP
2. Check file size is ≤20MB
3. Ensure file extension matches MIME type

## Monitoring and Maintenance

### Monitor Storage Usage

1. Go to Vercel dashboard
2. Navigate to **Storage** → **Blob**
3. View storage usage and costs

### Clean Up Old Files

Implement a cleanup job to remove old uploads:

```javascript
// Example: Remove files older than 30 days
const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
// Implement deletion logic based on file timestamps
```

### Set Up Alerts

Configure Vercel alerts for:
- Storage usage exceeding threshold
- Upload failures
- API errors

## Next Steps

1. **Implement Scanner Service**: Use uploaded image URLs with AI Vision API
2. **Add Authentication**: Integrate with Civic.ai to get real user IDs
3. **Implement Cleanup**: Add job to remove old/unused uploads
4. **Monitor Performance**: Track upload times and success rates
5. **Optimize Images**: Consider image compression before storage

## References

- [Vercel Blob Storage Documentation](https://vercel.com/docs/storage/vercel-blob)
- [@vercel/blob NPM Package](https://www.npmjs.com/package/@vercel/blob)
- [Vercel Storage Pricing](https://vercel.com/pricing/storage)
