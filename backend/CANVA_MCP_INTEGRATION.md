# Canva MCP Integration via Civic.ai

This document describes how the AI Flashcard Quizzer integrates with Canva through Civic.ai's MCP Hub.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React Native Web)              │
│  - User requests "Help me understand" presentation          │
│  - Passes Civic Auth token from session                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              Backend (Next.js API Routes)                   │
│  - POST /api/canva/generate                                 │
│  - GET /api/canva/[designId]                                │
│  - GET /api/canva/[designId]/export                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│         Canva Service (Backend)                             │
│  - callCanvaTool() - Invoke MCP tools via Civic Hub         │
│  - generatePresentation() - Create design                   │
│  - getDesignDetails() - Fetch design info                   │
│  - exportDesignToPdf() - Export to PDF                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│         Civic.ai MCP Hub                                    │
│  - Orchestrates MCP tool execution                          │
│  - Manages authentication and authorization                 │
│  - Routes requests to Canva MCP server                      │
│  URL: https://hub.mcp.civic.com                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│         Canva MCP Server                                    │
│  - Provides design creation, editing, export tools          │
│  - Handles user authentication with Canva                   │
│  - URL: https://mcp.canva.com/mcp                           │
└─────────────────────────────────────────────────────────────┘
```

## Key Concepts

### Civic Auth Tokens
- Civic Auth provides OAuth tokens that are **directly valid** for Civic MCP Hub
- No token exchange needed (unlike federated auth approaches)
- Each user must authenticate individually with Civic
- Tokens are passed in the `Authorization: Bearer <token>` header

### MCP Hub
- Civic's Model Context Protocol Hub orchestrates MCP tool execution
- Provides centralized authentication and authorization
- Manages container lifecycle for MCP servers
- Reference: https://docs.civic.com/labs/projects/mcp-hub

### Canva MCP Server
- Exposes Canva design capabilities as MCP tools
- Available tools: `create_design`, `get_design`, `export_design`, etc.
- Requires individual user authentication with Canva
- Reference: https://www.canva.dev/docs/mcp/

## Setup Instructions

### 1. Register with Civic.ai

1. Go to https://app.civic.com
2. Create an Integration with **Civic Auth** as the auth provider
3. Note your `CIVIC_CLIENT_ID` (already configured: `a141d53d-9b85-41b5-8590-38a27caaf582`)
4. Generate and save your `CIVIC_CLIENT_SECRET`

### 2. Register with Canva MCP

1. Go to https://www.canva.dev/docs/mcp/
2. Fill out the intake form to register your redirect URI
3. Canva will review and approve your integration
4. You'll receive confirmation and integration guidance

### 3. Configure Environment Variables

```bash
# Civic MCP Hub
CIVIC_MCP_HUB_URL=https://hub.mcp.civic.com
CIVIC_MCP_API_KEY=your-civic-mcp-api-key

# Civic Auth (already configured)
CIVIC_CLIENT_ID=a141d53d-9b85-41b5-8590-38a27caaf582
CIVIC_CLIENT_SECRET=your-civic-client-secret
```

### 4. Implement Session Management

The backend needs to:
1. Store Civic Auth tokens in secure HTTP-only cookies
2. Pass tokens to API routes via `x-civic-auth-token` header
3. Validate tokens before calling MCP Hub

Example session middleware:
```javascript
// Extract token from session/cookie
const civicAuthToken = request.cookies.get('civic_auth_token')?.value;

// Pass to API route
request.headers.set('x-civic-auth-token', civicAuthToken);
```

## API Endpoints

### POST /api/canva/generate
Generate a new Canva design for a topic.

**Request:**
```json
{
  "topic": "Photosynthesis",
  "flashcardId": "card-123" // optional
}
```

**Headers:**
```
x-user-id: user-123
x-civic-auth-token: civic-auth-token
```

**Response:**
```json
{
  "designId": "design-123",
  "editUrl": "https://canva.com/edit/design-123",
  "viewUrl": "https://canva.com/view/design-123"
}
```

### GET /api/canva/[designId]
Get design details and links.

**Headers:**
```
x-user-id: user-123
x-civic-auth-token: civic-auth-token
```

**Response:**
```json
{
  "designId": "design-123",
  "title": "Explanation: Photosynthesis",
  "editUrl": "https://canva.com/edit/design-123",
  "viewUrl": "https://canva.com/view/design-123"
}
```

### GET /api/canva/[designId]/export
Export design to PDF.

**Headers:**
```
x-user-id: user-123
x-civic-auth-token: civic-auth-token
```

**Response:**
```json
{
  "downloadUrl": "https://cdn.canva.com/exports/design-123.pdf",
  "expiresAt": "2025-03-27T12:00:00Z"
}
```

## Frontend Usage

```javascript
import { requestPresentation, getDesignDetails, exportDesignToPdf } from '@/services/canvaService';

// Get Civic Auth token from session
const civicAuthToken = useAuth().token;

// Request a presentation
const presentation = await requestPresentation(
  'Photosynthesis',
  civicAuthToken,
  'card-123'
);

// Get design details
const design = await getDesignDetails(presentation.designId, civicAuthToken);

// Export to PDF
const pdf = await exportDesignToPdf(presentation.designId, civicAuthToken);
```

## Firestore Schema

### presentations collection
```javascript
{
  userId: string,           // User ID
  topic: string,            // Topic for the presentation
  flashcardId: string|null, // Optional flashcard ID
  designId: string,         // Canva design ID
  editUrl: string,          // Canva edit link
  viewUrl: string,          // Canva view link
  createdAt: Timestamp,     // Creation time
  expiresAt: Timestamp,     // Expiration time (30 days)
}
```

## Error Handling

### Common Errors

**Unauthorized (401)**
- Missing or invalid Civic Auth token
- User not authenticated

**Forbidden (403)**
- User doesn't own the design
- Insufficient permissions

**Not Found (404)**
- Design doesn't exist in Firestore

**Server Error (500)**
- Canva MCP tool call failed
- Network error with Civic Hub

### Graceful Degradation

If Canva integration fails:
1. Display error message to user
2. Offer retry button
3. Provide fallback: link to manual Canva design creation
4. Continue quiz without presentation

## Testing

Run tests:
```bash
npm test -- backend/lib/services/canvaService.test.js
```

Tests cover:
- Tool invocation via Civic Hub
- Presentation generation
- Design details retrieval
- PDF export
- Error handling
- Authentication validation

## Troubleshooting

### "CIVIC_MCP_API_KEY not configured"
- Ensure `CIVIC_MCP_API_KEY` is set in `.env.local`
- Restart the development server

### "Civic Auth token required"
- Ensure user is authenticated
- Check that token is passed in `x-civic-auth-token` header
- Verify token is not expired

### "Canva MCP tool error"
- Check Civic Hub URL is correct
- Verify API key is valid
- Ensure Canva MCP server is running
- Check Canva account has required permissions

### Design not found in Firestore
- Verify design was created successfully
- Check user ID matches
- Ensure Firestore security rules allow access

## References

- [Civic.ai Documentation](https://docs.civic.com/)
- [Civic MCP Hub](https://docs.civic.com/labs/projects/mcp-hub)
- [Civic Auth](https://docs.civic.com/auth)
- [Canva MCP Documentation](https://www.canva.dev/docs/mcp/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
