const { test, expect } = require('@playwright/test');
const { setup } = require('./helpers');

test.describe('Screen Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setup(page);
  });

  test('navigate to dashboard', async ({ page }) => {
    await page.click('button:has-text("แดชบอร์ด")');
    await expect(page.locator('#screen-dash')).toHaveClass(/active/);
  });

  test('navigate back from dashboard to home', async ({ page }) => {
    await page.click('button:has-text("แดชบอร์ด")');
    await expect(page.locator('#screen-dash')).toHaveClass(/active/);
    await page.click('#screen-dash button.ib');
    await expect(page.locator('#screen-home')).toHaveClass(/active/);
  });

  test('navigate to employee log form', async ({ page }) => {
    await page.click('button:has-text("บันทึกงานพนักงาน")');
    await expect(page.locator('#screen-employee')).toHaveClass(/active/);
  });

  test('navigate to master data screen', async ({ page }) => {
    await page.click('button:has-text("ข้อมูลพนักงาน / รถ")');
    await expect(page.locator('#screen-master')).toHaveClass(/active/);
  });

  test('navigate to bulk log screen', async ({ page }) => {
    await page.click('button:has-text("บันทึกหลายคนพร้อมกัน")');
    await expect(page.locator('#screen-bulk')).toHaveClass(/active/);
  });
});
