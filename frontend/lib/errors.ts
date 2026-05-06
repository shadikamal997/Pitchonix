/**
 * Error handling utilities and types for the frontend
 */

export enum ErrorCode {
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',
  
  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  
  // Server errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // Business logic errors
  GENERATION_FAILED = 'GENERATION_FAILED',
  EXPORT_FAILED = 'EXPORT_FAILED',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  
  // Unknown
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode?: number;
  public readonly details?: any;
  public readonly retryable: boolean;
  public readonly userMessage: string;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    statusCode?: number,
    details?: any,
    retryable: boolean = false
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.retryable = retryable;
    this.userMessage = this.getUserFriendlyMessage();
  }

  private getUserFriendlyMessage(): string {
    const messages: Record<ErrorCode, string> = {
      [ErrorCode.NETWORK_ERROR]: 'Unable to connect to the server. Please check your internet connection.',
      [ErrorCode.TIMEOUT]: 'The request took too long. Please try again.',
      [ErrorCode.CONNECTION_REFUSED]: 'Cannot connect to the server. Please try again later.',
      
      [ErrorCode.UNAUTHORIZED]: 'Your session has expired. Please log in again.',
      [ErrorCode.FORBIDDEN]: 'You do not have permission to perform this action.',
      [ErrorCode.TOKEN_EXPIRED]: 'Your session has expired. Please log in again.',
      
      [ErrorCode.VALIDATION_ERROR]: 'Please check your input and try again.',
      [ErrorCode.INVALID_INPUT]: 'Some fields contain invalid data. Please review and correct them.',
      [ErrorCode.MISSING_REQUIRED_FIELD]: 'Please fill in all required fields.',
      
      [ErrorCode.NOT_FOUND]: 'The requested resource was not found.',
      [ErrorCode.ALREADY_EXISTS]: 'This resource already exists.',
      
      [ErrorCode.INTERNAL_SERVER_ERROR]: 'Something went wrong on our end. Please try again later.',
      [ErrorCode.SERVICE_UNAVAILABLE]: 'The service is temporarily unavailable. Please try again later.',
      
      [ErrorCode.GENERATION_FAILED]: 'Failed to generate your document. Please try again.',
      [ErrorCode.EXPORT_FAILED]: 'Failed to export your document. Please try again.',
      [ErrorCode.UPLOAD_FAILED]: 'Failed to upload file. Please check the file and try again.',
      
      [ErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
    };

    return messages[this.code] || this.message || 'An error occurred.';
  }
}

/**
 * Parse axios error into AppError
 */
export function parseApiError(error: any): AppError {
  // Network errors
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return new AppError(
      'Request timeout',
      ErrorCode.TIMEOUT,
      undefined,
      error,
      true
    );
  }

  if (error.code === 'ECONNREFUSED') {
    return new AppError(
      'Connection refused',
      ErrorCode.CONNECTION_REFUSED,
      undefined,
      error,
      true
    );
  }

  if (!error.response) {
    return new AppError(
      'Network error',
      ErrorCode.NETWORK_ERROR,
      undefined,
      error,
      true
    );
  }

  const status = error.response.status;
  const data = error.response.data;

  // Map HTTP status codes to error codes
  switch (status) {
    case 401:
      return new AppError(
        data?.message || 'Unauthorized',
        ErrorCode.UNAUTHORIZED,
        401,
        data,
        false
      );
    
    case 403:
      return new AppError(
        data?.message || 'Forbidden',
        ErrorCode.FORBIDDEN,
        403,
        data,
        false
      );
    
    case 404:
      return new AppError(
        data?.message || 'Not found',
        ErrorCode.NOT_FOUND,
        404,
        data,
        false
      );
    
    case 409:
      return new AppError(
        data?.message || 'Already exists',
        ErrorCode.ALREADY_EXISTS,
        409,
        data,
        false
      );
    
    case 422:
    case 400:
      return new AppError(
        data?.message || 'Validation error',
        ErrorCode.VALIDATION_ERROR,
        status,
        data,
        false
      );
    
    case 500:
      return new AppError(
        data?.message || 'Internal server error',
        ErrorCode.INTERNAL_SERVER_ERROR,
        500,
        data,
        true
      );
    
    case 503:
      return new AppError(
        data?.message || 'Service unavailable',
        ErrorCode.SERVICE_UNAVAILABLE,
        503,
        data,
        true
      );
    
    default:
      return new AppError(
        data?.message || 'Unknown error',
        ErrorCode.UNKNOWN_ERROR,
        status,
        data,
        status >= 500
      );
  }
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  retryDelay: number; // milliseconds
  retryableErrors: ErrorCode[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  retryableErrors: [
    ErrorCode.NETWORK_ERROR,
    ErrorCode.TIMEOUT,
    ErrorCode.CONNECTION_REFUSED,
    ErrorCode.INTERNAL_SERVER_ERROR,
    ErrorCode.SERVICE_UNAVAILABLE,
  ],
};

/**
 * Check if error is retryable
 */
export function isRetryable(error: AppError, config: RetryConfig = DEFAULT_RETRY_CONFIG): boolean {
  return error.retryable && config.retryableErrors.includes(error.code);
}

/**
 * Sleep utility for retry delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: Record<string, string[]>): string[] {
  const messages: string[] = [];
  
  for (const [field, fieldErrors] of Object.entries(errors)) {
    const fieldName = field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    fieldErrors.forEach(error => {
      messages.push(`${fieldName}: ${error}`);
    });
  }
  
  return messages;
}

/**
 * Log error for debugging/monitoring
 */
export function logError(error: AppError, context?: string): void {
  if (process.env.NODE_ENV === 'development') {
    console.group(`[AppError] ${context || 'Error occurred'}`);
    console.error('Code:', error.code);
    console.error('Message:', error.message);
    console.error('User Message:', error.userMessage);
    console.error('Status:', error.statusCode);
    console.error('Retryable:', error.retryable);
    if (error.details) {
      console.error('Details:', error.details);
    }
    console.error('Stack:', error.stack);
    console.groupEnd();
  }

  // In production, send to error tracking service
  // e.g., Sentry, LogRocket, etc.
}
