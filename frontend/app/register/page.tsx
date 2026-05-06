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
  const [socialMessage, setSocialMessage] = useState('');
  const login = useAuthStore((state) => state.login);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/register', data);
      const { user, token } = response.data;
      login(user, token);
      router.push('/dashboard');
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

          {/* Social Login Buttons */}
          <div className="flex space-x-4 mb-2">
            <button
              type="button"
              onClick={() => setSocialMessage('Social login coming soon!')}
              className="w-14 h-14 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-gray-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setSocialMessage('Social login coming soon!')}
              className="w-14 h-14 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-gray-300 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setSocialMessage('Social login coming soon!')}
              className="w-14 h-14 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-gray-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="#000" viewBox="0 0 24 24">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
            </button>
          </div>
          {socialMessage && (
            <p className="text-sm text-gray-500 mb-6">{socialMessage}</p>
          )}

          {/* Divider */}
          <div className="flex items-center mb-8">
            <div className="flex-1 border-t border-gray-200"></div>
            <span className="px-4 text-sm text-gray-500">Or</span>
            <div className="flex-1 border-t border-gray-200"></div>
          </div>

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
