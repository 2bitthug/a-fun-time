import { test, expect } from '@playwright/test';

test('user can choose one of Town\'s fixed profile avatars', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Avatar settings are tested on desktop');

  await page.goto('/');
  await page.getByRole('link', { name: '02 Feed' }).click();

  await page.getByRole('textbox', { name: 'Username' }).fill(
    process.env.TEST_USERNAME!
  );
  await page.getByRole('textbox', { name: 'Password' }).fill(
    process.env.TEST_PASSWORD!
  );
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.getByRole('link', { name: 'SETTINGS' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

  await page.getByRole('button', { name: 'Change avatar' }).click();

  const avatars = page.getByRole('button', { name: /^Avatar (0[1-9]|1[01]|1[3-9]|2[01])(?:, selected)?$/ });
  await expect(avatars).toHaveCount(20);

  await page.getByRole('button', { name: 'Avatar 21' }).click();
  await expect(page.getByRole('button', { name: 'Avatar 21, selected' })).toHaveAttribute('aria-pressed', 'true');
});
