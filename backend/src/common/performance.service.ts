import { Injectable, Logger } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';

/**
 * Performance Optimization Service
 * Handles caching, memoization, and performance monitoring
 */
@Injectable()
export class PerformanceService {
  private readonly logger = new Logger(PerformanceService.name);
  private performanceMetrics: Map<string, number[]> = new Map();

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Cache wrapper with automatic key generation
   */
  async cached<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = 300, // 5 minutes default
  ): Promise<T> {
    // Check cache first
    const cached = await this.cacheManager.get<T>(key);
    if (cached !== undefined && cached !== null) {
      this.logger.debug(`Cache hit: ${key}`);
      return cached;
    }

    // Cache miss - fetch data
    this.logger.debug(`Cache miss: ${key}`);
    const data = await fetchFn();

    // Store in cache
    await this.cacheManager.set(key, data, ttl * 1000);

    return data;
  }

  /**
   * Invalidate cache by key pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    // Note: This requires Redis store for pattern-based deletion
    this.logger.log(`Invalidating cache pattern: ${pattern}`);
    // Implementation depends on cache store
    // For memory store, we'd need to track keys
  }

  /**
   * Measure execution time of a function
   */
  async measure<T>(
    operationName: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await fn();
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.recordMetric(operationName, duration);
      this.logger.debug(`${operationName} completed in ${duration.toFixed(2)}ms`);

      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      this.logger.error(`${operationName} failed after ${duration.toFixed(2)}ms`, error);
      throw error;
    }
  }

  /**
   * Record performance metric
   */
  private recordMetric(operation: string, duration: number): void {
    if (!this.performanceMetrics.has(operation)) {
      this.performanceMetrics.set(operation, []);
    }

    const metrics = this.performanceMetrics.get(operation)!;
    metrics.push(duration);

    // Keep only last 100 measurements
    if (metrics.length > 100) {
      metrics.shift();
    }
  }

  /**
   * Get performance statistics for an operation
   */
  getStats(operation: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    p95: number;
  } | null {
    const metrics = this.performanceMetrics.get(operation);
    if (!metrics || metrics.length === 0) {
      return null;
    }

    const sorted = [...metrics].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);

    return {
      count,
      avg: sum / count,
      min: sorted[0],
      max: sorted[count - 1],
      p95: sorted[Math.floor(count * 0.95)],
    };
  }

  /**
   * Get all performance statistics
   */
  getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    for (const [operation, _] of this.performanceMetrics) {
      stats[operation] = this.getStats(operation);
    }

    return stats;
  }

  /**
   * Batch operations with rate limiting
   */
  async batchProcess<T, R>(
    items: T[],
    processFn: (item: T) => Promise<R>,
    batchSize: number = 10,
    delayMs: number = 100,
  ): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map((item) => processFn(item)),
      );

      results.push(...batchResults);

      // Delay between batches to avoid overwhelming the system
      if (i + batchSize < items.length) {
        await this.delay(delayMs);
      }
    }

    return results;
  }

  /**
   * Debounce helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Memoize expensive function results
   */
  memoize<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    ttl: number = 300,
  ): T {
    const cache = new Map<string, { value: any; expires: number }>();

    return (async (...args: any[]) => {
      const key = JSON.stringify(args);
      const now = Date.now();

      // Check if cached and not expired
      const cached = cache.get(key);
      if (cached && cached.expires > now) {
        return cached.value;
      }

      // Compute and cache
      const value = await fn(...args);
      cache.set(key, {
        value,
        expires: now + ttl * 1000,
      });

      return value;
    }) as T;
  }

  /**
   * Clear all performance metrics
   */
  clearMetrics(): void {
    this.performanceMetrics.clear();
    this.logger.log('Performance metrics cleared');
  }
}
