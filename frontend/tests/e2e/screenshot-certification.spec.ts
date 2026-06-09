import { expect, test } from '@playwright/test';
import { installApiMocks } from './helpers/api-mocks';
import { installAuthenticatedSession } from './helpers/auth';

const surfaces = [
  { name: 'dashboard', path: '/dashboard' },
  { name: 'projects', path: '/projects' },
  { name: 'slide-editor', path: '/projects/e2e-project/edit/e2e-slide' },
  { name: 'pdf-studio', path: '/pdf-studio' },
  { name: 'pdf-editor', path: '/pdf-studio/editor/e2e-document' },
  { name: 'career', path: '/career' },
  { name: 'career-builder', path: '/career/builder/e2e-document' },
  { name: 'excel-studio', path: '/excel-studio' },
  { name: 'excel-editor', path: '/excel-studio/editor/e2e-document' },
  { name: 'feasibility-studio', path: '/feasibility-studio' },
  { name: 'feasibility-editor', path: '/feasibility-studio/editor/e2e-document' },
  { name: 'brand-kits', path: '/brand-kits' },
];

test.describe('release visual screenshot certification', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await installAuthenticatedSession(page);
    await installApiMocks(page);
    await page.clock.setFixedTime(new Date('2026-06-09T09:00:00.000Z'));
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          caret-color: transparent !important;
        }
        .animate-pulse, .animate-spin {
          animation: none !important;
        }
      `,
    });
  });

  for (const surface of surfaces) {
    test(`${surface.name} matches visual baseline`, async ({ page }) => {
      const response = await page.goto(surface.path, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), surface.path).toBeLessThan(500);
      await expect(page.locator('body')).toBeVisible();
      await page.waitForTimeout(2000);
      await expect(page).toHaveScreenshot(`${surface.name}.png`, {
        fullPage: false,
        animations: 'disabled',
        maxDiffPixelRatio: 0.02,
        timeout: 30_000,
      });
    });
  }
});
