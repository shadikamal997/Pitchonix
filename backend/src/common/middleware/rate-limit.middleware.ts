import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * PHASE Ω.3 — SECURITY HARDENING
 *
 * Rate limiting middleware to prevent abuse of ATS endpoints.
 *
 * Limits:
 * - ATS Analysis: 30 requests per minute per IP
 * - Job Matching: 30 requests per minute per IP
 * - Document Creation: 10 requests per minute per IP
 *
 * Uses in-memory storage (suitable for single-instance deployment).
 * For multi-instance, migrate to Redis.
 */
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private rateLimits: Map<string, RateLimitEntry> = new Map();

  // Cleanup old entries every 5 minutes
  constructor() {
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  use(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const path = req.path;

    // Define rate limits per endpoint
    let limit = 100; // Default: 100 requests/minute
    const window = 60 * 1000; // 1 minute

    if (path.includes('/career/ats/analyze')) {
      limit = 30; // 30 requests/minute for ATS analysis
    } else if (path.includes('/career/ats/match-job')) {
      limit = 30; // 30 requests/minute for job matching
    } else if (path.includes('/career/documents') && req.method === 'POST') {
      limit = 10; // 10 documents/minute
    } else if (path.includes('/career/ats/apply-fix')) {
      limit = 20; // 20 fixes/minute
    }

    const key = `${ip}:${path}`;
    const now = Date.now();
    const entry = this.rateLimits.get(key);

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      this.rateLimits.set(key, {
        count: 1,
        resetTime: now + window,
      });

      this.setRateLimitHeaders(res, limit, limit - 1, Math.floor(window / 1000));
      return next();
    }

    if (entry.count >= limit) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

      this.setRateLimitHeaders(res, limit, 0, retryAfter);

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Rate limit exceeded. Please try again later.',
          error: 'Too Many Requests',
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment counter
    entry.count++;
    this.rateLimits.set(key, entry);

    const remaining = limit - entry.count;
    const resetIn = Math.ceil((entry.resetTime - now) / 1000);

    this.setRateLimitHeaders(res, limit, remaining, resetIn);
    next();
  }

  private setRateLimitHeaders(res: Response, limit: number, remaining: number, resetIn: number) {
    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', resetIn.toString());
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.rateLimits.entries()) {
      if (now > entry.resetTime) {
        this.rateLimits.delete(key);
      }
    }
  }
}
