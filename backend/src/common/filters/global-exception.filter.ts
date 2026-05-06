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
    let message = 'Internal server error';
    let error = 'InternalServerError';
    let details: any = undefined;

    // Handle HttpException
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || message;
        error = responseObj.error || error;
        details = responseObj.details;
      }
    }
    // Handle standard Error
    else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
    }
    // Handle unknown errors
    else {
      message = String(exception);
    }

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

    // Include stack trace in development
    if (process.env.NODE_ENV === 'development' && exception instanceof Error) {
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
