# 🧪 Testing Guide: Production-Quality Composition System

## ✅ Backend is Running

**Status:** ✅ Running on http://localhost:3001  
**Logs:** Check `/tmp/backend-startup.log`

---

## 🔐 Authentication Required

The `/api/pdf-studio/smart-builder/generate` endpoint requires authentication. You have two options:

### **Option 1: Register & Login (Recommended)**

```bash
# 1. Register a new user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "name": "Test User"
  }'

# 2. Login to get auth token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#"
  }'

# Response will include:
# {
#   "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "user": { "id": "...", "email": "..." }
# }

# 3. Save the token for use in next request
export AUTH_TOKEN="<access_token_from_login>"
```

### **Option 2: Use Existing User**

If you already have a user in the database:

```bash
# Login with existing credentials
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "your_password"
  }'
```

---

## 🚀 Test Document Generation

Once you have the auth token, test the composition system:

```bash
# Set your auth token
export AUTH_TOKEN="<your_token_here>"

# Generate a test document
curl -X POST http://localhost:3001/api/pdf-studio/smart-builder/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "rawContent": "# Executive Summary\n\nThis is a comprehensive annual report for 2026. Our company has achieved remarkable growth across all key metrics.\n\n## Financial Highlights\n\nRevenue increased by 45% year-over-year, reaching $10.5 million. Our gross margin improved to 72%.\n\n### Key Performance Indicators\n\n- Customer acquisition cost decreased by 30%\n- Customer lifetime value increased by 55%\n- Monthly recurring revenue grew to $875,000\n\n## Market Analysis\n\nThe market for our products continues to expand rapidly. Industry forecasts predict 40% annual growth.\n\n## Conclusion\n\nWe are well-positioned for continued success in 2027.",
    "documentType": "business_report",
    "config": {
      "title": "Annual Report 2026",
      "documentGoal": "Present comprehensive annual performance",
      "targetAudience": "executives",
      "tone": "professional",
      "includeCoverPage": true,
      "includeTableOfContents": true,
      "designStyle": "executive"
    }
  }' | jq '.'
```

---

## 📊 What to Look For

### **1. Backend Logs (Terminal)**

Look for the composition pipeline output:

```
🎨 Applying production-quality composition...
✓ Composed 8 pages with visual hierarchy
✓ Balanced density: 8 → 7 pages
✓ Added semantic continuations: 3 sections
📊 Composition quality: 78.3/100
```

### **2. API Response**

```json
{
  "success": true,
  "data": {
    "documentId": "cm3abc123...",
    "projectId": "cm3xyz789...",
    "totalPages": 7,
    "processingTimeMs": 1234,
    "metadata": {
      "compositionQuality": 78.3,
      "generatedSections": 7,
      "sections": [
        { "id": "section-1", "title": "Executive Summary", "pageRange": "2-3" },
        { "id": "section-2", "title": "Financial Highlights", "pageRange": "4-5" },
        { "id": "section-3", "title": "Market Analysis", "pageRange": "6" }
      ],
      "tableOfContents": [
        { "title": "Executive Summary", "pageRange": "2-3", "level": 1 },
        { "title": "Financial Highlights", "pageRange": "4-5", "level": 1 },
        { "title": "Market Analysis", "pageRange": "6", "level": 1 }
      ]
    }
  }
}
```

### **3. Database Verification**

```bash
# Connect to database
cd backend
npx prisma studio

# Or use psql:
# Find the database URL from backend/.env
psql <DATABASE_URL>
```

Then run these queries:

```sql
-- Check composition quality for latest document
SELECT 
  id,
  title,
  metadata->'compositionQuality' as quality,
  metadata->'generatedSections' as sections,
  "createdAt"
FROM pdf_documents
ORDER BY "createdAt" DESC
LIMIT 1;

-- Check page composition data
SELECT 
  "order",
  "pageType",
  title,
  content->'composition'->'metrics'->>'overallQuality' as page_quality,
  content->'composition'->>'density' as density,
  content->'composition'->>'layout' as layout
FROM pdf_pages
WHERE "documentId" = '<document_id_from_above>'
ORDER BY "order";

-- Check individual page composition details
SELECT 
  "order",
  title,
  jsonb_array_length(content->'composition'->'sections') as section_count,
  content->'composition'->'metrics' as metrics
FROM pdf_pages
WHERE "documentId" = '<document_id>'
ORDER BY "order";
```

---

## 🎨 Composition Quality Expectations

### **Good Quality (70-85)**
```
densityScore: 70-80
readabilityScore: 75-85
whitespaceScore: 60-70
visualBalanceScore: 70-80
overallQuality: 70-85
```

### **Excellent Quality (85-95)**
```
densityScore: 80-90
readabilityScore: 85-95
whitespaceScore: 70-85
visualBalanceScore: 80-90
overallQuality: 85-95
```

### **Perfect Quality (95+)**
```
densityScore: 90-100
readabilityScore: 95-100
whitespaceScore: 85-100
visualBalanceScore: 90-100
overallQuality: 95-100
```

---

## ✅ Success Criteria

You'll know the composition system is working correctly if:

- [x] Backend starts without errors
- [ ] Document generation completes successfully
- [ ] Logs show composition pipeline running
- [ ] Composition quality score appears in logs (e.g., "78.3/100")
- [ ] Database contains composition data in page records
- [ ] metadata.compositionQuality is stored in document
- [ ] metadata.sections contains page ranges (not "continued continued")
- [ ] metadata.tableOfContents shows parent sections only

---

## 🐛 Troubleshooting

### **"Authentication required" error**
- Make sure you're sending the Bearer token in Authorization header
- Token format: `Authorization: Bearer <token>`
- Token must be from a valid login response

### **"No composition data in database"**
- Check that new services are injected in controller
- Verify no TypeScript errors during compilation
- Check logs for composition pipeline messages

### **"Quality score is 0 or undefined"**
- Verify DocumentCompositionService is calculating metrics
- Check that avgQuality is being computed correctly
- Ensure metadata is being saved with `as any` type cast

### **"Port 3001 already in use"**
```bash
# Kill existing process
lsof -ti:3001 | xargs kill -9

# Restart backend
cd backend && npm run start:dev
```

---

## 📋 Quick Test Checklist

```bash
# 1. Backend running?
curl http://localhost:3001/api/health

# 2. Can register?
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!","name":"Test"}'

# 3. Can login?
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!"}'

# 4. Can generate? (use token from step 3)
curl -X POST http://localhost:3001/api/pdf-studio/smart-builder/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"rawContent":"# Test\n\nContent here.","documentType":"document","config":{}}'

# 5. Check logs
tail -50 /tmp/backend-startup.log | grep -A 5 "composition"
```

---

## 🎉 Next Steps After Verification

Once backend is verified working:

1. **Update Frontend** to render composition data
2. **Create CompositionRenderer** component
3. **Display quality metrics** in editor
4. **Implement immersive viewport**
5. **Test export parity**

---

**Backend Status:** ✅ Running & Ready  
**Composition System:** ✅ Integrated  
**Next:** Get auth token and test generation!
