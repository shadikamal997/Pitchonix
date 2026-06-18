import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as puppeteer from 'puppeteer';

interface BrowserInstance {
  browser: puppeteer.Browser;
  inUse: boolean;
  lastUsed: Date;
}

interface BrowserWaiter {
  resolve: (browser: puppeteer.Browser) => void;
  reject: (error: Error) => void;
  enqueuedAt: number;
  timer: NodeJS.Timeout;
}

@Injectable()
export class BrowserPoolService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BrowserPoolService.name);
  private readonly pool: BrowserInstance[] = [];
  private readonly maxPoolSize = positiveInt(process.env.PDF_EXPORT_CONCURRENCY, 3);
  private readonly queueTimeoutMs = positiveInt(process.env.PDF_EXPORT_QUEUE_TIMEOUT_MS, 30_000);
  private readonly shouldPrewarm = process.env.PDF_BROWSER_PREWARM !== 'false';
  private readonly maxIdleTime = 5 * 60 * 1000; // 5 minutes
  private readonly waiters: BrowserWaiter[] = [];
  private activeRenderCount = 0;
  private creatingBrowserCount = 0;
  private completedExports = 0;
  private failedExports = 0;
  private timeoutCount = 0;
  private totalQueueWaitMs = 0;
  private queueWaitSamples = 0;
  private cleanupInterval: NodeJS.Timeout;

  async onModuleInit() {
    this.logger.log(
      `Initializing browser pool (concurrency=${this.maxPoolSize}, queueTimeoutMs=${this.queueTimeoutMs}, prewarm=${this.shouldPrewarm})...`,
    );

    if (this.shouldPrewarm) {
      try {
        await this.prewarmBrowser();
        this.logger.log('Browser pool prewarmed and ready');
      } catch (error) {
        this.logger.error('Failed to prewarm browser pool', (error as Error).stack);
      }
    }

    // Start cleanup interval (every 2 minutes)
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupIdleBrowsers();
      },
      2 * 60 * 1000,
    );
  }

  async onModuleDestroy() {
    this.logger.log('Destroying browser pool...');

    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    while (this.waiters.length) {
      const waiter = this.waiters.shift();
      if (!waiter) continue;
      clearTimeout(waiter.timer);
      waiter.reject(new ServiceUnavailableException('PDF export browser pool is shutting down') as any);
    }

    // Close all browsers
    const closePromises = this.pool.map(async (instance) => {
      try {
        await instance.browser.close();
      } catch (error) {
        this.logger.warn('Error closing browser instance', error.message);
      }
    });

    await Promise.all(closePromises);
    this.pool.length = 0;
    this.activeRenderCount = 0;
    this.logger.log('Browser pool destroyed');
  }

  /**
   * Get a browser instance from the pool
   */
  async getBrowser(): Promise<puppeteer.Browser> {
    // Find an available browser
    const available = this.pool.find((instance) => !instance.inUse);

    if (available) {
      this.markBrowserAcquired(available);
      available.lastUsed = new Date();
      this.logger.debug('Reusing existing browser instance');
      return available.browser;
    }

    // Create a new browser if pool is not at max capacity
    if (this.hasBrowserCapacity()) {
      this.logger.debug('Creating new browser instance');
      return this.createAndAcquireBrowser();
    }

    return this.enqueueBrowserWaiter();
  }

  /**
   * Release a browser back to the pool
   */
  releaseBrowser(browser: puppeteer.Browser): void {
    const instance = this.pool.find((inst) => inst.browser === browser);

    if (instance) {
      this.activeRenderCount = Math.max(0, this.activeRenderCount - 1);

      const waiter = this.waiters.shift();
      if (waiter) {
        clearTimeout(waiter.timer);
        this.recordQueueWait(waiter.enqueuedAt);
        instance.inUse = true;
        instance.lastUsed = new Date();
        this.activeRenderCount += 1;
        waiter.resolve(instance.browser);
        this.logger.debug('Browser handed to queued PDF export');
        return;
      }

      instance.inUse = false;
      instance.lastUsed = new Date();
      this.logger.debug('Browser released back to pool');
    } else {
      this.logger.warn('Attempted to release unknown browser instance');
    }
  }

  /**
   * Execute a function with a browser from the pool.
   * Retries up to 3 times with exponential backoff on failure.
   */
  async executeWithBrowser<T>(
    fn: (browser: puppeteer.Browser) => Promise<T>,
    maxRetries = 3,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const browser = await this.getBrowser();
      let released = false;

      try {
        const result = await fn(browser);
        this.completedExports += 1;
        this.releaseBrowser(browser);
        released = true;
        return result;
      } catch (error) {
        lastError = error as Error;
        this.failedExports += 1;
        this.logger.warn(
          `Browser execution failed (attempt ${attempt}/${maxRetries}): ${error.message}`,
        );

        // If the browser crashed, evict it so a fresh instance is created next time
        const isCrash =
          error.message?.includes('disconnected') || error.message?.includes('Protocol error');
        if (isCrash) {
          const index = this.pool.findIndex((inst) => inst.browser === browser);
          if (index > -1) {
            try {
              await browser.close();
            } catch (_) {}
            this.pool.splice(index, 1);
            this.activeRenderCount = Math.max(0, this.activeRenderCount - 1);
            this.logger.warn('Evicted crashed browser from pool');
            this.dispatchQueuedWaiter();
          }
          released = true;
        } else {
          this.releaseBrowser(browser);
          released = true;
        }

        if (attempt < maxRetries) {
          await new Promise((res) => setTimeout(res, 500 * Math.pow(2, attempt - 1)));
        }
      }
    }

    throw lastError ?? new Error('Browser execution failed after all retries');
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      totalBrowsers: this.pool.length,
      creatingBrowsers: this.creatingBrowserCount,
      inUse: this.pool.filter((i) => i.inUse).length,
      available: this.pool.filter((i) => !i.inUse).length,
      maxPoolSize: this.maxPoolSize,
      queued: this.waiters.length,
      activeRenderCount: this.activeRenderCount,
      completedExports: this.completedExports,
      failedExports: this.failedExports,
      timeoutCount: this.timeoutCount,
      averageQueueWaitMs:
        this.queueWaitSamples > 0 ? Math.round(this.totalQueueWaitMs / this.queueWaitSamples) : 0,
    };
  }

  /**
   * Create a new browser instance
   */
  private async createBrowserInstance(): Promise<BrowserInstance> {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=794,1123', // A4 dimensions
      ],
    });

    const instance: BrowserInstance = {
      browser,
      inUse: false,
      lastUsed: new Date(),
    };

    this.pool.push(instance);

    // Handle browser disconnection
    browser.on('disconnected', () => {
      this.logger.warn('Browser disconnected, removing from pool');
      const index = this.pool.indexOf(instance);
      if (index > -1) {
        this.pool.splice(index, 1);
        if (instance.inUse) {
          this.activeRenderCount = Math.max(0, this.activeRenderCount - 1);
        }
        void this.dispatchQueuedWaiter();
      }
    });

    return instance;
  }

  private async prewarmBrowser(): Promise<void> {
    const instance = await this.createBrowserInstance();
    const page = await instance.browser.newPage();
    try {
      await page.setContent('<!doctype html><title>pdf-browser-ready</title>', {
        waitUntil: 'domcontentloaded',
        timeout: 10_000,
      });
    } finally {
      await page.close();
    }
  }

  private enqueueBrowserWaiter(): Promise<puppeteer.Browser> {
    this.logger.debug('PDF export concurrency limit reached, queueing render request...');
    const enqueuedAt = Date.now();
    return new Promise((resolve, reject) => {
      const waiter: BrowserWaiter = {
        enqueuedAt,
        resolve,
        reject,
        timer: setTimeout(() => {
          const index = this.waiters.indexOf(waiter);
          if (index > -1) this.waiters.splice(index, 1);
          this.timeoutCount += 1;
          reject(
            new ServiceUnavailableException(
              `PDF export queue timeout exceeded (${this.queueTimeoutMs}ms)`,
            ) as any,
          );
        }, this.queueTimeoutMs),
      };
      this.waiters.push(waiter);
    });
  }

  private async dispatchQueuedWaiter(): Promise<void> {
    if (!this.waiters.length) return;
    let available = this.pool.find((instance) => !instance.inUse);
    if (!available && this.hasBrowserCapacity()) {
      try {
        available = await this.createBrowserInstanceWithCapacityReservation();
      } catch (error) {
        this.logger.error('Failed to create replacement browser for queued export', error);
        return;
      }
    }
    if (!available) return;
    const waiter = this.waiters.shift();
    if (!waiter) return;
    clearTimeout(waiter.timer);
    this.recordQueueWait(waiter.enqueuedAt);
    this.markBrowserAcquired(available);
    waiter.resolve(available.browser);
  }

  private markBrowserAcquired(instance: BrowserInstance): void {
    instance.inUse = true;
    instance.lastUsed = new Date();
    this.activeRenderCount += 1;
  }

  private hasBrowserCapacity(): boolean {
    return this.pool.length + this.creatingBrowserCount < this.maxPoolSize;
  }

  private async createAndAcquireBrowser(): Promise<puppeteer.Browser> {
    const instance = await this.createBrowserInstanceWithCapacityReservation();
    this.markBrowserAcquired(instance);
    return instance.browser;
  }

  private async createBrowserInstanceWithCapacityReservation(): Promise<BrowserInstance> {
    this.creatingBrowserCount += 1;
    try {
      return await this.createBrowserInstance();
    } finally {
      this.creatingBrowserCount = Math.max(0, this.creatingBrowserCount - 1);
    }
  }

  private recordQueueWait(enqueuedAt: number): void {
    this.totalQueueWaitMs += Date.now() - enqueuedAt;
    this.queueWaitSamples += 1;
  }

  /**
   * Clean up idle browsers
   */
  private async cleanupIdleBrowsers(): Promise<void> {
    const now = new Date();
    const instancesToRemove: BrowserInstance[] = [];

    for (const instance of this.pool) {
      if (!instance.inUse) {
        const idleTime = now.getTime() - instance.lastUsed.getTime();

        // Keep at least 1 browser in the pool
        if (idleTime > this.maxIdleTime && this.pool.length > 1) {
          instancesToRemove.push(instance);
        }
      }
    }

    if (instancesToRemove.length > 0) {
      this.logger.log(`Cleaning up ${instancesToRemove.length} idle browser(s)`);

      for (const instance of instancesToRemove) {
        try {
          await instance.browser.close();
          const index = this.pool.indexOf(instance);
          if (index > -1) {
            this.pool.splice(index, 1);
          }
        } catch (error) {
          this.logger.warn('Error closing idle browser', error.message);
        }
      }
    }
  }
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
