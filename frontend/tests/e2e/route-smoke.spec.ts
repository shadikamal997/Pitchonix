import { expect, test } from '@playwright/test';
import { installApiMocks } from './helpers/api-mocks';
import { installAuthenticatedSession } from './helpers/auth';

const routes = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Projects', path: '/projects' },
  { name: 'Project Detail', path: '/projects/e2e-project' },
  { name: 'Presentation Editor', path: '/projects/e2e-project/edit/e2e-slide' },
  { name: 'PDF Studio', path: '/pdf-studio' },
  { name: 'PDF Studio Editor', path: '/pdf-studio/editor/e2e-document' },
  { name: 'Career Docs', path: '/career' },
  { name: 'Career Builder', path: '/career/builder/e2e-document' },
  { name: 'Excel Studio', path: '/excel-studio' },
  { name: 'Excel Studio Editor', path: '/excel-studio/editor/e2e-document' },
  { name: 'Convert', path: '/convert' },
  { name: 'Feasibility Studio', path: '/feasibility-studio' },
  { name: 'Feasibility Editor', path: '/feasibility-studio/editor/e2e-document' },
  { name: 'Brand Kits', path: '/brand-kits' },
  { name: 'Analytics', path: '/analytics' },
  { name: 'Settings', path: '/settings' },
  { name: 'Help', path: '/help' },
];

function isKnownNextPrefetchNoise(message: string) {
  return (
    (message.includes("Failed to fetch RSC payload") && message.includes("Falling back to browser navigation")) ||
    (message.includes("Access to fetch at 'http://localhost:3202/login") &&
      message.includes("from origin 'http://127.0.0.1:3202'") &&
      message.includes('has been blocked by CORS policy'))
  );
}

test.describe('major route smoke certification', () => {
  test.beforeEach(async ({ page }) => {
    const consoleErrors: string[] = [];
    const failedApiRequests: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().startsWith('Failed to load resource:')) {
        const text = msg.text();
        if (!isKnownNextPrefetchNoise(text)) consoleErrors.push(text);
      }
    });
    page.on('pageerror', (error) => {
      consoleErrors.push(error.message);
    });
    page.on('response', (response) => {
      if (response.url().includes('/api/') && response.status() >= 400) {
        failedApiRequests.push(`${response.status()} ${response.url()}`);
      }
    });
    await installAuthenticatedSession(page);
    await installApiMocks(page);
    await page.exposeFunction('__pitchonixConsoleErrors', () => consoleErrors);
    await page.exposeFunction('__pitchonixFailedApiRequests', () => failedApiRequests);
  });

  for (const route of routes) {
    test(`${route.name} loads without runtime crashes`, async ({ page }) => {
      const response = await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), route.path).toBeLessThan(500);
      await expect(page.locator('body')).toBeVisible();
      await page.waitForTimeout(500);
      await expect(page.locator('body')).not.toContainText('Application error');
      await expect(page.locator('body')).not.toContainText('Unhandled Runtime Error');
      await expect(page.locator('body')).not.toContainText('Server Error');

      const consoleErrors = await page.evaluate(async () => {
        return (window as any).__pitchonixConsoleErrors();
      });
      expect(consoleErrors, route.path).toEqual([]);

      const failedApiRequests = await page.evaluate(async () => {
        return (window as any).__pitchonixFailedApiRequests();
      });
      expect(failedApiRequests, route.path).toEqual([]);
    });
  }
});
