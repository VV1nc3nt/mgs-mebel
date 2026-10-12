import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { globals } from '../../src/seed/data/globals'
import { news } from '../../src/seed/data/news'
import { salons } from '../../src/seed/data/salons'
import { layoutShifts } from '../helpers/scroll'
import { E2E_NEWS_COUNT, E2E_SALONS, NEWS_DRAFT_TITLE } from '../helpers/e2eHome'
import { PLAYBACK_ATTR, stubPlayback } from '../helpers/video'

// «О нас» is the former home page (hero, statistics, history, news, salons, works): the same
// content checks as the home page had, plus the breadcrumbs.
const BASE = 'http://localhost:3000'
const URL = `${BASE}/about`
const EMPTY_DB = !!process.env.E2E_EMPTY_DB
const { about, layout, stats, salonsPage } = globals(() => 0)

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

// The slider: the latest three of the published fixture news, newest first
const LATEST_NEWS = news(() => 0)
  .slice(0, E2E_NEWS_COUNT)
  .sort((a, b) => b.date.localeCompare(a.date))
  .slice(0, 3)

const NEWS_TITLE = about.news!.title!
const WORKS_TITLE = about.works!.title!
const SALONS_TITLE = about.salons!.title!
const SALON_CTA = salonsPage.map!.cardCtaLabel!
// The card shows the first fixture salon: the one with the longest address
const FIRST_SALON = salons(() => 0).find((s) => s.name === E2E_SALONS[0])!
const MAP = { 390: 500, 834: 560, 1440: 640 } as const

const HEIGHTS = { 390: 844, 834: 1194, 1440: 900 } as const
const NEWS_CARD = { 390: 440, 834: 560, 1440: 640 } as const
const WORK_COLUMNS = { 390: 2, 834: 4, 1440: 4 } as const
const HERO = { 390: 640, 834: 780, 1440: 900 } as const
const STAT_COLUMNS = { 390: 0, 834: 3, 1440: 6 } as const

