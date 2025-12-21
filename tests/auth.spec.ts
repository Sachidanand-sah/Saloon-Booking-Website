import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should allow a user to sign up', async ({ page }) => {
    await page.goto('/signup');
    
    await page.getByPlaceholder('John Doe').fill('Test User');
    await page.getByPlaceholder('hello@example.com').fill(`test_${Date.now()}@example.com`);
    await page.getByPlaceholder('••••••••').fill('password123');
    
    // Listen for the dialog/alert
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Account created successfully');
      await dialog.accept();
    });

    await page.getByRole('button', { name: 'Sign Up' }).click();
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
  });

  test('should allow a user to log in', async ({ page }) => {
    
    await page.goto('/login');
    
    await page.getByPlaceholder('hello@example.com').fill('hello@example.com'); // Using a dummy for now
    await page.getByPlaceholder('••••••••').fill('password');
    
    
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { name: 'Test User', email: 'hello@example.com' } }),
      });
    });

    await page.getByRole('button', { name: 'Sign in' }).click();
    
    await expect(page).toHaveURL('http://localhost:3000/');
  });
});
