'use client';

import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string;
  height?: string;
  animate?: boolean;
}

export function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
  animate = true,
}: SkeletonProps) {
  const baseClasses = 'bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%]';
  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const style: React.CSSProperties = {
    width: width || (variant === 'circular' ? '40px' : '100%'),
    height: height || (variant === 'circular' ? '40px' : undefined),
  };

  const Component = animate ? motion.div : 'div';

  return (
    <Component
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
      {...(animate && {
        animate: {
          backgroundPosition: ['0% 0%', '200% 0%'],
        },
        transition: {
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear',
        },
      })}
    />
  );
}

export function EditorSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="mx-auto max-w-7xl p-8">
        {/* Header Skeleton */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton variant="circular" width="40px" height="40px" />
            <Skeleton width="200px" height="32px" />
          </div>
          <div className="flex gap-3">
            <Skeleton width="100px" height="40px" className="rounded-lg" />
            <Skeleton width="100px" height="40px" className="rounded-lg" />
            <Skeleton width="120px" height="40px" className="rounded-lg" />
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="grid gap-8 lg:grid-cols-[250px_1fr_1fr]">
          {/* Sidebar */}
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} height="80px" className="rounded-xl" />
            ))}
          </div>

          {/* Editor */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <Skeleton width="60%" height="24px" className="mb-4" />
            <Skeleton height="200px" className="mb-4 rounded-lg" />
            <div className="space-y-2">
              <Skeleton height="16px" />
              <Skeleton height="16px" width="90%" />
              <Skeleton height="16px" width="95%" />
              <Skeleton height="16px" width="85%" />
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <Skeleton width="40%" height="20px" className="mb-4" />
            <Skeleton height="400px" className="rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PreviewSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <Skeleton width="120px" height="20px" />
        <Skeleton variant="circular" width="32px" height="32px" />
      </div>
      <div className="flex-1 p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <Skeleton height="300px" className="rounded-lg shadow-sm" />
          <Skeleton height="2px" width="100%" />
          <Skeleton height="300px" className="rounded-lg shadow-sm" />
        </div>
      </div>
    </div>
  );
}
