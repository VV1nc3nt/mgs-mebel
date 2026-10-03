import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { globals } from '../../src/seed/data/globals'
import { news } from '../../src/seed/data/news'
import { E2E_NEWS_COUNT, HOME_DRAFT_TITLE, NEWS_DRAFT_TITLE } from '../helpers/e2eHome'

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

// The slider: the latest three of the published fixture news, newest first
const LATEST_NEWS = news(() => 0)
  .slice(0, E2E_NEWS_COUNT)
  .sort((a, b) => b.date.localeCompare(a.date))
  .slice(0, 3)

const NEWS_TITLE = home.news!.title!
const WORKS_TITLE = home.works!.title!

const HEIGHTS = { 390: 844, 834: 1194, 1440: 900 } as const
const NEWS_CARD = { 390: 440, 834: 560, 1440: 640 } as const
const WORK_COLUMNS = { 390: 2, 834: 4, 1440: 4 } as const
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

      // News: one card per view of README §6.1 heights, the latest published only
      const slider = page.getByRole('region', { name: NEWS_TITLE })
      await expect(slider).toHaveAttribute('aria-roledescription', 'карусель')
      const slides = slider.getByRole('group')
      await expect(slides).toHaveCount(3)
      await expect(slider.getByRole('heading', { level: 3 })).toHaveText(
        LATEST_NEWS.map((n) => n.title),
      )
      await expect(page.getByText(NEWS_DRAFT_TITLE)).toHaveCount(0)
      expect(Math.round((await slides.first().boundingBox())!.height)).toBe(NEWS_CARD[width])
      await expect(slider.getByRole('link', { name: LATEST_NEWS[0]!.title })).toHaveAttribute(
        'href',
        `/news/${LATEST_NEWS[0]!.slug}`,
      )

      // Works: «Комплекс» selected, 4 previews in 2 / 4 columns, the button to the works page
      const works = page.getByRole('region', { name: WORKS_TITLE })
      const chips = works.getByRole('group', { name: 'Категории работ' }).getByRole('button')
      await expect(chips.first()).toHaveText('reels')
      await expect(works.getByRole('button', { name: 'Комплекс' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
      const panel = works.locator('#works-complex')
      await expect(panel.getByRole('link')).toHaveCount(4)
      const columns = await panel
        .locator('ul')
        .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length)
      expect(columns).toBe(WORK_COLUMNS[width])
      await expect(works.getByRole('link', { name: /Смотреть все работы/ })).toHaveAttribute(
        'href',
        '/works',
      )

      // Lazy images below the fold: scroll through before the full-page screenshot
      await page.evaluate(async () => {
        for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight / 2) {
          window.scrollTo({ top: y, behavior: 'instant' })
          await new Promise((r) => setTimeout(r, 50))
        }
        // Loaded images only: the hidden works panels and other slides stay lazy
        const loaded = [...document.images].filter((img) => img.complete && img.naturalWidth)
        await Promise.all(loaded.map((img) => img.decode().catch(() => undefined)))
        window.scrollTo({ top: 0, behavior: 'instant' })
      })
      await page.screenshot({ path: `test-results/home/home-${width}.png`, fullPage: true })
      expect(await cls(page)).toBe(0)
      expect(await axe(page)).toEqual([])
      expect(errors).toEqual([])
    })
  }

  // Wider than the 1600 container: the hero and the footer surface span the window, the header,
  // texts and grids keep to the container with the 64 gutter; the page background is bg.
  for (const width of [1728, 2560] as const) {
    test(`${width}: full-bleed hero and footer, content in the container`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 })
      await page.goto(`${BASE}/`)
      const viewport = await page.evaluate(() => document.documentElement.clientWidth)
      const left = (viewport - 1600) / 2 + 64
      const box = async (locator: ReturnType<Page['locator']>) => (await locator.boundingBox())!

      const hero = await box(page.locator('section[aria-labelledby="home-hero-title"]'))
      expect([hero.x, hero.width]).toEqual([0, viewport])
      const footer = await box(page.locator('footer'))
      expect([footer.x, footer.width]).toEqual([0, viewport])

      const header = page.locator('header')
      expect((await box(header.getByRole('link', { name: 'MGS MEBEL — на главную' }))).x).toBe(left)
      const cta = await box(header.getByRole('link', { name: `${home.hero.ctaLabel} в WhatsApp` }))
      expect(cta.x + cta.width).toBe(viewport - left)
      expect((await box(page.locator('h1'))).x).toBe(left)
      const stat = page.locator('ul').filter({ hasText: stats.items[0].label }).first()
      expect((await box(stat.locator('li').first())).x).toBe(left)
      expect((await box(page.locator('footer p').first())).x).toBe(left)

      const backgrounds = await page.evaluate(() =>
        [document.documentElement, document.body].map((el) => getComputedStyle(el).backgroundColor),
      )
      expect(backgrounds).toEqual(['rgb(20, 20, 19)', 'rgb(20, 20, 19)'])

      await page.evaluate(async () => {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })
        const loaded = [...document.images].filter((img) => img.complete && img.naturalWidth)
        await Promise.all(loaded.map((img) => img.decode().catch(() => undefined)))
        window.scrollTo({ top: 0, behavior: 'instant' })
      })
      await page.screenshot({ path: `test-results/home/home-${width}.png` })
      await page.locator('footer').screenshot({ path: `test-results/home/footer-${width}.png` })
      expect(await cls(page)).toBe(0)
      expect(await axe(page)).toEqual([])
    })
  }

  test('390: carousels start at the page gutter', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${BASE}/`)
    const stat = page.locator('ul').filter({ hasText: stats.items[0].label }).first()
    expect(await stat.evaluate((el) => getComputedStyle(el).scrollPaddingLeft)).toBe('20px')
    expect((await stat.locator('li').first().boundingBox())!.x).toBe(20)
    // One card further: snap brings the second card to the gutter
    await stat.evaluate((el) => el.scrollBy({ left: 120, behavior: 'instant' }))
    await expect.poll(async () => (await stat.locator('li').nth(1).boundingBox())!.x).toBe(20)

    const track = page.getByRole('region', { name: NEWS_TITLE }).locator('.snap-x')
    expect((await track.getByRole('group').first().boundingBox())!.x).toBe(20)
  })

  test.describe('news slider', () => {
    test.use({ viewport: { width: 390, height: 844 } })

    const current = (page: Page) =>
      page
        .getByRole('button', { name: /^Показать новость/ })
        .evaluateAll((buttons) => buttons.findIndex((b) => b.getAttribute('aria-current')))

    /** Index of the slide the track is scrolled to, once the smooth scroll has settled. */
    const scrolledTo = (page: Page) =>
      page
        .getByRole('region', { name: NEWS_TITLE })
        .locator('.snap-x')
        .evaluate((track) => {
          const slides = [...track.children] as HTMLElement[]
          return slides.findIndex((s) => Math.abs(s.offsetLeft - track.scrollLeft) < 2)
        })

    test('arrows and segments from the keyboard go round', async ({ page }) => {
      await page.goto(`${BASE}/`)
      const next = page.getByRole('button', { name: 'Следующая новость' })
      const prev = page.getByRole('button', { name: 'Предыдущая новость' })
      await expect.poll(() => current(page)).toBe(0)

      await next.focus()
      await page.keyboard.press('Enter')
      await expect.poll(() => current(page)).toBe(1)
      await expect.poll(() => scrolledTo(page)).toBe(1)
      await page.keyboard.press('Space')
      await expect.poll(() => scrolledTo(page)).toBe(2)
      await page.keyboard.press('Enter')
      await expect.poll(() => scrolledTo(page)).toBe(0)
      await expect.poll(() => current(page)).toBe(0)

      await prev.focus()
      await page.keyboard.press('Enter')
      await expect.poll(() => scrolledTo(page)).toBe(2)
      await expect.poll(() => current(page)).toBe(2)

      await page.getByRole('button', { name: 'Показать новость 2 из 3' }).focus()
      await page.keyboard.press('Enter')
      await expect.poll(() => scrolledTo(page)).toBe(1)
      await expect(page.getByRole('button', { name: 'Показать новость 2 из 3' })).toHaveAttribute(
        'aria-current',
        'true',
      )
    })

    test('a swipe moves the segments', async ({ page }) => {
      await page.goto(`${BASE}/`)
      const track = page.getByRole('region', { name: NEWS_TITLE }).locator('.snap-x')
      await track.evaluate((el) => {
        const last = el.lastElementChild as HTMLElement
        el.scrollTo({ left: last.offsetLeft, behavior: 'instant' })
      })
      await expect.poll(() => current(page)).toBe(2)
    })
  })

  test('works chips switch the panels', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${BASE}/`)
    const works = page.getByRole('region', { name: WORKS_TITLE })
    const reels = works.getByRole('button', { name: 'reels' })
    await expect(reels).toHaveAttribute('aria-controls', 'works-reels')
    await expect(works.locator('#works-reels')).toBeHidden()

    await reels.focus()
    await page.keyboard.press('Enter')
    await expect(reels).toHaveAttribute('aria-pressed', 'true')
    await expect(works.getByRole('button', { name: 'Комплекс' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    await expect(works.locator('#works-complex')).toBeHidden()
    const panel = works.locator('#works-reels')
    await expect(panel).toBeVisible()
    // Video projects: ▶ marker, the link to the works page filtered by the project's category
    const first = panel.getByRole('link').first()
    await expect(first).toContainText('Видео')
    await expect(first).toHaveAttribute('href', /^\/works\?category=[a-z]+$/)

    await works.getByRole('button', { name: 'Кухни' }).click()
    await expect(works.locator('#works-kitchens')).toBeVisible()
    await expect(works.locator('#works-kitchens').getByRole('link').first()).toHaveAttribute(
      'href',
      '/works?category=kitchens',
    )
  })

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
