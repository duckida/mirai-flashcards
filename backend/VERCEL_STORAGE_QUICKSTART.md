# Vercel Storage Quick Start

Get Vercel Storage up and running in 5 minutes.

## 1. Enable Vercel Blob Storage (2 minutes)

### Option A: Via Vercel Dashboard (Recommended)

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your `backend` project
3. Click **Storage** tab
4. Click **Create Database** → **Blob**
5. Choose a region and click **Create**

### Option B: Via CLI

```bash
cd backend
vercel storage create blob
```

## 2. Get Your Token (1 minute)

### Automatic (Recommended)

```bash
cd backend
vercel env pull
```

This automatically updates `.env.local` with `BLOB_READ_WRITE_TOKEN`.

### Manual

1. Go to Vercel dashboard → Storage → Blob
2. Copy the token
3. Add to `.env.local`:
   ```
   BLOB_READ_WRITE_TOKEN=your-token-here
   ```

## 3. Install Dependencies (1 minute)

```bash
cd backend
npm install
```

## 4. Test It (1 minute)

### Start dev server:
```bash
npm run dev
```

### Upload a test image:
```bash
curl -X POST http://localhost:3000/api/flashcards/upload \
  -F "file=@test-image.jpg" \
  -F "userId=test-user"
```

### Expected response:
```json
{
  "success": true,
  "url": "https://your-blob-store.vercel-storage.com/uploads/test-user/...",
  "fileName": "uploads/test-user/...",
  "message": "Image uploaded successfully"
}
```

## Done! 🎉

Your image upload service is ready to use.

## What You Can Do Now

- ✅ Upload JPEG, PNG, WEBP images
- ✅ Enforce 20MB file size limit
- ✅ Organize files by user ID
- ✅ Get storage URLs for processing

## Next Steps

1. **Integrate with Scanner Service** - Use uploaded URLs with AI vision
2. **Add Authentication** - Use real user IDs from Civic.ai
3. **Monitor Storage** - Check usage in Vercel dashboard
4. **Run Tests** - `npm test -- uploadService`

## Troubleshooting

### "Vercel Storage is not configured"
→ Run `vercel env pull` to get the token

### Upload fails with 500 error
→ Check `BLOB_READ_WRITE_TOKEN` is set in `.env.local`

### File validation fails
→ Use JPEG, PNG, or WEBP format, max 20MB

## Documentation

- **Setup Guide**: [VERCEL_STORAGE_SETUP.md](./VERCEL_STORAGE_SETUP.md)
- **API Reference**: [UPLOAD_SERVICE_REFERENCE.md](./UPLOAD_SERVICE_REFERENCE.md)
- **Implementation Details**: [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review [VERCEL_STORAGE_SETUP.md](./VERCEL_STORAGE_SETUP.md)
3. Check Vercel documentation: https://vercel.com/docs/storage/vercel-blob