test.describe('about', () => {
  test.skip(EMPTY_DB, 'needs tests/helpers/seedChrome.ts + seedHome.ts data')

  for (const width of [390, 834, 1440] as const) {
    test(`${width}: the former home page; axe, CLS, console`, async ({ page }) => {
      const errors = watchConsole(page)
      await page.setViewportSize({ width, height: HEIGHTS[width] })
      await page.goto(URL)

      // One H1: the published hero title
      await expect(page.locator('h1')).toHaveCount(1)
      await expect(page.locator('h1')).toHaveText(about.hero.title)

      // Hero: README §4 heights; the header lies over it; the content sits below the header
      const hero = page.locator('section[aria-labelledby="about-hero-title"]')
      expect(Math.round((await hero.boundingBox())!.height)).toBe(HERO[width])
      await expect(page.locator('header')).toHaveAttribute('data-variant', 'hero')
      const headerBottom = (await page.locator('header').boundingBox())!.y + 80
      const labelTop = (await hero.getByText(`#${about.hero.label}`).boundingBox())!.y
      expect(labelTop, 'hero content starts below the header').toBeGreaterThanOrEqual(headerBottom)

      // LCP image: the poster, preloaded with high priority
      const poster = hero.locator('img').first()
      await expect(poster).toHaveAttribute('fetchpriority', 'high')
      await expect(poster).not.toHaveAttribute('loading', 'lazy')

      // CTA: the choice of messengers (tests/e2e/contact.e2e.spec.ts)
      const cta = hero.getByRole('button', { name: `${about.hero.ctaLabel} — выбрать мессенджер` })
      await expect(cta).toHaveAttribute('aria-expanded', 'false')

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

      // History: year plate, values; no link to the page itself
      await expect(page.getByText(about.history.yearValue!, { exact: true })).toBeVisible()
      for (const value of about.history.values!) {
        await expect(page.getByText(value.label, { exact: true })).toBeVisible()
      }
      await expect(page.getByRole('link', { name: /Подробнее о компании/ })).toHaveCount(0)

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

      // Salons: the map block of the design heights, the card of the first salon
      const salonsSection = page.getByRole('region', { name: SALONS_TITLE })
      const map = salonsSection.locator('.bg-map-bg')
      const mapBox = (await map.boundingBox())!
      expect(Math.round(mapBox.height)).toBe(MAP[width])
      const view = salonsSection.getByRole('group', { name: 'Вид: карта или список' })
      await expect(view.getByText('Карта', { exact: true })).toHaveAttribute('aria-current', 'true')
      await expect(view.getByRole('link', { name: 'Список' })).toHaveAttribute('href', '/salons')
      const card = salonsSection.getByRole('heading', { level: 3, name: FIRST_SALON.name })
      await expect(card).toBeVisible()
      await expect(salonsSection.getByText(FIRST_SALON.address, { exact: true })).toBeVisible()
      await expect(salonsSection.getByRole('link', { name: FIRST_SALON.phone! })).toHaveAttribute(
        'href',
        'tel:84957773575',
      )
      const salonCta = salonsSection.getByRole('button', {
        name: `${SALON_CTA} — выбрать мессенджер`,
      })
      await expect(salonCta).toHaveAttribute('aria-expanded', 'false')
      // The card (longest address) fits the map below the view switch
      const cardBox = (await salonsSection.locator('.max-w-salon-card').boundingBox())!
      const viewBox = (await view.boundingBox())!
      expect(cardBox.y, 'card below the view switch').toBeGreaterThanOrEqual(
        viewBox.y + viewBox.height,
      )
      expect(cardBox.y + cardBox.height).toBeLessThanOrEqual(mapBox.y + mapBox.height)
      await salonsSection.screenshot({ path: `test-results/about/salons-${width}.png` })

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
      await page.screenshot({ path: `test-results/about/about-${width}.png`, fullPage: true })
      expect(await layoutShifts(page), 'layout shifts: value, start, what moved').toEqual([])
      expect(await axe(page)).toEqual([])
      expect(errors).toEqual([])
    })
  }

  // Wider than the 1600 container: the hero and the footer surface span the window, the header,
  // texts and grids keep to the container with the 64 gutter; the page background is bg.
  for (const width of [1728, 2560] as const) {
    test(`${width}: full-bleed hero and footer, content in the container`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 })
      await page.goto(URL)
      // The width of the containing block: headless Linux keeps a 15px scrollbar gutter that
      // documentElement.clientWidth does not subtract
      const viewport = await page.evaluate(() => document.body.clientWidth)
      const left = (viewport - 1600) / 2 + 64
      const box = async (locator: ReturnType<Page['locator']>) => (await locator.boundingBox())!

      const hero = await box(page.locator('section[aria-labelledby="about-hero-title"]'))
      expect([hero.x, hero.width]).toEqual([0, viewport])
      const footer = await box(page.locator('footer'))
      expect([footer.x, footer.width]).toEqual([0, viewport])

      const header = page.locator('header')
      expect((await box(header.getByRole('link', { name: 'MGS MEBEL — на главную' }))).x).toBe(left)
      const cta = await box(
        header.getByRole('button', { name: `${about.hero.ctaLabel} — выбрать мессенджер` }),
      )
      expect(cta.x + cta.width).toBe(viewport - left)
      expect((await box(page.locator('h1'))).x).toBe(left)
      const stat = page.locator('ul').filter({ hasText: stats.items[0].label }).first()
      expect((await box(stat.locator('li').first())).x).toBe(left)
      expect((await box(page.locator('footer p').first())).x).toBe(left)
      // The salon map is not a background: it keeps to the container
      const map = await box(page.getByRole('region', { name: SALONS_TITLE }).locator('.bg-map-bg'))
      expect([map.x, map.width]).toEqual([left, 1600 - 128])

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
      await page.screenshot({ path: `test-results/about/about-${width}.png` })
      await page.locator('footer').screenshot({ path: `test-results/about/footer-${width}.png` })
      expect(await layoutShifts(page), 'layout shifts: value, start, what moved').toEqual([])
      expect(await axe(page)).toEqual([])
    })
  }

  // Background video fallback (README §1.3). The hero has the minimal fixture mp4; whether a
  // browser plays it depends on its codecs, so the failures are made deterministic by routing.
  test.describe('hero background video', () => {
    const MP4 = '**/*.mp4'
    const heroOf = (page: Page) => page.locator('section[aria-labelledby="about-hero-title"]')
    const hydrated = (page: Page) =>
      page.waitForFunction(
        () => document.documentElement.style.getPropertyValue('--header-h') !== '',
      )

    test('reduced motion: the poster only, no video requested', async ({ page }) => {
      const requests: string[] = []
      page.on('request', (request) => {
        if (new globalThis.URL(request.url()).pathname.endsWith('.mp4'))
          requests.push(request.url())
      })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto(URL)
      await hydrated(page)
      await page.waitForLoadState('networkidle')
      await expect(heroOf(page).locator('img').first()).toBeVisible()
      await expect(heroOf(page).locator('video')).toHaveCount(0)
      expect(requests).toEqual([])
    })

    // The hero and two news cards have a video: on opening only the hero one is mounted and
    // requested, the news one once half of the card is in view.
    test('on opening only the hero video; a news cover video once the card is in view', async ({
      page,
    }) => {
      const errors = watchConsole(page)
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await stubPlayback(page)
      await page.goto(URL)
      await hydrated(page)
      const news = page.getByRole('region', { name: NEWS_TITLE })
      await expect(heroOf(page).locator('video')).toHaveAttribute(PLAYBACK_ATTR, 'playing')
      await expect(page.locator('video')).toHaveCount(1)

      await news.scrollIntoViewIfNeeded()
      const card = news.getByRole('group').first().locator('video')
      await expect(card).toHaveAttribute(PLAYBACK_ATTR, 'playing')
      await expect(news.locator('video')).toHaveCount(1)
      // The hero, out of view now, is paused
      await expect(heroOf(page).locator('video')).toHaveAttribute(PLAYBACK_ATTR, 'paused')
      expect(errors).toEqual([])
      await page.unrouteAll({ behavior: 'ignoreErrors' })
    })

    test('a failed request: back to the poster on error', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await page.route(MP4, (route) => route.abort())
      const requested = page.waitForRequest((r) => r.url().endsWith('.mp4'))
      await page.goto(URL)
      await requested
      const failedAt = Date.now()
      // On error, well before the 4 s start timeout
      await expect(heroOf(page).locator('video')).toHaveCount(0, { timeout: 3000 })
      expect(Date.now() - failedAt).toBeLessThan(3000)
      await expect(heroOf(page).locator('img').first()).toBeVisible()
    })

    test('no response: back to the poster without playing', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      // Never answered: the video neither plays nor reports an error.
      await page.route(MP4, () => {})
      const requested = page.waitForRequest((r) => r.url().endsWith('.mp4'))
      await page.goto(URL)
      await requested
      const startedAt = Date.now()
      await expect(heroOf(page).locator('video')).toHaveCount(1)
      await expect(heroOf(page).locator('video')).toHaveCount(0, { timeout: 6000 })
      // The 4 s start timeout (counted from the play attempt, just before the request is seen)
      expect(Date.now() - startedAt).toBeGreaterThan(3500)
      await expect(heroOf(page).locator('img').first()).toBeVisible()
      await page.unrouteAll({ behavior: 'ignoreErrors' })
    })
  })

  test('breadcrumbs: Главная → О нас', async ({ page }) => {
    await page.goto(URL)
    const data = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((nodes) => nodes.map((n) => JSON.parse(n.textContent ?? '{}')))
    const breadcrumbs = data.find((d) => d['@type'] === 'BreadcrumbList')
    expect(breadcrumbs.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Главная', item: BASE },
      { '@type': 'ListItem', position: 2, name: layout.nav!.about!.label, item: URL },
    ])
  })
})

test('about on an empty database renders without sections @empty', async ({ page }) => {
  test.skip(!EMPTY_DB, 'empty database only')
  const errors = watchConsole(page)
  const response = await page.goto(URL)
  expect(response?.status()).toBe(200)
  await expect(page.locator('main#content')).toHaveCount(1)
  await expect(page.locator('section[aria-labelledby="about-hero-title"]')).toHaveCount(0)
  await expect(page.locator('section[aria-labelledby="about-salons-title"]')).toHaveCount(0)
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1)
  expect(await axe(page)).toEqual([])
  expect(errors).toEqual([])
})
