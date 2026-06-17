'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';

export default function GoogleCallbackPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const hash = window.location.hash.replace(/^#/, '');
      const params = new URLSearchParams(hash);
      const token = params.get('token');
      const userParam = params.get('user');

      if (!token || !userParam) {
        setError('Google sign-in did not return a valid session.');
        return;
      }

      const user = JSON.parse(userParam);
      login(user, token);
      router.replace(user.onboardingCompleted ? '/dashboard' : '/onboarding');
    } catch {
      setError('Could not finish Google sign-in. Please try again.');
    }
  }, [login, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-md rounded-[32px] bg-white p-8 text-center shadow-[0_8px_40px_rgba(0,0,0,0.08)]">
        <div className="mx-auto mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-black text-lg font-bold text-white">
          P
        </div>
        <h1 className="text-2xl font-bold text-black">
          {error ? 'Sign-in failed' : 'Signing you in'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          {error || 'Finishing your Google sign-in and taking you to your workspace.'}
        </p>
        {error && (
          <Link
            href="/login"
            className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-black px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-gray-900"
          >
            Back to login
          </Link>
        )}
      </div>
    </div>
  );
}
