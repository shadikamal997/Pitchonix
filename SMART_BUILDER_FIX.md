# Smart Builder Authentication Fix

## Problem
Smart Builder workflow was redirecting users to sign-in page when clicking:
- "Apply Enhancements" (Fix all issues automatically)
- "Choose Template" (Select from 20 templates)
- "Quick Generate" (Use suggested template)

## Root Cause
The backend endpoints `enhance-content` and `generate` required authentication (protected by `@UseGuards(JwtAuthGuard)`), but the Smart Builder was designed to work without login.

## Solution
Made the Smart Builder endpoints public using the `@Public()` decorator pattern:

### Backend Changes

#### File: `backend/src/pdf-studio/controllers/smart-builder.controller.ts`

**Lines 95-97:** Added `@Public()` to enhance-content endpoint
```typescript
@Public()
@Post('enhance-content')
```

**Lines 173-175:** Added `@Public()` to generate endpoint
```typescript
@Public()
@Post('generate')
```

**Lines 210-220:** Modified generate endpoint to handle anonymous users
- Made `user` parameter optional
- Skip project creation for anonymous users
- Return early with `requiresAuth: true` flag for anonymous users

### Frontend Changes

#### File: `frontend/app/pdf-studio/smart-builder/page.tsx`

**Lines 163-177:** Updated `handleGeneratePDF` to handle anonymous mode
- Check for `requiresAuth` flag in response
- Save pending generation to sessionStorage
- Redirect to login with message and return URL

## How It Works Now

### Authenticated Users
1. Click any button (Enhance/Template/Generate)
2. API creates project and document
3. Redirects to editor with document ID

### Anonymous Users
1. Click any button (Enhance/Template/Generate)
2. Enhance endpoint returns enhanced content (works fully)
3. Generate endpoint returns structured content with `requiresAuth: true`
4. Frontend saves state to sessionStorage
5. Redirects to `/login?redirect=/pdf-studio/smart-builder&message=Please sign in to save your document`
6. After login, user can continue their work

## Endpoints Status

| Endpoint | Auth Required | Anonymous Mode | Purpose |
|----------|---------------|----------------|---------|
| `/pdf-studio/smart-builder/analyze` | ❌ No | ✅ Full access | Analyze content |
| `/pdf-studio/smart-builder/enhance-content` | ❌ No | ✅ Full access | Enhance and structure content |
| `/pdf-studio/smart-builder/generate` | ❌ No | ⚠️ Preview only | Generate document (requires login to save) |

## Testing

All endpoints tested successfully without authentication:

```bash
# Test analyze
curl -X POST http://localhost:3001/api/pdf-studio/smart-builder/analyze \
  -H "Content-Type: application/json" \
  -d '{"rawContent":"Test content"}'
# ✅ Returns analysis

# Test enhance
curl -X POST http://localhost:3001/api/pdf-studio/smart-builder/enhance-content \
  -H "Content-Type: application/json" \
  -d '{"rawContent":"Test content","fixAll":true}'
# ✅ Returns enhanced content

# Test generate (anonymous)
curl -X POST http://localhost:3001/api/pdf-studio/smart-builder/generate \
  -H "Content-Type: application/json" \
  -d '{"rawContent":"Test content","config":{"title":"Test"}}'
# ✅ Returns content with requiresAuth: true
```

## Related Files
- `backend/src/auth/public.decorator.ts` - Public decorator definition
- `backend/src/auth/jwt-auth.guard.ts` - Guard that checks for @Public()
- `frontend/lib/api.ts` - Axios interceptors (handles 401 errors)

## Notes
- The `@Public()` decorator was already created for the analyze endpoint
- Frontend already had proper error handling in place
- No database schema changes required
- Backward compatible - authenticated users work as before
