import { Injectable, Logger } from '@nestjs/common';

/**
 * Rate Limiter for OpenAI API calls
 * Implements token bucket algorithm
 */
@Injectable()
export class RateLimiter {
  private readonly logger = new Logger(RateLimiter.name);
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second

  constructor(
    maxTokens: number = 10, // Max concurrent requests
    refillRate: number = 2, // Requests per second
  ) {
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  /**
   * Attempt to consume a token
   * Returns true if successful, false if rate limited
   */
  async consume(cost: number = 1): Promise<boolean> {
    this.refill();

    if (this.tokens >= cost) {
      this.tokens -= cost;
      return true;
    }

    return false;
  }

  /**
   * Wait until a token is available
   */
  async waitForToken(cost: number = 1): Promise<void> {
    while (!(await this.consume(cost))) {
      const waitTime = Math.ceil((cost - this.tokens) / this.refillRate) * 1000;
      this.logger.debug(`Rate limited, waiting ${waitTime}ms`);
      await this.delay(waitTime);
    }
  }

  /**
   * Refill tokens based on time elapsed
   */
  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000; // seconds
    const tokensToAdd = timePassed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Get current token count
   */
  getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  /**
   * Reset rate limiter
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Retry Strategy for failed API calls
 */
export class RetryStrategy {
  private readonly logger = new Logger(RetryStrategy.name);

  constructor(
    private maxRetries: number = 3,
    private initialDelay: number = 1000,
    private maxDelay: number = 10000,
    private backoffMultiplier: number = 2,
  ) {}

  /**
   * Execute function with retry logic
   */
  async execute<T>(
    fn: () => Promise<T>,
    context: string,
  ): Promise<T> {
    let lastError: Error | null = null;
    let delay = this.initialDelay;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Don't retry on certain errors
        if (this.shouldNotRetry(error)) {
          this.logger.error(`${context} failed (non-retryable): ${error.message}`);
          throw error;
        }

        if (attempt < this.maxRetries) {
          this.logger.warn(
            `${context} failed (attempt ${attempt}/${this.maxRetries}): ${error.message}. Retrying in ${delay}ms...`,
          );
          await this.delay(delay);
          delay = Math.min(delay * this.backoffMultiplier, this.maxDelay);
        }
      }
    }

    this.logger.error(`${context} failed after ${this.maxRetries} attempts`);
    throw lastError;
  }

  /**
   * Check if error should not be retried
   */
  private shouldNotRetry(error: any): boolean {
    // Don't retry on authentication errors
    if (error.status === 401 || error.status === 403) {
      return true;
    }

    // Don't retry on invalid request errors
    if (error.status === 400 || error.status === 422) {
      return true;
    }

    // Retry on rate limits, server errors, network errors
    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Cost Tracker for OpenAI API usage
 */
export class CostTracker {
  private readonly logger = new Logger(CostTracker.name);
  private totalTokens: number = 0;
  private totalRequests: number = 0;
  private totalCost: number = 0;

  // GPT-4 Turbo pricing (as of 2024)
  private readonly INPUT_COST_PER_1K = 0.01; // $0.01 per 1K input tokens
  private readonly OUTPUT_COST_PER_1K = 0.03; // $0.03 per 1K output tokens

  /**
   * Track a request
   */
  trackRequest(inputTokens: number, outputTokens: number): void {
    const inputCost = (inputTokens / 1000) * this.INPUT_COST_PER_1K;
    const outputCost = (outputTokens / 1000) * this.OUTPUT_COST_PER_1K;
    const requestCost = inputCost + outputCost;

    this.totalTokens += inputTokens + outputTokens;
    this.totalRequests += 1;
    this.totalCost += requestCost;

    this.logger.debug(
      `Request cost: $${requestCost.toFixed(4)} (${inputTokens} in + ${outputTokens} out)`,
    );
  }

  /**
   * Get usage summary
   */
  getSummary(): {
    requests: number;
    tokens: number;
    estimatedCost: number;
  } {
    return {
      requests: this.totalRequests,
      tokens: this.totalTokens,
      estimatedCost: parseFloat(this.totalCost.toFixed(4)),
    };
  }

  /**
   * Log summary
   */
  logSummary(): void {
    const summary = this.getSummary();
    this.logger.log(
      `API Usage: ${summary.requests} requests, ${summary.tokens.toLocaleString()} tokens, ~$${summary.estimatedCost}`,
    );
  }

  /**
   * Reset tracker
   */
  reset(): void {
    this.totalTokens = 0;
    this.totalRequests = 0;
    this.totalCost = 0;
  }
}
