const { test, expect } = require('@playwright/test');
const { setup } = require('./helpers');

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await setup(page);
    await page.click('button:has-text("แดชบอร์ด")');
    await expect(page.locator('#screen-dash')).toHaveClass(/active/);
  });

  test('today view is active by default', async ({ page }) => {
    await expect(page.locator('#vt-today')).toHaveClass(/active/);
    await expect(page.locator('#dash-scroll')).toBeVisible();
  });

  test('can switch to monthly view', async ({ page }) => {
    await page.click('#vt-month');
    await expect(page.locator('#vt-month')).toHaveClass(/active/);
    await expect(page.locator('#vt-today')).not.toHaveClass(/active/);
  });

  test('today view renders without crashing (empty state)', async ({ page }) => {
    await expect(page.locator('#dash-scroll')).toBeVisible();
    const content = await page.locator('#dash-scroll').innerHTML();
    expect(content.length).toBeGreaterThan(0);
  });

  test('dashboard shows seeded employee name', async ({ page }) => {
    // Employee seeded in beforeEach via helpers.setup() — empFull = 'สมชาย ทดสอบ'
    await expect(page.locator('#dash-scroll')).toContainText('สมชาย ทดสอบ');
  });

  test('dashboard shows log status after employee log submitted', async ({ page }) => {
    // isoDate(dashDay) uses toISOString (UTC) — read it directly so the form date matches
    const dashIso = await page.evaluate(() => isoDate(dashDay));

    await page.click('#screen-dash button.ib'); // back to home
    await page.click('button:has-text("บันทึกงานพนักงาน")');
    await expect(page.locator('#screen-employee')).toHaveClass(/active/);

    // Set form date to match dashDay's UTC-based ISO so the dashboard finds the log
    await page.evaluate((iso) => { document.getElementById('emp-date').value = iso; }, dashIso);
    await page.fill('#emp-name', 'สมชาย ทดสอบ');
    await page.fill('#emp-task', 'ตัดอ้อย');
    await page.click('button.sub-btn');
    await expect(page.locator('#sov')).toHaveClass(/show/, { timeout: 3000 });
    await page.click('button.sok');

    await page.click('#screen-employee button.ib');
    await page.click('button:has-text("แดชบอร์ด")');
    await expect(page.locator('#dash-scroll')).toContainText('ตัดอ้อย', { timeout: 3000 });
  });
});
