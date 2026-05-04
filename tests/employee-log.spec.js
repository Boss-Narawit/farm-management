const { test, expect } = require('@playwright/test');
const { setup } = require('./helpers');

test.describe('Employee Log Form', () => {
  test.beforeEach(async ({ page }) => {
    await setup(page);
    await page.click('button:has-text("บันทึกงานพนักงาน")');
    await expect(page.locator('#screen-employee')).toHaveClass(/active/);
  });

  test('form has required fields with today date pre-filled', async ({ page }) => {
    const today = new Date().toISOString().slice(0, 10);
    await expect(page.locator('#emp-date')).toHaveValue(today);
    await expect(page.locator('#emp-name')).toBeVisible();
    await expect(page.locator('#emp-task')).toBeVisible();
  });

  test('submit without name shows validation error', async ({ page }) => {
    await page.click('button.sub-btn');
    await expect(page.locator('#emp-err')).toHaveClass(/show/);
    await expect(page.locator('#emp-err')).toContainText('กรุณากรอก');
  });

  test('submit without task shows validation error', async ({ page }) => {
    await page.fill('#emp-name', 'สมชาย');
    await page.click('button.sub-btn');
    await expect(page.locator('#emp-err')).toHaveClass(/show/);
  });

  test('valid submit shows success overlay', async ({ page }) => {
    await page.fill('#emp-name', 'สมชาย');
    await page.fill('#emp-task', 'ตัดอ้อย');
    await page.click('button.sub-btn');
    await expect(page.locator('#sov')).toHaveClass(/show/, { timeout: 3000 });
    await expect(page.locator('#s-title')).toContainText('บันทึกสำเร็จ');
  });

  test('after successful submit form fields are cleared', async ({ page }) => {
    await page.fill('#emp-name', 'สมชาย');
    await page.fill('#emp-task', 'ตัดอ้อย');
    await page.click('button.sub-btn');
    await expect(page.locator('#sov')).toHaveClass(/show/, { timeout: 3000 });
    await page.click('button.sok');
    await expect(page.locator('#emp-name')).toHaveValue('');
    await expect(page.locator('#emp-task')).toHaveValue('');
  });

  test('valid submit saves log to localStorage', async ({ page }) => {
    const today = new Date().toISOString().slice(0, 10);
    await page.fill('#emp-name', 'สมชาย');
    await page.fill('#emp-task', 'ตัดอ้อย');
    await page.click('button.sub-btn');
    await expect(page.locator('#sov')).toHaveClass(/show/, { timeout: 3000 });

    const logs = await page.evaluate(() => JSON.parse(localStorage.getItem('fm_logs') || '{}'));
    expect(logs[today]).toBeDefined();
    expect(logs[today].some((l) => l.name === 'สมชาย' && l.task === 'ตัดอ้อย')).toBe(true);
  });

  test('duration toggle switches between full and half day', async ({ page }) => {
    await expect(page.locator('#tog-full')).toHaveClass(/sel/);
    await page.click('#tog-half');
    await expect(page.locator('#tog-half')).toHaveClass(/sel/);
    await expect(page.locator('#tog-full')).not.toHaveClass(/sel/);
  });
});
