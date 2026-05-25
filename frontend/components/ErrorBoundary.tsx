'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in child component tree
 * Logs errors and displays fallback UI
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // In production, you would send this to error tracking service like Sentry
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { extra: errorInfo });
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-[#F7E3E3] dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-[#9a3737] dark:text-red-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[#111111] dark:text-white">
                  Oops! Something went wrong
                </h1>
                <p className="text-[#6B6B6B] dark:text-[#C9C6BD] mt-1">
                  We encountered an unexpected error
                </p>
              </div>
            </div>

            {/* Error details in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 bg-[#FCF1F1] dark:bg-red-900/20 border border-[#F7E3E3] dark:border-red-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-[#7a2929] dark:text-red-400 mb-2">
                  Error Details (Development Mode)
                </h3>
                <pre className="text-xs text-[#7a2929] dark:text-red-300 overflow-x-auto whitespace-pre-wrap">
                  {this.state.error.toString()}
                  {this.state.errorInfo && (
                    <>
                      {'\n\n'}
                      {this.state.errorInfo.componentStack}
                    </>
                  )}
                </pre>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-4">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-6 py-3 bg-[#4F7563] hover:bg-[#355846] text-white rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl"
              >
                <RefreshCw className="w-5 h-5" />
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-6 py-3 bg-[#E3E1DA] hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-[#111111] dark:text-white rounded-lg font-medium transition-colors"
              >
                Go Home
              </button>
            </div>

            {/* Help text */}
            <div className="mt-6 pt-6 border-t border-[#E3E1DA] dark:border-gray-700">
              <p className="text-sm text-[#6B6B6B] dark:text-[#C9C6BD]">
                If this problem persists, please contact support or try refreshing the page.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Lightweight error boundary for specific sections
 */
export function SectionErrorBoundary({ 
  children, 
  sectionName 
}: { 
  children: ReactNode; 
  sectionName: string;
}) {
  return (
    <ErrorBoundary
      fallback={
        <div className="bg-[#FCF1F1] dark:bg-red-900/20 border border-[#F7E3E3] dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-5 h-5 text-[#9a3737] dark:text-red-400" />
            <h3 className="font-semibold text-red-900 dark:text-red-300">
              Error in {sectionName}
            </h3>
          </div>
          <p className="text-sm text-[#7a2929] dark:text-red-400">
            This section encountered an error. The rest of the page should still work.
          </p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
