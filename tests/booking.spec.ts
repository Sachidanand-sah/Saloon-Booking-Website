import { test, expect } from '@playwright/test';

test.describe('Booking Flow', () => {
  test('should allow a user to book a service', async ({ page }) => {
    await page.goto('/');
    
    // Click on a "Book" button for a service
    await page.getByRole('link', { name: 'Book' }).first().click();
    
    // Now on /book/haircut or similar
    await expect(page).toHaveURL(/\/book\/.*/);
    
    // Select a date (today's date is usually highlighted or selectable)
    // The calendar component might need specific selectors
    // Just clicking the "Continue" button which should be enabled if defaults are selected
    await page.getByRole('button', { name: 'Continue' }).click();
    
    // Fill in details
    await page.getByPlaceholder('Jane Doe').fill('Test Customer');
    await page.getByPlaceholder('you@example.com').fill('customer@example.com');
    await page.getByPlaceholder('+1 234 567 8900').fill('1234567890');
    
    // Submit
    await page.getByRole('button', { name: 'Confirm Booking' }).click();
    
    // Should redirect to confirmation
    await expect(page).toHaveURL(/\/confirmation.*/);
    await expect(page.getByText('Booking Confirmed')).toBeVisible();
  });
});
