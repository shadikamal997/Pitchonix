'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Suspense } from 'react';

function MagicLinkContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const login = useAuthStore((state) => state.login);

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No sign-in token found in the link.');
      return;
    }

    api.get(`/auth/magic-link/verify?token=${token}`)
      .then((res) => {
        const { user, token: jwt } = res.data;
        login(user, jwt);
        setStatus('success');
        setTimeout(() => router.push(user.onboardingCompleted ? '/dashboard' : '/onboarding'), 1500);
      })
      .catch((err: any) => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'This sign-in link is invalid or has expired.');
      });
  }, [token, login, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-10 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 text-violet-500 animate-spin mx-auto mb-4" />
              <h1 className="text-xl font-bold text-black mb-2">Signing you in…</h1>
              <p className="text-gray-500 text-sm">Just a moment.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-black mb-2">Signed in!</h1>
              <p className="text-gray-500 text-sm">Taking you to your dashboard…</p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-black mb-2">Sign-in failed</h1>
              <p className="text-gray-500 text-sm mb-6">{message}</p>
              <Link
                href="/login"
                className="inline-block bg-black text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-900 transition-colors text-sm"
              >
                Back to login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MagicLinkPage() {
  return (
    <Suspense>
      <MagicLinkContent />
    </Suspense>
  );
}
