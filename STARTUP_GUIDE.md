# Pitchonix Startup Guide

## Prerequisites

✅ Node.js v25.2.1  
✅ PostgreSQL (running)  
✅ Redis (running - verified via `redis-cli ping`)  
✅ Dependencies installed

---

## Quick Start (Recommended)

### Option 1: Start Backend Only (For API Testing)

```bash
cd /Users/shadi/Desktop/Pitchonix/backend
npm run start:dev
```

**Backend will run on:** http://localhost:3001

---

### Option 2: Start Frontend Only (For UI Testing)

```bash
cd /Users/shadi/Desktop/Pitchonix/frontend
npm run dev
```

**Frontend will run on:** http://localhost:3002

---

### Option 3: Start Both (Full Stack)

**Terminal 1 - Backend:**
```bash
cd /Users/shadi/Desktop/Pitchonix/backend
npm run start:dev
```

**Terminal 2 - Frontend:**
```bash
cd /Users/shadi/Desktop/Pitchonix/frontend
npm run dev
```

---

## Current Issues & Fixes

### ✅ FIXED: Next.js Build Cache Corrupted
- **Error:** `Cannot find module './6532.js'`
- **Fix:** Removed `.next` folder
- **Status:** Ready to restart

### ⚠️ PARTIAL: Backend Redis Connection
- **Error:** `Stream isn't writeable and enableOfflineQueue options is false`
- **Status:** Redis IS running (confirmed via `redis-cli ping`)
- **Possible Cause:** Backend config might have wrong Redis host/port
- **Default:** Backend expects Redis on `localhost:6379`

### ✅ FIXED: Port 3002 Conflict
- **Status:** Port cleared

---

## System Status

### Backend (Port 3001)
- **NestJS:** Ready
- **Database:** PostgreSQL connected
- **Redis:** Running but connection issues
- **Services Loaded:**
  - ✅ 9 Layouts initialized
  - ✅ 7 Themes initialized
  - ⚠️ OpenAI API key not configured (AI enhancement disabled)
  - ✅ 20 PDF Templates loaded
  - ✅ PDF Export Service ready
  - ✅ Browser Pool Service initializing

### Frontend (Port 3002)
- **Next.js 14.1.0:** Ready to start
- **Build Cache:** Cleared
- **Status:** Ready

---

## Environment Variables Required

### Backend (.env)
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/pitchonix"

# Redis (verify these match your setup)
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key

# Optional: AI Features
OPENAI_API_KEY=sk-your-key  # Currently not set (AI disabled)
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

---

## Recommended Startup Order

1. **Start Backend First**
   ```bash
   cd backend && npm run start:dev
   ```
   
2. **Wait for "Nest application successfully started"**

3. **Start Frontend**
   ```bash
   cd frontend && npm run dev
   ```

4. **Access Application**
   - Frontend: http://localhost:3002
   - Backend API: http://localhost:3001/api
   - API Health: http://localhost:3001/api/health

---

## Troubleshooting

### Redis Connection Issues

**Check Redis:**
```bash
redis-cli ping
# Should return: PONG
```

**Restart Redis:**
```bash
brew services restart redis
```

**Check Backend Redis Config:**
```bash
cd backend
grep -r "REDIS" .env
```

### Frontend Build Issues

**Clear cache and restart:**
```bash
cd frontend
rm -rf .next
npm run dev
```

### Port Conflicts

**Free port 3001:**
```bash
lsof -ti:3001 | xargs kill -9
```

**Free port 3002:**
```bash
lsof -ti:3002 | xargs kill -9
```

### Database Issues

**Check PostgreSQL:**
```bash
psql -U postgres -c "SELECT version();"
```

**Run migrations:**
```bash
cd backend
npx prisma migrate dev
```

---

## Audit Report Available

Full system audit completed: **TEMPLATE_SYSTEM_AUDIT_REPORT.md**

**Final Verdict:** ✅ **Modern Document Platform**

- 20 real PDF templates
- NLP-powered content analysis
- Production-ready export engine
- Scalable architecture

---

## Next Steps After Startup

1. ✅ Verify backend responds: http://localhost:3001/api/health
2. ✅ Verify frontend loads: http://localhost:3002
3. ✅ Check template marketplace: http://localhost:3002/templates
4. ✅ Test PDF generation flow
5. ⚠️ Consider adding OpenAI API key for AI features

---

**Last Updated:** May 9, 2026  
**System Status:** Ready to start (cache cleared, Redis verified)
