'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import { ArrowRight } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [code, setCode] = useState('');
  const login = useAuthStore((state) => state.login);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', {
        ...data,
        code: twoFactorRequired ? code : undefined,
      });

      // Account has 2FA enabled and no/blank code was sent — prompt for it.
      if (response.data?.twoFactorRequired) {
        setTwoFactorRequired(true);
        setError('');
        return;
      }

      const { user, token } = response.data;
      login(user, token);
      router.push(user.onboardingCompleted ? '/dashboard' : '/onboarding');
    } catch (err: any) {
      // err is an AppError (no .response). Use .message which contains the
      // backend's original error text (e.g. "Invalid credentials").
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white py-8 px-4 md:px-8">
      {/* Main Container */}
      <div className="w-full max-w-[1150px] bg-white rounded-[40px] shadow-[0_8px_40px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col md:flex-row">

        {/* Left Side - Login Form */}
        <div className="w-full md:w-[45%] px-8 py-12 md:px-16 md:py-14 flex flex-col justify-center">
          {/* Logo */}
          <Link href="/" className="mb-12">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="text-xl font-bold text-black">Pitchonix</span>
            </div>
          </Link>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-black mb-4 leading-tight">
            Welcome back to Pitchonix
          </h1>
          <p className="text-gray-600 text-base leading-relaxed mb-10">
            Create investor-ready decks, business plans, and proposals in minutes.
          </p>

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <input
                type="email"
                placeholder="Email address"
                {...register('email')}
                className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl focus:border-black focus:outline-none transition-colors text-base"
              />
              {errors.email && (
                <p className="text-sm text-red-500 mt-2">{errors.email.message}</p>
              )}
            </div>

            <div>
              <input
                type="password"
                placeholder="Password"
                {...register('password')}
                className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl focus:border-black focus:outline-none transition-colors text-base"
              />
              {errors.password && (
                <p className="text-sm text-red-500 mt-2">{errors.password.message}</p>
              )}
            </div>

            {twoFactorRequired && (
              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="6-digit authentication code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl focus:border-black focus:outline-none transition-colors text-base tracking-[0.3em]"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Enter the code from your authenticator app to finish signing in.
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-4 px-6 rounded-2xl font-semibold text-base hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <span>{loading ? 'Please wait...' : 'Sign In'}</span>
              {!loading && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>

          {/* Forgot Password */}
          <p className="text-center text-sm text-gray-500 mt-4">
            <Link href="/forgot-password" className="hover:text-black transition-colors">
              Forgot your password?
            </Link>
          </p>

          {/* Register Link */}
          <p className="text-center text-sm text-gray-600 mt-6">
            Don't have an account?{' '}
            <Link href="/register" className="text-black font-semibold hover:underline">
              Create account
            </Link>
          </p>
        </div>

        {/* Right Side - Hero Video/Image */}
        <div className="w-full md:w-[55%] relative overflow-hidden hidden md:flex md:items-stretch p-8 min-h-[700px]">
          <div className="flex-1 min-h-0 rounded-[36px] overflow-hidden relative">
            {/* Hero Video */}
            <video
              autoPlay
              muted
              loop
              playsInline
              poster="https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=1200&auto=format&fit=crop"
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src="/videos/hero/login-hero.mp4" type="video/mp4" />
              {/* Fallback image if video doesn't load */}
              <img
                src="https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=1200&auto=format&fit=crop"
                alt="Business professional"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </video>
            
            {/* Dark Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
            
            {/* Bottom Text Overlay */}
            <div className="absolute bottom-12 left-12 text-white z-10">
              <h2 className="text-4xl font-bold tracking-tight mb-3">Build with confidence</h2>
              <p className="text-lg text-white/90 leading-relaxed">Turn your idea into a polished business story.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
