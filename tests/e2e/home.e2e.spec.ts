import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { globals } from '../../src/seed/data/globals'
import { HOME_DRAFT_TITLE } from '../helpers/e2eHome'

const BASE = 'http://localhost:3000'
const EMPTY_DB = !!process.env.E2E_EMPTY_DB
const { home, stats } = globals(() => 0)

/** Fails the test on hydration mismatches and other console errors. */
const watchConsole = (page: Page) => {
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.location().url.endsWith('/favicon.ico')) return
    if (m.type() === 'error' || /hydrat/i.test(m.text())) errors.push(m.text())
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

/** Sum of layout shifts since navigation (buffered entries included). */
const cls = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let total = 0
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as (PerformanceEntry & {
            value: number
            hadRecentInput: boolean
          })[]) {
            if (!entry.hadRecentInput) total += entry.value
          }
        }).observe({ type: 'layout-shift', buffered: true })
        setTimeout(() => resolve(total), 500)
      }),
  )

const HEIGHTS = { 390: 844, 834: 1194, 1440: 900 } as const
const HERO = { 390: 640, 834: 780, 1440: 900 } as const
const STAT_COLUMNS = { 390: 0, 834: 3, 1440: 6 } as const

test.describe('home', () => {
  test.skip(EMPTY_DB, 'needs tests/helpers/seedChrome.ts + seedHome.ts data')

  for (const width of [390, 834, 1440] as const) {
    test(`${width}: hero, statistics, history; axe, CLS, console`, async ({ page }) => {
      const errors = watchConsole(page)
      await page.setViewportSize({ width, height: HEIGHTS[width] })
      await page.goto(`${BASE}/`)

      // One H1: the published hero title, never the draft
      await expect(page.locator('h1')).toHaveCount(1)
      await expect(page.locator('h1')).toHaveText(home.hero.title)
      await expect(page.getByText(HOME_DRAFT_TITLE)).toHaveCount(0)

      // Hero: README §4 heights; the header lies over it; the content sits below the header
      const hero = page.locator('section[aria-labelledby="home-hero-title"]')
      expect(Math.round((await hero.boundingBox())!.height)).toBe(HERO[width])
      await expect(page.locator('header')).toHaveAttribute('data-variant', 'hero')
      const headerBottom = (await page.locator('header').boundingBox())!.y + 80
      const labelTop = (await hero.getByText(`#${home.hero.label}`).boundingBox())!.y
      expect(labelTop, 'hero content starts below the header').toBeGreaterThanOrEqual(headerBottom)

      // LCP image: the poster, preloaded with high priority
      const poster = hero.locator('img').first()
      await expect(poster).toHaveAttribute('fetchpriority', 'high')
      await expect(poster).not.toHaveAttribute('loading', 'lazy')

      // CTA → WhatsApp in a new tab
      const cta = hero.getByRole('link', { name: `${home.hero.ctaLabel} в WhatsApp` })
      await expect(cta).toHaveAttribute('href', /^https:\/\/wa\.me\//)
      await expect(cta).toHaveAttribute('target', '_blank')
      await expect(cta).toHaveAttribute('rel', 'noopener noreferrer')

      // Statistics: carousel on mobile, grid of 3 / 6
      const list = page.locator('ul').filter({ hasText: stats.items[0].label }).first()
      await expect(list.locator('li')).toHaveCount(stats.items.length)
      const layout = await list.evaluate((el) => ({
        columns: getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length,
        display: getComputedStyle(el).display,
        scrolls: el.scrollWidth > el.clientWidth,
      }))
      if (width === 390) expect(layout).toMatchObject({ display: 'flex', scrolls: true })
      else expect(layout).toMatchObject({ display: 'grid', columns: STAT_COLUMNS[width] })

      // History: year plate, values, link to «О нас»
      await expect(page.getByText(home.history.yearValue!, { exact: true })).toBeVisible()
      for (const value of home.history.values!) {
        await expect(page.getByText(value.label, { exact: true })).toBeVisible()
      }
      await expect(page.getByRole('link', { name: home.history.linkLabel! })).toHaveAttribute(
        'href',
        '/about',
      )

      await page.screenshot({ path: `test-results/home/home-${width}.png`, fullPage: true })
      expect(await cls(page)).toBe(0)
      expect(await axe(page)).toEqual([])
      expect(errors).toEqual([])
    })
  }

  test('anonymous API never gets the home draft', async ({ request }) => {
    for (const query of ['', '?draft=true']) {
      const response = await request.get(`${BASE}/api/globals/home${query}`)
      expect(response.ok()).toBe(true)
      expect((await response.json()).hero.title).toBe(home.hero.title)
    }
  })
})

test('home on an empty database renders without sections @empty', async ({ page }) => {
  test.skip(!EMPTY_DB, 'empty database only')
  const errors = watchConsole(page)
  const response = await page.goto(`${BASE}/`)
  expect(response?.status()).toBe(200)
  await expect(page.locator('main#content')).toHaveCount(1)
  await expect(page.locator('section[aria-labelledby="home-hero-title"]')).toHaveCount(0)
  expect(await axe(page)).toEqual([])
  expect(errors).toEqual([])
})
