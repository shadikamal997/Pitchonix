'use client';

import React from 'react';
import { ArrowRight, Mail, Phone, Calendar, ExternalLink } from 'lucide-react';

export interface CTABlockProps {
  title?: string;
  subtitle?: string;
  primaryButtonText?: string;
  primaryButtonIcon?: string;
  secondaryButtonText?: string;
  secondaryButtonIcon?: string;
  style?: 'centered' | 'split' | 'card' | 'minimal';
  colorScheme?: 'green' | 'blue' | 'purple' | 'orange';
  onChange?: (data: any) => void;
}

const iconMap: Record<string, any> = {
  arrow: ArrowRight,
  mail: Mail,
  phone: Phone,
  calendar: Calendar,
  external: ExternalLink,
};

export function CTABlock({
  title = 'Ready to Get Started?',
  subtitle = 'Join thousands of satisfied customers and transform your workflow today.',
  primaryButtonText = 'Start Free Trial',
  primaryButtonIcon = 'arrow',
  secondaryButtonText = 'Contact Sales',
  secondaryButtonIcon = 'mail',
  style = 'centered',
  colorScheme = 'green',
  onChange,
}: CTABlockProps) {
  const PrimaryIcon = iconMap[primaryButtonIcon] || ArrowRight;
  const SecondaryIcon = iconMap[secondaryButtonIcon] || Mail;

  const colorClasses = {
    green: {
      bg: 'from-green-600 to-emerald-500',
      button: 'bg-white text-[#355846] hover:bg-[#EDEBE6]',
      buttonSecondary: 'border-white text-white hover:bg-white/10',
    },
    blue: {
      bg: 'from-blue-600 to-cyan-500',
      button: 'bg-white text-[#355846] hover:bg-[#EDEBE6]',
      buttonSecondary: 'border-white text-white hover:bg-white/10',
    },
    purple: {
      bg: 'from-purple-600 to-pink-500',
      button: 'bg-white text-[#355846] hover:bg-[#EDEBE6]',
      buttonSecondary: 'border-white text-white hover:bg-white/10',
    },
    orange: {
      bg: 'from-orange-600 to-amber-500',
      button: 'bg-white text-[#735008] hover:bg-[#EDEBE6]',
      buttonSecondary: 'border-white text-white hover:bg-white/10',
    },
  };

  const colors = colorClasses[colorScheme];

  if (style === 'centered') {
    return (
      <div className={`w-full py-16 bg-gradient-to-br ${colors.bg} rounded-3xl text-white text-center`}>
        <div className="max-w-3xl mx-auto px-8">
          <h2 className="text-4xl font-bold mb-4">{title}</h2>
          <p className="text-lg text-white/90 mb-8">{subtitle}</p>
          <div className="flex items-center justify-center gap-4">
            <button className={`${colors.button} px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2`}>
              {primaryButtonText}
              <PrimaryIcon className="h-5 w-5" />
            </button>
            <button className={`${colors.buttonSecondary} border-2 px-8 py-4 rounded-xl font-bold text-lg transition-all flex items-center gap-2`}>
              <SecondaryIcon className="h-5 w-5" />
              {secondaryButtonText}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (style === 'split') {
    return (
      <div className={`w-full bg-gradient-to-br ${colors.bg} rounded-3xl overflow-hidden`}>
        <div className="grid grid-cols-2 gap-8 items-center p-12">
          <div className="text-white">
            <h2 className="text-4xl font-bold mb-4">{title}</h2>
            <p className="text-lg text-white/90">{subtitle}</p>
          </div>
          <div className="flex flex-col gap-4">
            <button className={`${colors.button} px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2`}>
              {primaryButtonText}
              <PrimaryIcon className="h-5 w-5" />
            </button>
            <button className={`${colors.buttonSecondary} border-2 px-8 py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2`}>
              <SecondaryIcon className="h-5 w-5" />
              {secondaryButtonText}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (style === 'card') {
    return (
      <div className="w-full bg-white border-2 border-[#E3E1DA] rounded-3xl p-12 shadow-xl">
        <div className="text-center mb-8">
          <div className={`w-16 h-16 mx-auto bg-gradient-to-br ${colors.bg} rounded-2xl flex items-center justify-center mb-6`}>
            <PrimaryIcon className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-[#111111] mb-4">{title}</h2>
          <p className="text-[#6B6B6B] text-lg">{subtitle}</p>
        </div>
        <div className="flex items-center justify-center gap-4">
          <button className={`bg-gradient-to-r ${colors.bg} text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2`}>
            {primaryButtonText}
            <PrimaryIcon className="h-5 w-5" />
          </button>
          <button className="border-2 border-[#E3E1DA] text-[#111111] px-8 py-4 rounded-xl font-bold text-lg hover:bg-[#EDEBE6] transition-all flex items-center gap-2">
            <SecondaryIcon className="h-5 w-5" />
            {secondaryButtonText}
          </button>
        </div>
      </div>
    );
  }

  // minimal style
  return (
    <div className="w-full py-12 border-t-2 border-b-2 border-[#E3E1DA]">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-[#111111] mb-2">{title}</h3>
          <p className="text-[#6B6B6B]">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <button className={`bg-gradient-to-r ${colors.bg} text-white px-6 py-3 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2`}>
            {primaryButtonText}
            <PrimaryIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default CTABlock;
