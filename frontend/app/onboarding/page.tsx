'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Palette, FolderOpen, Download, CheckCircle, ArrowRight } from 'lucide-react';

const STEPS = [
  {
    id: 1,
    icon: Palette,
    title: 'Set up your brand',
    description: 'Add your logo, brand colors, and fonts so every document looks consistent.',
    cta: 'Go to Brand Kit',
    href: '/brand-kits',
    skip: 'Skip for now',
  },
  {
    id: 2,
    icon: FolderOpen,
    title: 'Create your first project',
    description: 'Choose a document type — pitch deck, business plan, proposal, and more.',
    cta: 'Create project',
    href: '/create',
    skip: 'Skip for now',
  },
  {
    id: 3,
    icon: Download,
    title: 'Export & share',
    description: 'Download as PDF, export to PowerPoint, or share a live link with stakeholders.',
    cta: 'Explore export options',
    href: '/export-templates',
    skip: 'Skip for now',
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [step, setStep] = useState(0);
  const [completing, setCompleting] = useState(false);

  const current = STEPS[step];

  const advance = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      complete();
    }
  };

  const complete = async () => {
    setCompleting(true);
    try {
      await api.post('/auth/onboarding/complete');
      if (user) setUser({ ...user, onboardingCompleted: true });
    } catch {
      // non-blocking
    } finally {
      router.push('/dashboard');
    }
  };

  const Icon = current.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i <= step ? 'bg-violet-600 w-10' : 'bg-gray-200 w-6'
              }`}
            />
          ))}
        </div>

        <div className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] p-10 text-center">
          <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Icon className="w-8 h-8 text-violet-600" />
          </div>

          <p className="text-sm font-medium text-violet-600 mb-2">Step {step + 1} of {STEPS.length}</p>
          <h1 className="text-2xl font-bold text-black mb-3">{current.title}</h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-8">{current.description}</p>

          <div className="space-y-3">
            <button
              onClick={() => { router.push(current.href); }}
              className="w-full flex items-center justify-center gap-2 bg-black text-white py-3.5 rounded-xl font-semibold hover:bg-gray-900 transition-colors"
            >
              {current.cta}
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={advance}
              className="w-full py-3 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              {step < STEPS.length - 1 ? current.skip : 'Go to dashboard'}
            </button>
          </div>
        </div>

        {/* Skip all */}
        <p className="text-center mt-6">
          <button
            onClick={complete}
            disabled={completing}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Skip setup and go to dashboard →
          </button>
        </p>
      </div>
    </div>
  );
}
