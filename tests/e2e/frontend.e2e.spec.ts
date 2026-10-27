import { test, expect, Page, newConsentContext } from '../helpers/test'

test.describe('Frontend', () => {
  let page: Page

  test.beforeAll(async ({ browser }, testInfo) => {
    const context = await newConsentContext(browser)
    page = await context.newPage()
  })

  test('can go on homepage', async ({ page }) => {
    await page.goto('http://localhost:3000')

    await expect(page).toHaveTitle(/MGS MEBEL/)

    const heading = page.locator('h1').first()

    await expect(heading).toHaveText('MGS MEBEL')
  })
})
