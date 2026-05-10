'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Eye, Zap, Download } from 'lucide-react';

interface OnboardingHint {
  id: string;
  icon: typeof Sparkles;
  title: string;
  description: string;
  position: string; // Tailwind positioning classes
}

const hints: OnboardingHint[] = [
  {
    id: 'enhance',
    icon: Sparkles,
    title: 'Enhance Your Content',
    description: 'Use AI-powered enhancements to improve writing, fix grammar, or make content more professional.',
    position: 'top-24 right-8',
  },
  {
    id: 'preview',
    icon: Eye,
    title: 'Live Preview',
    description: 'See your document in real-time as you edit. Toggle preview mode with the Eye icon.',
    position: 'top-24 right-8',
  },
  {
    id: 'navigation',
    icon: Zap,
    title: 'Page Navigation',
    description: 'Navigate between pages using the sidebar or Next/Previous buttons.',
    position: 'top-1/2 left-8',
  },
  {
    id: 'export',
    icon: Download,
    title: 'Export Options',
    description: 'Export your document to PDF, DOCX, or PPTX format when ready.',
    position: 'top-24 right-96',
  },
];

export default function OnboardingTour() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has seen onboarding
    const hasSeenOnboarding = localStorage.getItem('pdfstudio_onboarding_complete');
    
    if (!hasSeenOnboarding) {
      // Show onboarding after 1 second
      setTimeout(() => setIsVisible(true), 1000);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < hints.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    setIsVisible(false);
    localStorage.setItem('pdfstudio_onboarding_complete', 'true');
  };

  if (!isVisible) return null;

  const currentHint = hints[currentStep];
  const Icon = currentHint.icon;

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black"
        onClick={handleSkip}
      />

      {/* Hint Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentHint.id}
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={`fixed z-50 w-96 rounded-xl bg-white p-6 shadow-2xl ${currentHint.position}`}
        >
          <button
            onClick={handleSkip}
            className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-full bg-gradient-to-br from-purple-500 to-blue-500 p-3">
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">{currentHint.title}</h3>
              <p className="text-xs text-gray-500">
                Step {currentStep + 1} of {hints.length}
              </p>
            </div>
          </div>

          <p className="mb-6 text-sm text-gray-600">{currentHint.description}</p>

          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {hints.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 w-8 rounded-full transition-colors ${
                    index === currentStep
                      ? 'bg-purple-600'
                      : index < currentStep
                      ? 'bg-purple-300'
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
              >
                Skip
              </button>
              <button
                onClick={handleNext}
                className="rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-2 text-sm font-medium text-white transition-shadow hover:shadow-lg"
              >
                {currentStep < hints.length - 1 ? 'Next' : 'Got it!'}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
