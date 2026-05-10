# DECK GENERATION FIX

## Problem Diagnosis

After investigation, found that:
1. Users create projects via wizard (status: "draft")
2. When they click "Generate", `/api/generate` endpoint is NOT being called
3. Projects remain in "draft" status with 0 decks
4. Users see "No decks yet" message

## Root Cause

The frontend wizard at `/app/create/page.tsx` calls:
- `/api/projects` to create project  
- `/api/generate` to generate deck

But the generation call may be failing silently or not reaching the backend.

## Solution

Add a manual generation button on the project page for draft projects, and ensure the generation endpoint works correctly.

### Files to Fix:
1. `/frontend/app/projects/[id]/page.tsx` - Add "Generate Deck" button for draft projects  
2. Verify `/api/generate` endpoint is working

### Test Steps:
1. Create a new pitch deck project
2. Check if deck is created
3. If not, click "Generate Deck" button on project page
4. Verify deck and slides are created
