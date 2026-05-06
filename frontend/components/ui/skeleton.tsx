import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'card' | 'text' | 'circular';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'default',
  ...props
}) => {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-700';

  const variantClasses = {
    default: 'rounded-md',
    card: 'rounded-xl h-48',
    text: 'rounded h-4',
    circular: 'rounded-full',
  };

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
      {...props}
    />
  );
};

export const ProjectCardSkeleton: React.FC = () => {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-md">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <Skeleton variant="circular" className="w-12 h-12" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="w-8 h-8 rounded-lg" />
      </div>
      
      <Skeleton className="h-16 w-full mb-4" />
      
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>
    </div>
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {Array.from({ length: 6 }).map((_, i) => (
        <ProjectCardSkeleton key={i} />
      ))}
    </div>
  );
};
