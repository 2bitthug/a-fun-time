import { test, expect } from '@playwright/test';

test('user can sign in and navigate Town', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Mobile navigation is tested separately');

  await page.goto('/');

  await page.getByRole('link', { name: '02 Feed' }).click();

  await page.getByRole('textbox', { name: 'Username' }).fill(
    process.env.TEST_USERNAME!
  );

  await page.getByRole('textbox', { name: 'Password' }).fill(
    process.env.TEST_PASSWORD!
  );

  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(
    page.getByRole('button', { name: 'SIGN OUT' })
  ).toBeVisible({ timeout: 15000 });

  await expect(
    page.getByRole('link', { name: '01 Town' })
  ).toBeVisible({ timeout: 15000 });

  await page.getByRole('link', { name: '01 Town' }).click();
  await page.getByRole('link', { name: '02 Feed' }).click();
  await page.getByRole('link', { name: '03 Communities' }).click();
});