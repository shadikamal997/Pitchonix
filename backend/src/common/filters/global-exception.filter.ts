import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

export interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string;
  error?: string;
  details?: any;
  stack?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string = 'Internal server error';
    let error: string | undefined;
    let details: any = undefined;

    // Handle HttpException
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        // Phase audit fix — message can be an array (class-validator) or an
        // object (when the caller throws `new BadRequestException({ ... })`).
        // Stringify cleanly instead of letting it become "[object Object]".
        message = normaliseMessage(responseObj.message) || message;
        error   = responseObj.error;
        details = responseObj.details;
      }
    }
    // Handle standard Error
    else if (exception instanceof Error) {
      message = exception.message;
      error   = exception.name;
    }
    // Handle unknown errors
    else {
      message = String(exception);
    }

    // Phase audit fix — derive a sensible `error` label from the HTTP status
    // when the exception didn't supply one. Previously every 401/404/etc
    // came out tagged as "InternalServerError" because the default never
    // got overridden.
    if (!error) error = errorLabelFor(status);

    // Build error response
    const errorResponse: ErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error,
      details,
    };

    // Phase audit fix — only leak stack traces when explicitly opted in.
    // Treat the default (no NODE_ENV set) as "non-development" so dev-mode
    // runs of `nest start` don't accidentally publish stack traces.
    const isExplicitlyDev = process.env.NODE_ENV === 'development' && process.env.EXPOSE_STACK_TRACES === '1';
    if (isExplicitlyDev && exception instanceof Error) {
      errorResponse.stack = exception.stack;
    }

    // Log the error
    const logMessage = `[${request.method}] ${request.url} - ${status} - ${message}`;
    
    if (status >= 500) {
      this.logger.error(logMessage, exception instanceof Error ? exception.stack : '');
    } else if (status >= 400) {
      this.logger.warn(logMessage);
    }

    // Send response
    response.status(status).json(errorResponse);
  }
}

// =============================================================================
//  Helpers
// =============================================================================

function normaliseMessage(raw: unknown): string {
  if (raw == null) return '';
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) return raw.map((m) => normaliseMessage(m)).filter(Boolean).join('; ');
  if (typeof raw === 'object') {
    // class-validator nested error → pull constraint messages if present.
    const r = raw as any;
    if (r.message) return normaliseMessage(r.message);
    try { return JSON.stringify(raw); } catch { return String(raw); }
  }
  return String(raw);
}

function errorLabelFor(status: number): string {
  switch (status) {
    case 400: return 'Bad Request';
    case 401: return 'Unauthorized';
    case 403: return 'Forbidden';
    case 404: return 'Not Found';
    case 405: return 'Method Not Allowed';
    case 409: return 'Conflict';
    case 410: return 'Gone';
    case 422: return 'Unprocessable Entity';
    case 429: return 'Too Many Requests';
    case 500: return 'Internal Server Error';
    case 502: return 'Bad Gateway';
    case 503: return 'Service Unavailable';
    default:  return 'Error';
  }
}
