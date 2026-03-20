# Firestore Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React Native + Tamagui)        │
│  Screens: Auth, Dashboard, Module, Flashcard, Quiz, Results │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Backend (Vercel)                 │
│  API Routes: /api/auth, /api/flashcards, /api/quiz, etc.   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Application Services Layer                      │
│  Auth Service, Scanner, Classifier, Quiz Engine, etc.       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Firestore Service Layer                         │
│  (lib/firebase/firestore.js)                                │
│  - Users, Modules, Flashcards, Quiz Sessions, Presentations │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Firebase Admin SDK                              │
│  (lib/firebase/admin.js)                                    │
│  - Initializes with service account credentials             │
│  - Provides Firestore, Auth, Storage instances              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Google Cloud Firestore                    │
│  Database: Native mode, multi-region replication            │
└─────────────────────────────────────────────────────────────┘
```

## Module Organization

### Backend Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── auth/              # Authentication endpoints
│   │   ├── flashcards/        # Flashcard CRUD endpoints
│   │   ├── modules/           # Module management endpoints
│   │   ├── quiz/              # Quiz session endpoints
│   │   ├── canva/             # Canva integration endpoints
│   │   └── firestore-example/ # Example Firestore usage
│   ├── layout.js              # Root layout
│   └── page.js                # Home page
├── lib/
│   └── firebase/
│       ├── admin.js           # Firebase Admin SDK initialization
│       ├── firestore.js       # Firestore service layer
│       └── test.js            # Connection test script
├── package.json               # Dependencies
├── .env.local                 # Local environment variables
├── .env.local.example         # Environment variable template
├── FIRESTORE_SETUP.md         # Setup guide
├── FIRESTORE_SETUP_CHECKLIST.md # Setup checklist
├── FIRESTORE_IMPLEMENTATION_GUIDE.md # Developer guide
├── FIRESTORE_SUMMARY.md       # Summary
└── FIRESTORE_ARCHITECTURE.md  # This file
```

## Data Flow

### User Registration Flow

```
1. User clicks "Sign in with Civic.ai"
   ↓
2. Frontend redirects to Civic.ai OAuth
   ↓
3. User authenticates with Civic.ai
   ↓
4. Civic.ai redirects to /api/auth/callback with code
   ↓
5. Backend exchanges code for access token
   ↓
6. Backend fetches user info from Civic.ai
   ↓
7. Backend creates user document in Firestore
   ↓
8. Backend creates session cookie
   ↓
9. Frontend redirected to Dashboard
```

### Image Upload & Flashcard Creation Flow

```
1. User selects image file
   ↓
2. Frontend uploads to /api/flashcards/upload
   ↓
3. Backend stores image in Vercel Storage
   ↓
4. Backend calls AI Vision API to extract Q&A pairs
   ↓
5. Backend returns extracted flashcards to frontend
   ↓
6. User reviews and confirms flashcards
   ↓
7. Frontend sends confirmed flashcards to /api/flashcards
   ↓
8. Backend creates flashcard documents in Firestore
   ↓
9. Backend calls Classifier to assign to modules
   ↓
10. Backend creates/updates module documents
    ↓
11. Frontend shows success and updates dashboard
```

### Quiz Session Flow

```
1. User selects module and quiz type (voice/image)
   ↓
2. Frontend sends POST to /api/quiz/start
   ↓
3. Backend creates quiz_sessions document
   ↓
4. Backend retrieves flashcards ordered by knowledge score
   ↓
5. Backend returns first question
   ↓
6. Frontend displays question (with speech/image as needed)
   ↓
7. User answers question
   ↓
8. Frontend sends answer to /api/quiz/:sessionId/answer
   ↓
9. Backend evaluates answer
   ↓
10. Backend updates flashcard knowledge score
    ↓
11. Backend adds response to quiz_sessions
    ↓
12. Backend returns feedback and next question
    ↓
13. Repeat steps 6-12 until quiz ends
    ↓
14. Frontend sends POST to /api/quiz/:sessionId/end
    ↓
15. Backend marks session as completed
    ↓
16. Backend returns session summary
    ↓
17. Frontend displays results
```

## Firestore Collections Relationships

```
users (1)
  ├── modules (many) - userId foreign key
  │   └── flashcards (many) - moduleId foreign key
  │       └── quiz_sessions (many) - flashcardId reference
  ├── flashcards (many) - userId foreign key
  ├── quiz_sessions (many) - userId foreign key
  │   └── responses (array) - flashcardId reference
  └── presentations (many) - userId foreign key
      └── flashcardId (optional) - reference
```

## Security Model

### Authentication

- **Provider**: Civic.ai OAuth
- **Session**: Secure HTTP-only cookies
- **Validation**: Session token verified on each request

### Authorization

- **Model**: User-based access control
- **Rule**: Users can only access their own data
- **Enforcement**: Firestore security rules + backend validation

### Data Protection

