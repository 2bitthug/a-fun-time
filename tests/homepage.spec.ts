import { test, expect } from '@playwright/test';

test('Town homepage loads', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Town/i);
});