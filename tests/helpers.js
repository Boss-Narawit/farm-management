// Shared test helpers and seed data for Playwright tests

const seedMD = {
  employees: [{ id: '1000000001', first: 'สมชาย', last: 'ทดสอบ', birthYear: null, nationality: 'ไทย', status: 'active' }],
  trucks: [],
  locations: [{ name: 'แปลง1', area: '', seasonStart: '2026-01-01', seasonHistory: [] }],
  tasks: [{ name: 'ตัดอ้อย', dailyRate: 400 }],
  contractors: [],
  fertilizers: [],
};

// Call before page.goto() — seeds localStorage before the page initializes
async function seedStorage(page, md = seedMD) {
  await page.addInitScript((data) => {
    localStorage.setItem('fm_md', JSON.stringify(data));
  }, md);
}

// Demo login — from Gemini-generated fixture
async function demoLogin(page) {
  await page.goto('/');
  await page.click('button.demo-btn');
  await page.waitForSelector('#screen-home.active', { state: 'visible' });
}

// Seed + demo login combined
async function setup(page) {
  await seedStorage(page);
  await demoLogin(page);
}

module.exports = { setup, seedStorage, demoLogin, seedMD };
