'use client';

import React from 'react';
import { Zap, Shield, Clock, Users, TrendingUp, Award, Globe, Lock } from 'lucide-react';

export interface Feature {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface FeatureGridProps {
  features?: Feature[];
  title?: string;
  subtitle?: string;
  columns?: 2 | 3 | 4;
  onChange?: (features: Feature[]) => void;
}

const iconMap: Record<string, any> = {
  zap: Zap,
  shield: Shield,
  clock: Clock,
  users: Users,
  trending: TrendingUp,
  award: Award,
  globe: Globe,
  lock: Lock,
};

const defaultFeatures: Feature[] = [
  {
    id: '1',
    icon: 'zap',
    title: 'Lightning Fast',
    description: 'Blazing fast performance with optimized infrastructure',
  },
  {
    id: '2',
    icon: 'shield',
    title: 'Secure & Reliable',
    description: 'Enterprise-grade security with 99.9% uptime guarantee',
  },
  {
    id: '3',
    icon: 'users',
    title: 'Team Collaboration',
    description: 'Work together seamlessly with real-time collaboration',
  },
  {
    id: '4',
    icon: 'trending',
    title: 'Analytics Dashboard',
    description: 'Track performance with comprehensive analytics',
  },
  {
    id: '5',
    icon: 'globe',
    title: 'Global CDN',
    description: 'Fast content delivery worldwide with edge locations',
  },
  {
    id: '6',
    icon: 'award',
    title: '24/7 Support',
    description: 'Round-the-clock customer support from experts',
  },
];

export function FeatureGridBlock({
  features = defaultFeatures,
  title = 'Key Features',
  subtitle = 'Everything you need to succeed',
  columns = 3,
  onChange,
}: FeatureGridProps) {
  return (
    <div className="w-full py-8">
      {/* Header */}
      {title && (
        <div className="text-center mb-10">
          <h3 className="text-3xl font-bold text-[#111111] mb-2">{title}</h3>
          {subtitle && <p className="text-sm text-[#6B6B6B]">{subtitle}</p>}
        </div>
      )}

      {/* Feature Grid */}
      <div className={`grid grid-cols-${columns} gap-6`}>
        {features.map((feature) => {
          const IconComponent = iconMap[feature.icon] || Zap;

          return (
            <div
              key={feature.id}
              className="group bg-white border-2 border-[#E3E1DA] rounded-2xl p-6 hover:border-green-400 hover:shadow-xl transition-all cursor-pointer"
            >
              {/* Icon */}
              <div className="w-14 h-14 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-green-100 group-hover:to-emerald-100 transition-all">
                <IconComponent className="h-7 w-7 text-[#4F7563]" />
              </div>

              {/* Title */}
              <h4 className="text-lg font-bold text-[#111111] mb-2 group-hover:text-[#355846] transition-colors">
                {feature.title}
              </h4>

              {/* Description */}
              <p className="text-sm text-[#6B6B6B] leading-relaxed">
                {feature.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default FeatureGridBlock;
