import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

// Phase Δ — Premium soft empty-state used across the dashboard.
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-14 px-6 text-center rounded-3xl bg-white border border-[#E3E1DA]/70 shadow-[0_20px_50px_rgba(38,63,52,0.06)]',
        className
      )}
    >
      <div className="w-16 h-16 rounded-full bg-[#EEF5F1] text-[#4F7563] flex items-center justify-center mb-4">
        <Icon className="h-7 w-7" />
      </div>

      <h3 className="text-[18px] font-bold text-[#111111] tracking-tight mb-1.5">
        {title}
      </h3>

      <p className="text-sm text-[#6B6B6B] mb-5 max-w-md leading-relaxed">
        {description}
      </p>

      {action && <div>{action}</div>}
    </div>
  );
};
