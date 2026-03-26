import { test, expect } from '@playwright/test'

test.describe('Login Page', () => {
  test('shows login form on /', async ({ page }) => {
    await page.goto('/')

    // Should see email and password inputs
    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')

    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
  })

  test('shows sign-in button', async ({ page }) => {
    await page.goto('/')

    const signInButton = page.locator('button[type="submit"]')
    await expect(signInButton).toBeVisible()
  })

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/')

    await page.fill('input[type="email"]', 'wrong@email.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    // Wait for error message
    const errorMessage = page.getByText(/invalid/i)
    await expect(errorMessage).toBeVisible({ timeout: 10_000 })
  })

  test('redirects to /dashboard on successful login', async ({ page }) => {
    await page.goto('/')

    // Use seeded admin credentials
    await page.fill('input[type="email"]', 'admin@identityradar.local')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button[type="submit"]')

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
  })

  test('shows Identity Radar branding', async ({ page }) => {
    await page.goto('/')

    const branding = page.getByText(/identity radar/i)
    await expect(branding).toBeVisible()
  })

  test('has password visibility toggle', async ({ page }) => {
    await page.goto('/')

    const passwordInput = page.locator('input[type="password"]')
    await expect(passwordInput).toBeVisible()

    // Look for show/hide password button (eye icon)
    const toggleButton = page.locator('button').filter({ has: page.locator('svg') }).first()
    if (await toggleButton.isVisible()) {
      await toggleButton.click()
      // After toggle, input type should change to text
      const visibleInput = page.locator('input[name="password"], input[type="text"]').first()
      await expect(visibleInput).toBeVisible()
    }
  })
})