- **Encryption**: All data encrypted in transit (HTTPS)
- **At Rest**: Firestore encrypts data at rest
- **Backup**: Firestore provides automatic backups

## Performance Optimization

### Indexing Strategy

**Single-field indexes** (auto-created):
- `users.id`
- `modules.userId`
- `flashcards.userId`
- `flashcards.moduleId`
- `quiz_sessions.userId`
- `presentations.userId`

**Composite indexes** (manual creation):
- `modules`: `userId` + `createdAt` (for listing user's modules)
- `flashcards`: `userId` + `moduleId` + `knowledgeScore` (for quiz selection)
- `quiz_sessions`: `userId` + `status` + `startedAt` (for session history)

### Query Optimization

1. **Use Indexes**: All queries use indexed fields
2. **Limit Results**: Use `.limit()` to reduce data transfer
3. **Denormalization**: Store aggregate scores on modules
4. **Batch Operations**: Use batch writes for multiple documents
5. **Caching**: Cache frequently accessed data in memory

### Scalability

- **Firestore Scaling**: Automatically scales to millions of documents
- **Read/Write Limits**: 50K reads/sec, 20K writes/sec per database
- **Document Size**: Max 1MB per document (well within limits)
- **Collection Size**: No limit on collection size

## Error Handling

### Firestore Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `PERMISSION_DENIED` | User lacks access | Check security rules and user ID |
| `NOT_FOUND` | Document doesn't exist | Verify document ID and collection |
| `INVALID_ARGUMENT` | Invalid query or data | Check query syntax and data types |
| `UNAVAILABLE` | Service temporarily down | Retry with exponential backoff |
| `UNAUTHENTICATED` | User not authenticated | Verify authentication token |

### Backend Error Handling

```javascript
try {
  const result = await firestoreService.getUser(userId);
} catch (error) {
  if (error.code === 'PERMISSION_DENIED') {
    // User doesn't have access
    return Response.json({ error: 'Access denied' }, { status: 403 });
  } else if (error.code === 'NOT_FOUND') {
    // Document doesn't exist
    return Response.json({ error: 'Not found' }, { status: 404 });
  } else {
    // Other errors
    return Response.json({ error: 'Database error' }, { status: 500 });
  }
}
```

## Monitoring and Observability

### Metrics to Track

1. **Firestore Operations**
   - Read/write operations per second
   - Query latency (p50, p95, p99)
   - Error rate by operation type

2. **Data Volume**
   - Total documents per collection
   - Average document size
   - Storage usage and costs

3. **Performance**
   - API response times
   - Database query times
   - Cache hit rates

### Logging

```javascript
// Log Firestore operations
console.log(`[Firestore] Creating user: ${userId}`);
console.log(`[Firestore] Query: ${collection} where ${field} == ${value}`);
console.log(`[Firestore] Error: ${error.message}`);
```

### Alerts

Set up alerts for:
- Firestore quota exceeded
- High error rate (>1%)
- Query latency >1 second
- Storage usage >80% of quota

## Backup and Recovery

### Automatic Backups

- Firestore provides automatic daily backups
- Backups retained for 35 days
- Accessible via Firebase Console

### Manual Backups

Export data using Firebase CLI:

```bash
firebase firestore:export gs://your-bucket/backup-$(date +%s)
```

### Recovery

Restore from backup:

```bash
firebase firestore:import gs://your-bucket/backup-timestamp
```

## Cost Optimization

### Pricing Model

- **Reads**: $0.06 per 100K reads
- **Writes**: $0.18 per 100K writes
- **Deletes**: $0.02 per 100K deletes
- **Storage**: $0.18 per GB/month

### Cost Reduction Strategies

1. **Batch Operations**: Combine multiple writes into single batch
2. **Denormalization**: Store aggregate data to avoid aggregation queries
3. **Caching**: Cache frequently accessed data
4. **Indexing**: Use indexes to reduce query costs
5. **Cleanup**: Delete old/unused data regularly

### Estimated Monthly Cost

For 1000 active users:
- Reads: ~1M/month = $6
- Writes: ~500K/month = $9
- Storage: ~100MB = $0.02
- **Total: ~$15/month**

## Deployment Checklist

- [ ] Firebase project created
- [ ] Firestore database created (Native mode)
- [ ] Service account key generated
- [ ] Environment variables configured
- [ ] Firebase Admin SDK installed
- [ ] Firestore service layer implemented
- [ ] Security rules published
- [ ] Composite indexes created
- [ ] Connection test passed
- [ ] API routes implemented
- [ ] Environment variables added to Vercel
- [ ] Deployment tested
- [ ] Monitoring configured
- [ ] Backup strategy implemented

## References

- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firestore Indexes](https://firebase.google.com/docs/firestore/query-data/index-overview)
- [Firebase Admin SDK](https://firebase.google.com/docs/database/admin/start)
- [Firebase Pricing](https://firebase.google.com/pricing)
- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)

