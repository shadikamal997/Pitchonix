import { Page } from '@playwright/test';

export async function installAuthenticatedSession(page: Page) {
  await page.context().addCookies([
    {
      name: 'pitchonix-auth',
      value: 'e2e-token',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  await page.addInitScript(() => {
    window.localStorage.setItem('token', 'e2e-token');
    window.localStorage.setItem(
      'user',
      JSON.stringify({
        id: 'e2e-user',
        email: 'e2e@pitchonix.test',
        name: 'Pitchonix E2E',
      }),
    );
  });
}
