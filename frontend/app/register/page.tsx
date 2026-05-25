'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { PasswordStrengthMeter } from '@/components/PasswordStrengthMeter';

const registerSchema = z.object({
  name: z.string().optional(),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });
  const passwordValue = watch('password', '');

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/register', data);
      const { user, token } = response.data;
      login(user, token);
      router.push(user.onboardingCompleted ? '/dashboard' : '/onboarding');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4 md:p-8">
      {/* Main Container */}
      <div className="w-full max-w-[1150px] h-auto md:h-[700px] bg-white rounded-[40px] shadow-[0_8px_40px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side - Register Form */}
        <div className="w-full md:w-[45%] px-8 py-12 md:px-16 md:py-16 flex flex-col justify-center">
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
          <h1 className="text-4xl md:text-5xl font-bold text-black mb-4 leading-tight">
            Start building your story
          </h1>
          <p className="text-gray-600 text-base mb-10">
            Join thousands of founders creating investor-ready presentations.
          </p>

          {/* Phase Ω.3 — Social-login buttons removed.
              The auth backend currently supports email + password + magic-link
              only. Showing Google / Facebook / Apple buttons before OAuth is
              implemented misleads users; they're hidden until each provider
              is wired through to /auth/<provider> on the backend. */}

          {/* Register Form */}
          <form id="register-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <input
                type="text"
                placeholder="Name (optional)"
                {...register('name')}
                className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl focus:border-black focus:outline-none transition-colors text-base"
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-2">{errors.name.message}</p>
              )}
            </div>

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
                placeholder="Password (min. 6 characters)"
                {...register('password')}
                className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl focus:border-black focus:outline-none transition-colors text-base"
              />
              <PasswordStrengthMeter password={passwordValue} />
              {errors.password && (
                <p className="text-sm text-red-500 mt-2">{errors.password.message}</p>
              )}
            </div>

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
              <span>{loading ? 'Creating account...' : 'Create Account'}</span>
              {!loading && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>

          {/* Login Link */}
          <p className="text-center text-sm text-gray-600 mt-8">
            Already have an account?{' '}
            <Link href="/login" className="text-black font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        {/* Right Side - Hero Video/Image */}
        <div className="w-full md:w-[55%] relative overflow-hidden hidden md:block p-8">
          <div className="w-full h-full rounded-[36px] overflow-hidden relative">
            {/* Hero Video */}
            <video
              autoPlay
              muted
              loop
              playsInline
              poster="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=1200&auto=format&fit=crop"
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src="/videos/hero/register-hero.mp4" type="video/mp4" />
              {/* Fallback image if video doesn't load */}
              <img
                src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=1200&auto=format&fit=crop"
                alt="Team collaboration"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </video>
            
            {/* Dark Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
            
            {/* Bottom Text Overlay */}
            <div className="absolute bottom-12 left-12 text-white z-10">
              <h2 className="text-4xl font-bold mb-3">Join the movement</h2>
              <p className="text-lg text-white/90">Transform your ideas into powerful presentations.</p>
            </div>

            {/* Floating Stat Card */}
            <div className="absolute top-12 right-12 bg-white rounded-3xl p-6 shadow-xl z-10 w-[220px]">
              <div className="flex items-center space-x-3 mb-4">
                <TrendingUp className="w-6 h-6 text-black" />
                <div>
                  <div className="text-4xl font-bold text-black">5k+</div>
                  <div className="text-sm text-gray-600 mt-1">Decks created daily</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => document.getElementById('register-form')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full bg-black text-white py-2.5 px-4 rounded-xl text-sm font-semibold hover:bg-gray-900 transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
