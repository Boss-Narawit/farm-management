const { test, expect } = require('@playwright/test');
const { demoLogin, seedStorage } = require('./helpers');

test.describe('App Boot', () => {
  test('shows login screen on first load', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#screen-login')).toHaveClass(/active/);
    await expect(page.locator('#screen-home')).not.toHaveClass(/active/);
  });

  test('demo login navigates to home screen', async ({ page }) => {
    await seedStorage(page);
    await demoLogin(page);
    await expect(page.locator('#screen-home')).toHaveClass(/active/);
    await expect(page.locator('#screen-login')).not.toHaveClass(/active/);
  });

  test('home screen shows demo user name', async ({ page }) => {
    await seedStorage(page);
    await demoLogin(page);
    await expect(page.locator('#home-name')).toHaveText('ผู้จัดการ (ทดสอบ)');
  });

  test('logout returns to login screen', async ({ page }) => {
    await seedStorage(page);
    await demoLogin(page);
    page.once('dialog', (dialog) => dialog.accept());
    await page.click('button.lo-btn');
    await expect(page.locator('#screen-login')).toHaveClass(/active/);
  });
});
