import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '../helpers/test'

const BASE = 'http://localhost:3000'
const WIDTHS = [390, 834, 1440] as const
const EMPTY_DB = !!process.env.E2E_EMPTY_DB
const TITLE = 'Страница не найдена'
const HOME_LINK = 'Перейти на главную'

/** Fails the test on hydration mismatches and other console errors. */
const watchConsole = (page: Page) => {
  const errors: string[] = []
  page.on('console', (message) => {
    // The site has no favicon yet (branding comes later): its 404 is not a page error.
    if (message.location().url.endsWith('/favicon.ico')) return
    // Chrome logs the 404 status of the document itself: that status is what is tested here.
    if (message.location().url === page.url() && /status of 404/.test(message.text())) return
    if (message.type() === 'error' || /hydrat/i.test(message.text())) errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))
  return errors
}

const axe = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  return violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)
}

/** The site 404: status, landmarks, one h1, link home, no axe violations. */
const expectSite404 = async (page: Page, path: string) => {
  const response = await page.goto(`${BASE}${path}`)
  expect(response?.status(), path).toBe(404)
  await expect(page).toHaveTitle(`${TITLE} — MGS MEBEL`)
  await expect(page.locator('header')).toHaveAttribute('data-variant', 'flow')
  await expect(page.locator('main#content')).toHaveCount(1)
  await expect(page.locator('footer')).toHaveCount(1)
  await expect(page.locator('h1')).toHaveCount(1)
  await expect(page.locator('h1')).toHaveText(TITLE)
  await expect(page.getByRole('link', { name: HOME_LINK })).toHaveAttribute('href', '/')
  expect(await axe(page), path).toEqual([])
}

test.describe('404', () => {
  test.skip(EMPTY_DB, 'needs tests/helpers/seedChrome.ts data')

  for (const width of WIDTHS) {
    test(`${width}: unmatched URL renders the site 404`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      const errors = watchConsole(page)
      await expectSite404(page, '/nesushchestvuet')
      await page.screenshot({ path: `test-results/not-found/404-${width}.png`, fullPage: true })
      expect(errors).toEqual([])
    })
  }

  test('1728: no column, the content in the container', async ({ page }) => {
    await page.setViewportSize({ width: 1728, height: 900 })
    await expectSite404(page, '/nesushchestvuet')
    // The width of the containing block: headless Linux keeps a 15px scrollbar gutter that
    // documentElement.clientWidth does not subtract
    const viewport = await page.evaluate(() => document.body.clientWidth)
    const footer = (await page.locator('footer').boundingBox())!
    expect([footer.x, footer.width]).toEqual([0, viewport])
    expect((await page.locator('h1').boundingBox())!.x).toBe((viewport - 1600) / 2 + 64)
    await page.screenshot({ path: 'test-results/not-found/404-1728.png', fullPage: true })
  })

  test('the button leads home, to the hero header', async ({ page }) => {
    const errors = watchConsole(page)
    await page.goto(`${BASE}/nesushchestvuet`)
    await page.getByRole('link', { name: HOME_LINK }).click()
    await expect(page).toHaveURL(`${BASE}/`)
    await expect(page.locator('header')).toHaveAttribute('data-variant', 'hero')
    expect(errors).toEqual([])
  })

  test.describe('desktop', () => {
    test.use({ viewport: { width: 1440, height: 900 } })

    test('no section is current under a section path', async ({ page }) => {
      await expectSite404(page, '/about/nesushchestvuet')
      const nav = page.getByRole('navigation', { name: 'Разделы сайта' })
      await expect(nav.getByRole('link').first()).toBeVisible()
      await expect(nav.locator('[aria-current="page"]')).toHaveCount(0)
    })
  })

  test.describe('mobile', () => {
    test.use({ viewport: { width: 390, height: 900 } })

    test('«←» leads home, also under /news', async ({ page }) => {
      await expectSite404(page, '/news/a/b')
      await expect(page.getByRole('link', { name: 'Назад к новостям' })).toHaveCount(0)
      await page.getByRole('link', { name: 'На главную', exact: true }).click()
      await expect(page).toHaveURL(`${BASE}/`)
    })
  })

  test('admin keeps the Payload 404', async ({ page }) => {
    await page.goto(`${BASE}/admin/nesushchestvuet`)
    await expect(page.locator('body')).not.toBeEmpty()
    await expect(page.locator('main#content')).toHaveCount(0)
    await expect(page.getByRole('link', { name: HOME_LINK })).toHaveCount(0)
  })
})

test.describe('404 on an empty database @empty', () => {
  test.skip(!EMPTY_DB, 'runs against a fresh database (E2E_EMPTY_DB=1)')

  for (const width of WIDTHS) {
    test(`${width}: renders without layout data`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      const errors = watchConsole(page)
      await expectSite404(page, '/nesushchestvuet')
      expect(errors).toEqual([])
    })
  }
})
