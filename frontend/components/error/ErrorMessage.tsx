'use client';

import { AlertCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ErrorSeverity = 'error' | 'warning' | 'info';

interface ErrorMessageProps {
  message: string;
  severity?: ErrorSeverity;
  details?: string[];
  onDismiss?: () => void;
  className?: string;
}

export function ErrorMessage({ 
  message, 
  severity = 'error', 
  details, 
  onDismiss,
  className 
}: ErrorMessageProps) {
  const config = {
    error: {
      bgColor: 'bg-[#FCF1F1]',
      borderColor: 'border-[#F7E3E3]',
      textColor: 'text-[#7a2929]',
      iconColor: 'text-[#D96A6A]',
      Icon: XCircle,
    },
    warning: {
      bgColor: 'bg-[#FAEEDB]',
      borderColor: 'border-[#F2DCAE]',
      textColor: 'text-[#735008]',
      iconColor: 'text-yellow-500',
      Icon: AlertTriangle,
    },
    info: {
      bgColor: 'bg-[#EEF5F1]',
      borderColor: 'border-[#DDE8E1]',
      textColor: 'text-[#263F34]',
      iconColor: 'text-[#4F7563]',
      Icon: Info,
    },
  };

  const { bgColor, borderColor, textColor, iconColor, Icon } = config[severity];

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        bgColor,
        borderColor,
        className
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', iconColor)} />
        
        <div className="flex-1 space-y-2">
          <p className={cn('text-sm font-medium', textColor)}>
            {message}
          </p>
          
          {details && details.length > 0 && (
            <ul className={cn('text-sm list-disc list-inside space-y-1', textColor)}>
              {details.map((detail, index) => (
                <li key={index}>{detail}</li>
              ))}
            </ul>
          )}
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className={cn(
              'flex-shrink-0 rounded hover:bg-opacity-20 p-1',
              textColor
            )}
            aria-label="Dismiss"
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default ErrorMessage;
