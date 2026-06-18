import { ServiceUnavailableException } from '@nestjs/common';
import { BrowserPoolService } from '../browser-pool.service';
import { PdfExportService } from '../pdf-export.service';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fakeBrowser() {
  const page = {
    setContent: jest.fn(async () => undefined),
    setViewport: jest.fn(async () => undefined),
    evaluate: jest.fn(async () => undefined),
    pdf: jest.fn(async () => Buffer.from('%PDF-1.4')),
    close: jest.fn(async () => undefined),
  };
  const browser = {
    newPage: jest.fn(async () => page),
    close: jest.fn(async () => undefined),
    on: jest.fn(),
  };
  return { browser, page };
}

function makePool(options: { concurrency?: number; timeoutMs?: number; prewarm?: boolean } = {}) {
  process.env.PDF_EXPORT_CONCURRENCY = String(options.concurrency ?? 1);
  process.env.PDF_EXPORT_QUEUE_TIMEOUT_MS = String(options.timeoutMs ?? 50);
  process.env.PDF_BROWSER_PREWARM = options.prewarm === true ? 'true' : 'false';

  const service: any = new BrowserPoolService();
  const created: Array<ReturnType<typeof fakeBrowser>> = [];
  service.createBrowserInstance = jest.fn(async () => {
    const pair = fakeBrowser();
    created.push(pair);
    const instance = {
      browser: pair.browser,
      inUse: false,
      lastUsed: new Date(),
    };
    service.pool.push(instance);
    return instance;
  });

  return { service: service as BrowserPoolService, raw: service, created };
}

describe('BrowserPoolService PDF export backpressure', () => {
  afterEach(() => {
    delete process.env.PDF_EXPORT_CONCURRENCY;
    delete process.env.PDF_EXPORT_QUEUE_TIMEOUT_MS;
    delete process.env.PDF_BROWSER_PREWARM;
  });

  it('starts the first export immediately', async () => {
    const { service } = makePool({ concurrency: 1 });

    const browser = await service.getBrowser();

    expect(browser).toBeDefined();
    expect(service.getStats()).toMatchObject({
      activeRenderCount: 1,
      queued: 0,
      maxPoolSize: 1,
    });
  });

  it('respects the concurrency limit and lets a queued export wait for a slot', async () => {
    const { service } = makePool({ concurrency: 1, timeoutMs: 500 });
    const first = await service.getBrowser();

    const queued = service.getBrowser();
    await delay(10);
    expect(service.getStats()).toMatchObject({ activeRenderCount: 1, queued: 1 });

    service.releaseBrowser(first);
    const second = await queued;

    expect(second).toBe(first);
    expect(service.getStats()).toMatchObject({ activeRenderCount: 1, queued: 0 });
    service.releaseBrowser(second);
    expect(service.getStats().activeRenderCount).toBe(0);
  });

  it('does not create more browsers than the limit under parallel acquisition', async () => {
    const { service, raw, created } = makePool({ concurrency: 3, timeoutMs: 500 });
    raw.createBrowserInstance = jest.fn(async () => {
      await delay(20);
      const pair = fakeBrowser();
      created.push(pair);
      const instance = {
        browser: pair.browser,
        inUse: false,
        lastUsed: new Date(),
      };
      raw.pool.push(instance);
      return instance;
    });

    let maxActive = 0;
    const pending = Array.from({ length: 20 }, () =>
      service.executeWithBrowser(async () => {
        maxActive = Math.max(maxActive, service.getStats().activeRenderCount);
        await delay(5);
        return 'ok';
      }, 1),
    );
    await delay(10);

    expect(service.getStats().creatingBrowsers).toBeLessThanOrEqual(3);
    expect(created.length).toBeLessThanOrEqual(3);

    await Promise.all(pending);
    expect(created).toHaveLength(3);
    expect(maxActive).toBeLessThanOrEqual(3);
    expect(service.getStats().maxPoolSize).toBe(3);
    expect(service.getStats().activeRenderCount).toBe(0);
  });

  it('returns a controlled 503 when the queue timeout is exceeded', async () => {
    const { service } = makePool({ concurrency: 1, timeoutMs: 20 });
    const first = await service.getBrowser();

    await expect(service.getBrowser()).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(service.getStats()).toMatchObject({ activeRenderCount: 1, queued: 0, timeoutCount: 1 });

    service.releaseBrowser(first);
  });

  it('releases the active slot after a failed render', async () => {
    const { service } = makePool({ concurrency: 1 });

    await expect(
      service.executeWithBrowser(async () => {
        throw new Error('render failed');
      }, 1),
    ).rejects.toThrow('render failed');

    expect(service.getStats()).toMatchObject({
      activeRenderCount: 0,
      available: 1,
      failedExports: 1,
    });
  });
});

describe('BrowserPoolService lifecycle', () => {
  afterEach(() => {
    delete process.env.PDF_EXPORT_CONCURRENCY;
    delete process.env.PDF_EXPORT_QUEUE_TIMEOUT_MS;
    delete process.env.PDF_BROWSER_PREWARM;
  });

  it('prewarms a browser with a readiness page', async () => {
    const { service, created } = makePool({ concurrency: 1, prewarm: true });

    await service.onModuleInit();

    expect(created).toHaveLength(1);
    expect(created[0].browser.newPage).toHaveBeenCalledTimes(1);
    expect(created[0].page.setContent).toHaveBeenCalledWith(
      '<!doctype html><title>pdf-browser-ready</title>',
      expect.objectContaining({ waitUntil: 'domcontentloaded' }),
    );
    expect(created[0].page.close).toHaveBeenCalledTimes(1);

    await service.onModuleDestroy();
  });

  it('closes browsers and rejects queued waiters on shutdown', async () => {
    const { service, created } = makePool({ concurrency: 1, timeoutMs: 500 });
    const first = await service.getBrowser();
    const queued = service.getBrowser();

    await delay(10);
    await service.onModuleDestroy();

    await expect(queued).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(created[0].browser.close).toHaveBeenCalledTimes(1);
    expect(service.getStats()).toMatchObject({ totalBrowsers: 0, queued: 0 });

    // The browser has been destroyed; releasing an old handle should not underflow counters.
    service.releaseBrowser(first);
    expect(service.getStats().activeRenderCount).toBe(0);
  });

  it('closes the page after PDF rendering', async () => {
    const pair = fakeBrowser();
    const pdfExport: any = Object.create(PdfExportService.prototype);
    pdfExport.browserPoolService = {
      executeWithBrowser: async (callback: (browser: any) => Promise<Buffer>) =>
        callback(pair.browser),
    };

    const buffer = await pdfExport.htmlToPDF('<!doctype html><p>Ready</p>', 'A4', 'standard');

    expect(buffer.toString()).toContain('%PDF');
    expect(pair.page.close).toHaveBeenCalledTimes(1);
  });

  it('does not grow active browser count after repeated exports', async () => {
    const { service } = makePool({ concurrency: 2 });

    for (let i = 0; i < 5; i += 1) {
      await service.executeWithBrowser(async () => `ok-${i}`, 1);
      expect(service.getStats().activeRenderCount).toBe(0);
    }

    expect(service.getStats().totalBrowsers).toBeLessThanOrEqual(2);
  });
});
