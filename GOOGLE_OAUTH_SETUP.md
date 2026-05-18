# Google Sign-In Setup Guide

This guide will help you set up Google OAuth authentication for Pitchonix.

## Backend Changes Made

1. ✅ Added Google OAuth fields to User model (`googleId`, `picture`)
2. ✅ Created Google OAuth strategy (`backend/src/auth/google.strategy.ts`)
3. ✅ Added `validateGoogleUser()` method to AuthService
4. ✅ Added Google OAuth endpoints to AuthController (`/auth/google`, `/auth/google/callback`)
5. ✅ Updated AuthModule to include GoogleStrategy

## Frontend Changes Made

1. ✅ Created GoogleSignInButton component (`frontend/components/ui/google-signin-button.tsx`)
2. ✅ Added Google Sign-In button to login page
3. ✅ Added Google Sign-In button to register page

## Setup Instructions

### Step 1: Install Google OAuth Package

The `passport-google-oauth20` package needs to be installed. Run:

```bash
cd backend
npm install --save passport-google-oauth20 @types/passport-google-oauth20
```

### Step 2: Create Google OAuth App

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth 2.0 Client ID"
5. Configure the OAuth consent screen:
   - User Type: External
   - App name: Pitchonix
   - User support email: your-email@example.com
   - Developer contact: your-email@example.com
6. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Name: Pitchonix Web
   - Authorized JavaScript origins:
     - `http://localhost:3200` (frontend dev)
   - Authorized redirect URIs:
     - `http://localhost:4000/auth/google/callback` (backend dev)
     - Add production URLs when deploying

7. Copy the Client ID and Client Secret

### Step 3: Update Environment Variables

Add these to your `backend/.env` file:

```env
GOOGLE_CLIENT_ID="your-google-client-id-here"
GOOGLE_CLIENT_SECRET="your-google-client-secret-here"
GOOGLE_CALLBACK_URL="http://localhost:4000/auth/google/callback"
```

For production, update the callback URL to your production domain.

### Step 4: Run Database Migration

Run the Prisma migration to add the Google OAuth fields:

```bash
cd backend
npx prisma migrate dev --name add-google-oauth
```

If you encounter issues, you can also run:

```bash
npx prisma db push
```

### Step 5: Test Google Sign-In

1. Start the backend:
   ```bash
   cd backend
   npm run start:dev
   ```

2. Start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. Navigate to http://localhost:3200/login
4. Click "Continue with Google"
5. Complete the Google sign-in flow
6. You should be redirected back and logged in

## How It Works

1. User clicks "Continue with Google" button
2. Frontend redirects to `http://localhost:4000/auth/google`
3. Backend redirects to Google OAuth consent screen
4. User authenticates with Google
5. Google redirects back to `http://localhost:4000/auth/google/callback`
6. Backend validates the Google token and:
   - Creates a new user if they don't exist
   - Links the Google account if the email already exists
   - Returns JWT token and user data
7. Frontend receives the token and logs the user in

## Production Deployment

When deploying to production:

1. Update Google OAuth app with production URLs:
   - Authorized origins: `https://your-domain.com`
   - Redirect URIs: `https://your-api-domain.com/auth/google/callback`

2. Update environment variables:
   ```env
   GOOGLE_CALLBACK_URL="https://your-api-domain.com/auth/google/callback"
   ```

3. Make sure CORS is configured to allow your frontend domain

## Troubleshooting

### Error: "redirect_uri_mismatch"
- Make sure the redirect URI in Google Console exactly matches your GOOGLE_CALLBACK_URL
- Include the protocol (http:// or https://)

### Error: "Cannot read properties of null"
- Make sure passport-google-oauth20 is installed
- Restart the backend server after installing

### User is redirected but not logged in
- Check that the frontend NEXT_PUBLIC_API_URL is set correctly
- Verify JWT token is being returned from backend
- Check browser console for errors

## Security Notes

- Google OAuth users are automatically verified (no email verification needed)
- Users can link their Google account to an existing email account
- Password field is optional for OAuth users
- Make sure to keep your Google Client Secret secure and never commit it to version control
