import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

interface BrowserInstance {
  browser: puppeteer.Browser;
  inUse: boolean;
  lastUsed: Date;
}

@Injectable()
export class BrowserPoolService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BrowserPoolService.name);
  private readonly pool: BrowserInstance[] = [];
  private readonly maxPoolSize = 3; // Maximum number of browser instances
  private readonly maxIdleTime = 5 * 60 * 1000; // 5 minutes
  private cleanupInterval: NodeJS.Timeout;

  async onModuleInit() {
    this.logger.log('Initializing browser pool...');
    
    // Pre-warm the pool with one browser instance
    try {
      await this.createBrowserInstance();
      this.logger.log('Browser pool initialized with 1 instance');
    } catch (error) {
      this.logger.error('Failed to initialize browser pool', error.stack);
    }

    // Start cleanup interval (every 2 minutes)
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleBrowsers();
    }, 2 * 60 * 1000);
  }

  async onModuleDestroy() {
    this.logger.log('Destroying browser pool...');
    
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
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
    this.logger.log('Browser pool destroyed');
  }

  /**
   * Get a browser instance from the pool
   */
  async getBrowser(): Promise<puppeteer.Browser> {
    // Find an available browser
    const available = this.pool.find((instance) => !instance.inUse);

    if (available) {
      available.inUse = true;
      available.lastUsed = new Date();
      this.logger.debug('Reusing existing browser instance');
      return available.browser;
    }

    // Create a new browser if pool is not at max capacity
    if (this.pool.length < this.maxPoolSize) {
      this.logger.debug('Creating new browser instance');
      const instance = await this.createBrowserInstance();
      instance.inUse = true;
      return instance.browser;
    }

    // Wait for a browser to become available
    this.logger.debug('Pool at max capacity, waiting for available browser...');
    return this.waitForAvailableBrowser();
  }

  /**
   * Release a browser back to the pool
   */
  releaseBrowser(browser: puppeteer.Browser): void {
    const instance = this.pool.find((inst) => inst.browser === browser);
    
    if (instance) {
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
        this.releaseBrowser(browser);
        return result;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Browser execution failed (attempt ${attempt}/${maxRetries}): ${error.message}`);

        // If the browser crashed, evict it so a fresh instance is created next time
        const isCrash = error.message?.includes('disconnected') || error.message?.includes('Protocol error');
        if (isCrash) {
          const index = this.pool.findIndex(inst => inst.browser === browser);
          if (index > -1) {
            try { await browser.close(); } catch (_) {}
            this.pool.splice(index, 1);
            this.logger.warn('Evicted crashed browser from pool');
          }
          released = true;
        } else {
          this.releaseBrowser(browser);
          released = true;
        }

        if (attempt < maxRetries) {
          await new Promise(res => setTimeout(res, 500 * Math.pow(2, attempt - 1)));
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
      inUse: this.pool.filter((i) => i.inUse).length,
      available: this.pool.filter((i) => !i.inUse).length,
      maxPoolSize: this.maxPoolSize,
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
      }
    });

    return instance;
  }

  /**
   * Wait for a browser to become available, with a 30-second timeout.
   */
  private async waitForAvailableBrowser(): Promise<puppeteer.Browser> {
    const timeoutMs = 30_000;
    const pollMs = 100;
    const start = Date.now();

    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const available = this.pool.find((instance) => !instance.inUse);
        if (available) {
          clearInterval(checkInterval);
          available.inUse = true;
          available.lastUsed = new Date();
          resolve(available.browser);
          return;
        }
        if (Date.now() - start > timeoutMs) {
          clearInterval(checkInterval);
          reject(new Error('Timed out waiting for a browser from the pool (30s)'));
        }
      }, pollMs);
    });
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
