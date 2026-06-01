'use client';

import { motion } from 'framer-motion';
import { LucideIcon, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface FeatureItem {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  iconColor?: string;
  iconBg?: string;
}

interface CardProps {
  href: string;
  icon: LucideIcon;
  iconGradient?: string;
  title: string;
  subtitle: string;
  features: FeatureItem[];
  ctaText: string;
  ctaColor?: string;
  badge?: {
    text: string;
    gradient?: string;
  };
  delay?: number;
}

// Phase Δ — Soft Sage card matching the dashboard design language.
export default function StandardCard({
  href,
  icon: Icon,
  title,
  subtitle,
  features,
  ctaText,
  badge,
  delay = 0,
}: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
    >
      <Link href={href}>
        <div className="group pn-card p-5 h-full transition-all hover:-translate-y-0.5 hover:shadow-lifted relative">
          {/* Badge */}
          {badge && (
            <div className="absolute top-4 right-4 px-2.5 py-0.5 bg-[#111114] text-white text-[10px] font-bold rounded-full">
              {badge.text}
            </div>
          )}

          {/* Icon */}
          <div className="w-10 h-10 bg-[#EEF5F1] text-[#4F7563] rounded-xl flex items-center justify-center mb-3 group-hover:bg-[#DDE8E1] transition-colors">
            <Icon className="w-5 h-5" />
          </div>

          <h3 className="text-base font-bold text-[#111111] mb-1">{title}</h3>
          <p className="text-xs text-[#6B6B6B] mb-4 leading-relaxed">{subtitle}</p>

          {/* Features */}
          <div className="space-y-2 mb-4">
            {features.map((feature, index) => {
              const FeatureIcon = feature.icon;
              return (
                <div key={index} className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#EEF5F1] text-[#4F7563] flex items-center justify-center flex-shrink-0">
                    <FeatureIcon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#111111] leading-tight">{feature.title}</p>
                    <p className="text-[11px] text-[#9A9A9A] leading-tight">{feature.subtitle}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#F1F0EC]">
            <span className="text-xs font-semibold text-[#4F7563] group-hover:text-[#355846]">
              {ctaText}
            </span>
            <ArrowRight className="w-4 h-4 text-[#4F7563] group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

interface TemplateCardProps {
  name: string;
  description: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  onClick: () => void;
  isLoading?: boolean;
}

export function TemplateCard({
  name,
  description,
  icon: Icon,
  onClick,
  isLoading = false,
}: TemplateCardProps) {
  return (
    <div
      className={`group pn-card p-6 transition-all ${!isLoading && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lifted'}`}
      onClick={() => !isLoading && onClick()}
    >
      <div className="w-12 h-12 rounded-2xl bg-[#EEF5F1] text-[#4F7563] flex items-center justify-center mb-4">
        <Icon className="w-5 h-5" />
      </div>

      <h3 className="text-base font-semibold text-[#111111] mb-1.5">{name}</h3>
      <p className="text-sm text-[#6B6B6B] mb-4 leading-relaxed">{description}</p>

      <div className={`flex items-center text-sm font-semibold ${isLoading ? 'text-[#9A9A9A]' : 'text-[#4F7563] group-hover:text-[#355846]'}`}>
        {isLoading ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 mr-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </motion.div>
            Creating…
          </>
        ) : (
          <>
            Create Document
            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </>
        )}
      </div>
    </div>
  );
}
