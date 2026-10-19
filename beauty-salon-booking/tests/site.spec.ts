import { expect, test, type Page } from '@playwright/test';

/** Requires the backend seed data (see playwright.config.ts). */

const uniqueEmail = () => `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;

async function signUp(page: Page, next?: string) {
  await page.goto(next ? `/signup?next=${encodeURIComponent(next)}` : '/signup');
  await page.getByLabel('Full name').fill('Playwright Tester');
  await page.getByLabel('Email').fill(uniqueEmail());
  await page.getByLabel('Password').fill('playwright-pass');
  await page.getByRole('button', { name: 'Create account' }).click();
}

test('home page shows live services, team and reviews', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('quiet luxury');
  await expect(page.getByRole('heading', { name: 'Balayage' })).toBeVisible();
  await expect(page.locator('#team').getByRole('heading', { name: 'Sunita Shrestha' })).toBeVisible();
  await expect(page.locator('#reviews figure').first()).toBeVisible();
});

test('services can be filtered by category and search', async ({ page }) => {
  await page.goto('/services');
  await page.getByRole('tab', { name: 'Nails' }).click();
  await expect(page).toHaveURL(/category=nails/);
  await expect(page.getByRole('heading', { name: 'Gel Manicure' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Balayage' })).toHaveCount(0);

  await page.getByRole('tab', { name: 'All' }).click();
  await page.getByPlaceholder('Search treatments…').fill('hot stone');
  await expect(page.getByText('1 treatment', { exact: true })).toBeVisible();
});

test('locations page lists branches with a map', async ({ page }) => {
  await page.goto('/locations');
  await expect(page.getByRole('heading', { name: 'Lalima Baneshwor' })).toBeVisible();
  await expect(page.locator('iframe[title^="Map of"]')).toBeVisible();
  await page.getByRole('link', { name: 'Branch details' }).first().click();
  await expect(page).toHaveURL(/\/locations\/baneshwor/);
  await expect(page.getByText('New Baneshwor Road').first()).toBeVisible();
});

test('prices are shown in Nepali rupees', async ({ page }) => {
  // Catalog pages are cached briefly and refresh in the background, so load twice.
  await page.goto('/services/precision-haircut');
  await page.reload();
  await expect(page.getByText('Rs. 800').first()).toBeVisible();
});

test('account pages require login', async ({ page }) => {
  await page.goto('/account');
  await expect(page).toHaveURL(/\/login\?next=%2Faccount/);
});

test('guest books, sees it in their account, then cancels', async ({ page }) => {
  // Start as a guest from a service page; selection must survive signing up.
  await page.goto('/services/precision-haircut');
  await page.getByRole('link', { name: 'Book this treatment' }).click();
  // Several branches: choose one first.
  await expect(page.getByRole('heading', { name: 'Choose a branch' })).toBeVisible();
  await page.getByRole('button', { name: /Lalima Baneshwor/ }).click();
  // The specialist step is skipped when only one stylist at the branch offers the service.
  const anyStylist = page.getByRole('button', { name: /Any available/ });
  await expect(anyStylist.or(page.getByRole('heading', { name: 'Pick a date & time' }))).toBeVisible();
  if (await anyStylist.isVisible()) await anyStylist.click();

  await expect(page.getByRole('heading', { name: 'Pick a date & time' })).toBeVisible();
  // Find the first day with free times.
  const slot = page.locator('button', { hasText: /^\d{1,2}:\d{2}\s?(AM|PM)$/ }).first();
  for (let i = 0; i < 6 && !(await slot.isVisible().catch(() => false)); i++) {
    const nextDay = page.getByRole('button', { name: 'Check next day' });
    if (await nextDay.isVisible()) await nextDay.click();
    await page.waitForTimeout(400);
  }
  const time = (await slot.textContent())!.trim();
  await slot.click();

  await expect(page.getByRole('heading', { name: 'Review & confirm' })).toBeVisible();
  await page.getByRole('link', { name: 'Create account' }).click();
  await page.getByLabel('Full name').fill('Playwright Tester');
  await page.getByLabel('Email').fill(uniqueEmail());
  await page.getByLabel('Password').fill('playwright-pass');
  await page.getByRole('button', { name: 'Create account' }).click();

  // Back on the confirm step with the same time.
  await expect(page.getByRole('heading', { name: 'Review & confirm' })).toBeVisible();
  await expect(page.getByText(time).first()).toBeVisible();
  await page.getByLabel(/Anything we should know/).fill('E2E test booking');
  await page.getByRole('button', { name: /Confirm booking/ }).click();

  await expect(page.getByRole('heading', { name: "You're booked!" })).toBeVisible();
  await expect(page.getByText('Precision Haircut').first()).toBeVisible();

  await page.getByRole('link', { name: 'View my bookings' }).click();
  const card = page.locator('article', { hasText: 'Precision Haircut' }).first();
  await expect(card).toContainText('Confirmed');
  await card.getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('button', { name: 'Yes, cancel' }).click();
  await expect(page.getByText('Your appointment has been cancelled.')).toBeVisible();
  await expect(page.getByText('No upcoming appointments')).toBeVisible();
});

test('signup validates input before calling the server', async ({ page }) => {
  await page.goto('/signup');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Please enter your full name')).toBeVisible();
  await expect(page.getByText('Use at least 8 characters')).toBeVisible();
});

test('customers cannot open the admin dashboard', async ({ page }) => {
  await signUp(page);
  await expect(page).toHaveURL(/\/account/);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/account/);
});

test('admin sees the dashboard and bookings', async ({ page, isMobile }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@lalima.test');
  await page.getByLabel('Password').fill('Admin@12345');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText(/today.s bookings/i).first()).toBeVisible();

  if (isMobile) await page.getByRole('button', { name: /menu/i }).first().click();
  await page.getByRole('link', { name: 'Bookings' }).first().click();
  await expect(page).toHaveURL(/\/admin\/bookings/);
});
