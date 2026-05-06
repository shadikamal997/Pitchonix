'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      // e.g., Sentry.captureException(error);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard';
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="max-w-2xl w-full p-8">
            <div className="flex flex-col items-center text-center space-y-6">
              {/* Error Icon */}
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>

              {/* Error Message */}
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  Oops! Something went wrong
                </h1>
                <p className="text-gray-600">
                  We encountered an unexpected error. Don't worry, your data is safe.
                </p>
              </div>

              {/* Error Details (dev mode only) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="w-full text-left">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                    Error Details (Development)
                  </summary>
                  <div className="mt-4 p-4 bg-gray-100 rounded-lg overflow-auto">
                    <p className="text-sm font-mono text-red-600 mb-2">
                      {this.state.error.toString()}
                    </p>
                    {this.state.errorInfo && (
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={this.handleReset}
                  variant="default"
                  className="gap-2"
                >
                  <RefreshCcw className="w-4 h-4" />
                  Try Again
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="gap-2"
                >
                  <Home className="w-4 h-4" />
                  Go to Dashboard
                </Button>
              </div>

              {/* Help Text */}
              <p className="text-sm text-gray-500">
                If this problem persists, please contact our support team.
              </p>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
