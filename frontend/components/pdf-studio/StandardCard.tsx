'use client';

import { motion } from 'framer-motion';
import { LucideIcon, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface FeatureItem {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  iconColor: string;
  iconBg: string;
}

interface CardProps {
  href: string;
  icon: LucideIcon;
  iconGradient: string; // e.g., 'from-blue-500 to-purple-600'
  title: string;
  subtitle: string;
  features: FeatureItem[];
  ctaText: string;
  ctaColor: string; // e.g., 'blue'
  badge?: {
    text: string;
    gradient: string; // e.g., 'from-blue-500 to-purple-600'
  };
  delay?: number;
}

export default function StandardCard({
  href,
  icon: Icon,
  iconGradient,
  title,
  subtitle,
  features,
  ctaText,
  ctaColor,
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
        <div className="group relative bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-200 h-full">
          <div className="relative z-10 p-8">
            {/* Badge */}
            {badge && (
              <div className={`absolute top-6 right-6 px-3 py-1 bg-gradient-to-r ${badge.gradient} text-white text-xs font-bold rounded-full`}>
                {badge.text}
              </div>
            )}

            {/* Icon */}
            <div className={`w-14 h-14 bg-gradient-to-br ${iconGradient} rounded-xl flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-300`}>
              <Icon className="w-7 h-7 text-white" />
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {title}
            </h3>
            
            {/* Subtitle */}
            <p className="text-sm text-slate-600 mb-6">
              {subtitle}
            </p>

            {/* Features */}
            <div className="space-y-3 mb-6">
              {features.map((feature, index) => {
                const FeatureIcon = feature.icon;
                return (
                  <div key={index} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg ${feature.iconBg} flex items-center justify-center flex-shrink-0`}>
                      <FeatureIcon className={`w-4 h-4 ${feature.iconColor}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{feature.title}</p>
                      <p className="text-xs text-slate-600">{feature.subtitle}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CTA */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <span className={`text-sm font-semibold text-${ctaColor}-600 group-hover:text-${ctaColor}-700`}>
                {ctaText}
              </span>
              <ArrowRight className={`w-5 h-5 text-${ctaColor}-600 group-hover:translate-x-1 transition-transform duration-300`} />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// Template Card Variant (for template grids)
interface TemplateCardProps {
  name: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  onClick: () => void;
  isLoading?: boolean;
}

export function TemplateCard({
  name,
  description,
  icon: Icon,
  iconColor,
  iconBg,
  onClick,
  isLoading = false,
}: TemplateCardProps) {
  return (
    <div
      className={`relative bg-white rounded-xl shadow-sm border-2 border-slate-200 hover:shadow-md hover:border-slate-300 transition-all p-6 ${!isLoading && 'cursor-pointer group'}`}
      onClick={() => !isLoading && onClick()}
    >
      <div className={`w-14 h-14 ${iconBg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300`}>
        <Icon className={`w-7 h-7 ${iconColor}`} />
      </div>
      
      <h3 className="text-lg font-semibold text-slate-900 mb-2">
        {name}
      </h3>
      
      <p className="text-sm text-slate-600 mb-4">
        {description}
      </p>
      
      <div className={`flex items-center text-sm font-medium ${isLoading ? 'text-slate-400' : 'text-blue-600 group-hover:text-blue-700'}`}>
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
            Creating...
          </>
        ) : (
          <>
            Create Document
            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-300" />
          </>
        )}
      </div>
    </div>
  );
}
