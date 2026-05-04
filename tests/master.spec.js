const { test, expect } = require('@playwright/test');
const { setup } = require('./helpers');

test.describe('Master Data', () => {
  test.beforeEach(async ({ page }) => {
    await setup(page);
    await page.click('button:has-text("ข้อมูลพนักงาน / รถ")');
    await expect(page.locator('#screen-master')).toHaveClass(/active/);
  });

  test('employee tab is active by default', async ({ page }) => {
    await expect(page.locator('#tab-employees')).toHaveClass(/active/);
    await expect(page.locator('#panel-employees')).toBeVisible();
  });

  test('seeded employee appears in list', async ({ page }) => {
    await expect(page.locator('#emp-list')).toContainText('สมชาย ทดสอบ');
  });

  test('can open add employee modal', async ({ page }) => {
    await page.click('button:has-text("+ เพิ่มพนักงานใหม่")');
    await expect(page.locator('#mod-emp')).toHaveClass(/open/);
    await expect(page.locator('#me-first')).toBeVisible();
  });

  test('add new employee saves to master data', async ({ page }) => {
    await page.click('button:has-text("+ เพิ่มพนักงานใหม่")');
    await page.fill('#me-first', 'มานี');
    await page.click('#mod-emp button.ms');
    await expect(page.locator('#emp-list')).toContainText('มานี', { timeout: 3000 });

    const md = await page.evaluate(() => JSON.parse(localStorage.getItem('fm_md') || '{}'));
    expect(md.employees.some((e) => e.first === 'มานี')).toBe(true);
  });

  test('can switch to tasks tab', async ({ page }) => {
    await page.click('#tab-tasks');
    await expect(page.locator('#tab-tasks')).toHaveClass(/active/);
  });

  test('can switch to locations tab', async ({ page }) => {
    await page.click('#tab-locations');
    await expect(page.locator('#tab-locations')).toHaveClass(/active/);
  });
});
