import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const delay = Date.now() - now;
          
          this.logger.log(
            `${method} ${url} ${response.statusCode} - ${delay}ms`
          );

          // Log request body in development (excluding sensitive data)
          if (process.env.NODE_ENV === 'development' && body && Object.keys(body).length > 0) {
            const sanitizedBody = this.sanitizeBody(body);
            this.logger.debug(`Request body: ${JSON.stringify(sanitizedBody)}`);
          }
        },
        error: (error) => {
          const delay = Date.now() - now;
          this.logger.error(
            `${method} ${url} ERROR - ${delay}ms - ${error.message}`
          );
        },
      })
    );
  }

  private sanitizeBody(body: any): any {
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }
}
