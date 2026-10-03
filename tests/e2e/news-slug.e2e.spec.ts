import { expect, test, type Page } from '@playwright/test'

import { news } from '../../src/seed/data/news'
import { e2eEditor } from '../helpers/e2eEditor'
import { NEWS_DRAFT_SLUG } from '../helpers/e2eHome'

const BASE = 'http://localhost:3000'
const EMPTY_DB = !!process.env.E2E_EMPTY_DB
const NOT_FOUND = 'Страница не найдена'

// The newest published news of seedHome (the media ids do not matter here).
const published = news(() => 1)[0]!

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

/** The site 404 inside the site layout: status, landmarks, one h1, noindex. */
const expectNews404 = async (page: Page, path: string) => {
  const response = await page.goto(`${BASE}${path}`)
  expect(response?.status(), path).toBe(404)
  await expect(page).toHaveTitle(`${NOT_FOUND} — MGS MEBEL`)
  await expect(page.locator('header')).toHaveCount(1)
  await expect(page.locator('main#content')).toHaveCount(1)
  await expect(page.locator('footer')).toHaveCount(1)
  await expect(page.locator('h1')).toHaveCount(1)
  await expect(page.locator('h1')).toHaveText(NOT_FOUND)
  // Next adds its own noindex to a 404 next to the page's robots tag: every one must say noindex.
  const robots = await page
    .locator('meta[name="robots"]')
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('content') ?? ''))
  expect(robots.length).toBeGreaterThan(0)
  for (const content of robots) expect(content).toContain('noindex')
}

test.describe('news page', () => {
  test.skip(EMPTY_DB, 'needs tests/helpers/seedHome.ts data')
  test.use({ viewport: { width: 390, height: 900 } })

  test('published news: 200, its title as the only h1, canonical', async ({ page }) => {
    const errors = watchConsole(page)
    const path = `/news/${published.slug}`
    const response = await page.goto(`${BASE}${path}`)
    expect(response?.status()).toBe(200)
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('h1')).toHaveText(published.title)
    await expect(page).toHaveTitle(`${published.title} — MGS MEBEL`)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      new RegExp(`^https?://[^/]+${path}$`),
    )
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article')
    await expect(page.locator('header')).toHaveAttribute('data-variant', 'flow')
    await expect(page.getByRole('link', { name: 'Назад к новостям' })).toHaveAttribute(
      'href',
      '/news',
    )
    expect(errors).toEqual([])
  })

  test('unknown slug: the site 404', async ({ page }) => {
    const errors = watchConsole(page)
    await expectNews404(page, '/news/nesushchestvuet')
    expect(errors).toEqual([])
  })

  test('unpublished news: 404', async ({ page }) => {
    const errors = watchConsole(page)
    await expectNews404(page, `/news/${NEWS_DRAFT_SLUG}`)
    expect(errors).toEqual([])
  })

  test('unpublished news: 404 for an editor in draft mode too', async ({ page }) => {
    const login = await page.request.post(`${BASE}/api/users/login`, {
      data: { email: e2eEditor.email, password: e2eEditor.password },
    })
    expect(login.ok()).toBe(true)
    const path = `/news/${NEWS_DRAFT_SLUG}`
    const response = await page.goto(`${BASE}/preview?path=${encodeURIComponent(path)}`)
    await expect(page).toHaveURL(`${BASE}${path}`)
    expect(response?.status()).toBe(404)
    await expect(page.locator('h1')).toHaveText(NOT_FOUND)
    await expect(page.getByText('Предпросмотр черновика')).toBeVisible()
  })
})

test.describe('news page on an empty database @empty', () => {
  test.skip(!EMPTY_DB, 'runs against a fresh database (E2E_EMPTY_DB=1)')

  test('any slug: the site 404 without errors', async ({ page }) => {
    const errors = watchConsole(page)
    await expectNews404(page, '/news/nesushchestvuet')
    expect(errors).toEqual([])
  })
})
