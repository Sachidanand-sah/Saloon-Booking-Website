import { expect, test, type Browser, type Page } from '@playwright/test';

/**
 * Cross-role flows for packages, events, shop and loyalty. Needs the backend seed data.
 * Each test signs up a fresh customer, so they don't interfere with each other.
 */

const unique = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

async function newCustomer(browser: Browser) {
  const id = unique();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const name = `Tester ${id}`;
  const email = `e2e-${id}@example.com`;
  await page.goto('/signup');
  await page.getByLabel('Full name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('playwright-pass');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/account/);
  return { page, name, email };
}

async function admin(browser: Browser) {
  const page = await (await browser.newContext()).newPage();
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@lalima.test');
  await page.getByLabel('Password').fill('Admin@12345');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  return page;
}

/** Picks the first free time on or after the shown day and lands on the confirm step. */
async function pickFirstSlot(page: Page) {
  await expect(page.getByRole('heading', { name: 'Pick a date & time' })).toBeVisible();
  const slot = page.locator('button', { hasText: /^\d{1,2}:\d{2}\s?(AM|PM)$/ }).first();
  for (let i = 0; i < 6 && !(await slot.isVisible().catch(() => false)); i++) {
    const next = page.getByRole('button', { name: 'Check next day' });
    if (await next.isVisible()) await next.click();
    await page.waitForTimeout(400);
  }
  await slot.click();
  await expect(page.getByRole('heading', { name: 'Review & confirm' })).toBeVisible();
}

/** The admin card (or row) that mentions this text and offers the given action. */
const cardWith = (page: Page, text: string, action: string) =>
  page.locator(`xpath=//*[contains(., "${text}") and .//button[contains(., "${action}")]]`).last();

test('package: requested online, activated by admin, included service is free', async ({ browser }) => {
  const customer = await newCustomer(browser);
  const p = customer.page;

  await p.goto('/packages');
  await p.getByRole('button', { name: 'Choose Glow Essentials' }).click();
  await p.getByLabel('Where will you pay?').selectOption({ label: 'Lalima Baneshwor' });
  await p.getByRole('button', { name: 'Request package' }).click();
  await expect(p.getByText('Package requested').first()).toBeVisible();

  const a = await admin(browser);
  await a.goto('/admin/packages');
  await cardWith(a, customer.email, 'Mark paid').getByRole('button', { name: /Mark paid/ }).click();
  await a.getByRole('button', { name: /^Activate · Rs\. 2,999$/ }).click();
  // It leaves the 'awaiting payment' list once activated.
  await expect(cardWith(a, customer.email, 'Mark paid')).toHaveCount(0);

  // Blow-dry is included twice a month in Glow Essentials.
  await p.goto('/book?location=baneshwor&service=blow-dry');
  await pickFirstSlot(p);
  await expect(p.getByText(/Included in your Glow Essentials package/)).toBeVisible();
  await p.getByRole('button', { name: /Confirm booking · Rs\. 0$/ }).click();
  await expect(p.getByRole('heading', { name: "You're booked!" })).toBeVisible();
});

test('events: request, admin quotes, customer accepts', async ({ browser }) => {
  const customer = await newCustomer(browser);
  const p = customer.page;
  const date = new Date(Date.now() + 40 * 86_400_000).toISOString().slice(0, 10);

  await p.goto('/events/request?package=bridal-glam');
  await p.getByLabel('Date').fill(date);
  await p.getByLabel('Guests').fill('2');
  await p.getByRole('combobox', { name: 'Branch' }).selectOption({ label: 'Lalima Baneshwor' });
  await p.getByLabel('Contact phone').fill('+977 9811111111');
  await p.getByLabel('Anything else? (optional)').fill('Morning ceremony');
  await p.getByRole('button', { name: 'Send request' }).click();
  await expect(p.getByText('Request received').first()).toBeVisible();

  const a = await admin(browser);
  await a.goto('/admin/events');
  await cardWith(a, customer.name, 'Send quote').getByRole('button', { name: 'Send quote' }).click();
  await a.getByLabel('Price (Rs.)').fill('42000');
  await a.getByLabel('Note to customer (optional)').fill('Includes a trial session');
  await a.getByRole('dialog').getByRole('button', { name: 'Send quote' }).click();
  // It leaves the 'new' list once quoted.
  await expect(cardWith(a, customer.name, 'Send quote')).toHaveCount(0);

  await p.goto('/account?tab=events');
  await expect(p.getByText('Rs. 42,000').first()).toBeVisible();
  await p.getByRole('button', { name: 'Accept quote' }).first().click();
  await p.getByRole('dialog').getByRole('button', { name: 'Accept quote' }).click();
  await expect(p.getByText('Confirmed').first()).toBeVisible();
});

test('shop: add to bag, reserve for pickup, see it in orders', async ({ browser }) => {
  const { page: p } = await newCustomer(browser);

  await p.goto('/products/vitamin-c-glow-serum');
  await expect(p.getByText(/Recommended by|Pooja/).first()).toBeVisible();
  await p.getByRole('button', { name: /Add to bag/ }).first().click();
  await p.goto('/bag');
  await p.getByLabel('Collect from').selectOption({ label: 'Lalima Jhamsikhel' });
  await p.getByRole('button', { name: 'Reserve for pickup' }).click();
  await expect(p.getByText('Reserved for you')).toBeVisible();

  await p.goto('/account?tab=orders');
  await expect(p.getByText('Vitamin C Glow Serum').first()).toBeVisible();
  await expect(p.getByText('Lalima Jhamsikhel').first()).toBeVisible();
});

test('loyalty: new customers can spend their welcome points on a booking', async ({ browser }) => {
  const { page: p } = await newCustomer(browser);

  await p.goto('/book?location=baneshwor&service=precision-haircut');
  await pickFirstSlot(p);
  // The switch is a visually hidden checkbox; click its label like a person would.
  await p.getByText('Use my points').click();
  await expect(p.getByRole('switch')).toBeChecked();
  // 100 welcome points = Rs. 100 off an Rs. 800 haircut.
  await p.getByRole('button', { name: /Confirm booking · Rs\. 700$/ }).click();
  await expect(p.getByRole('heading', { name: "You're booked!" })).toBeVisible();
  await expect(p.getByText('Rs. 700').first()).toBeVisible();

  await p.goto('/account');
  await expect(p.getByText(/You saved Rs\. 100/).first()).toBeVisible();
});
