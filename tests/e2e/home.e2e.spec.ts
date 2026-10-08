import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

import { globals } from '../../src/seed/data/globals'
import { news } from '../../src/seed/data/news'
import { salons } from '../../src/seed/data/salons'
import { cls, layoutShifts } from '../helpers/scroll'
import { E2E_NEWS_COUNT, E2E_SALONS, HOME_DRAFT_TITLE, NEWS_DRAFT_TITLE } from '../helpers/e2eHome'
import { e2eEditor } from '../helpers/e2eEditor'
import { PLAYBACK_ATTR, stubPlayback } from '../helpers/video'

const BASE = 'http://localhost:3000'
const EMPTY_DB = !!process.env.E2E_EMPTY_DB
const { home, salonsPage } = globals(() => 0)
const HERO = home.hero!
const SEGMENTS = HERO.slides!
const CTA_LABEL = HERO.ctaLabel!

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

const NEWS_TITLE = home.news!.title!
const WORKS_TITLE = home.works!.title!
const SALONS_TITLE = home.salons!.title!
const SALON_CTA = salonsPage.map!.cardCtaLabel!
// The card shows the first fixture salon: the one with the longest address
const FIRST_SALON = salons(() => 0).find((s) => s.name === E2E_SALONS[0])!
const MAP = { 390: 500, 834: 560, 1440: 640 } as const

const HEIGHTS = { 390: 844, 834: 1194, 1440: 900 } as const
const NEWS_CARD = { 390: 440, 834: 560, 1440: 640 } as const
const WORK_COLUMNS = { 390: 2, 834: 4, 1440: 4 } as const
// home README §1: 100svh (min 640) on mobile, 780 on tablet, 100vh (min 780) on desktop
const HERO_HEIGHT = { 390: 844, 834: 780, 1440: 900 } as const

const heroSection = (page: Page) => page.locator('section[data-hero]')

/** Index of the segment whose text is shown. */
const segment = (page: Page) =>
  heroSection(page)
    .locator('.hero-text')
    .evaluateAll((blocks) => blocks.findIndex((b) => !b.hasAttribute('data-inactive')))

/** The hero scene listens once hydrated: wait for it before wheels, swipes and keys. */
const hydrated = async (page: Page) => {
  await page.waitForFunction(() => {
    const hero = document.querySelector('section[data-hero]')
    return (
      document.documentElement.style.getPropertyValue('--header-h') !== '' &&
      !!hero &&
      Object.keys(hero).some((key) => key.startsWith('__reactFiber'))
    )
  })
  // Effects run after the hydration commit
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  )
}

// After a step every event is swallowed for 600 ms and its inertia tail is recognised: wait past it
const AFTER_STEP_MS = 700

const scrollY = (page: Page) => page.evaluate(() => window.scrollY)

const center = async (locator: Locator) => {
  const box = (await locator.boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

test.describe('home', () => {
  test.skip(EMPTY_DB, 'needs tests/helpers/seedChrome.ts + seedHome.ts data')

  for (const width of [390, 834, 1440] as const) {
    test(`${width}: hero scene, news, works, salons; axe, CLS, console`, async ({ page }) => {
      const errors = watchConsole(page)
      await page.setViewportSize({ width, height: HEIGHTS[width] })
      await page.goto(`${BASE}/`)

      // One H1: segment 01 of the published hero, never the draft; segment 02 is an H2
      await expect(page.locator('h1')).toHaveCount(1)
      await expect(page.locator('h1')).toHaveText(SEGMENTS[0]!.title)
      await expect(page.getByText(HOME_DRAFT_TITLE)).toHaveCount(0)
      const hero = heroSection(page)
      await expect(hero).toHaveAttribute('aria-roledescription', 'карусель')
      await expect(hero).toHaveAttribute('aria-label', 'О компании')
      await expect(hero.getByRole('heading', { level: 2, includeHidden: true })).toHaveText(
        SEGMENTS[1]!.title,
      )
      await expect(hero.getByRole('group', { name: '2 из 2', includeHidden: true })).toHaveAttribute(
        'aria-hidden',
        'true',
      )

      // Long words are never cut: the text of H1 and H2 (both segments) fits every ancestor that
      // clips horizontally. scrollWidth does not show it: the heading box itself does not overflow.
      const clipped = await hero.locator('h1, h2').evaluateAll((headings) =>
        headings.flatMap((heading) => {
          const range = document.createRange()
          range.selectNodeContents(heading)
          const text = range.getBoundingClientRect()
          const cuts: string[] = []
          for (let el = heading.parentElement; el; el = el.parentElement) {
            if (getComputedStyle(el).overflowX === 'visible') continue
            const box = el.getBoundingClientRect()
            if (text.left < box.left - 0.5 || text.right > box.right + 0.5) {
              cuts.push(`${heading.textContent} cut by ${el.tagName}.${el.className}`)
            }
          }
          if (text.right > document.documentElement.clientWidth) cuts.push(`${heading.textContent} off screen`)
          return cuts
        }),
      )
      expect(clipped).toEqual([])

      // Heights of home README §1; the header lies over the hero, the content sits below it
      expect(Math.round((await hero.boundingBox())!.height)).toBe(HERO_HEIGHT[width])
      await expect(page.locator('header')).toHaveAttribute('data-variant', 'hero')
      const headerBottom = (await page.locator('header').boundingBox())!.y + 80
      const labelTop = (await hero.getByText(`#${SEGMENTS[0]!.label}`).boundingBox())!.y
      expect(labelTop, 'hero content starts below the header').toBeGreaterThanOrEqual(headerBottom)

      // LCP image: the poster of segment 01, preloaded with high priority; segment 02 — low
      const posters = hero.locator('img')
      await expect(posters).toHaveCount(2)
      await expect(posters.first()).toHaveAttribute('fetchpriority', 'high')
      await expect(posters.first()).not.toHaveAttribute('loading', 'lazy')
      await expect(posters.nth(1)).toHaveAttribute('fetchpriority', 'low')

      // CTA (the choice of messengers, tests/e2e/contact.e2e.spec.ts) and the link to «О нас»
      const cta = hero.getByRole('button', { name: `${CTA_LABEL} — выбрать мессенджер` })
      await expect(cta).toHaveAttribute('aria-expanded', 'false')
      await expect(hero.getByRole('link', { name: HERO.linkLabel! })).toHaveAttribute(
        'href',
        '/about',
      )

      // Controls: arrows next to the CTA on mobile, the vertical tab rail from tablet
      const tabs = hero.getByRole('tab')
      const next = hero.getByRole('button', { name: 'Следующий раздел' })
      if (width === 390) {
        await expect(tabs).toHaveCount(0)
        await expect(next).toHaveCount(1)
        const arrow = (await next.boundingBox())!
        expect([arrow.width, arrow.height]).toEqual([52, 52])
        expect(Math.round(arrow.y)).toBe(Math.round((await cta.boundingBox())!.y))
      } else {
        await expect(tabs).toHaveCount(2)
        await expect(hero.getByRole('tablist', { name: 'Разделы' })).toHaveAttribute(
          'aria-orientation',
          'vertical',
        )
        await expect(tabs.first()).toHaveAttribute('aria-selected', 'true')
        await expect(tabs.first()).toHaveAccessibleName(`01 ${SEGMENTS[0]!.label!}`)
        await expect(tabs.nth(1)).toHaveAccessibleName(`02 ${SEGMENTS[1]!.label!}`)
        const arrow = (await next.boundingBox())!
        expect([arrow.width, arrow.height]).toEqual([44, 44])
      }

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
      await salonsSection.screenshot({ path: `test-results/home/salons-${width}.png` })

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
      // CLS 0, with the sources in the message if not (a one-off 0.058 at 390 in CI, #37)
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
      await page.goto(`${BASE}/`)
      // The width of the containing block: headless Linux keeps a 15px scrollbar gutter that
      // documentElement.clientWidth does not subtract
      const viewport = await page.evaluate(() => document.body.clientWidth)
      const left = (viewport - 1600) / 2 + 64
      const box = async (locator: ReturnType<Page['locator']>) => (await locator.boundingBox())!

      const hero = await box(heroSection(page))
      expect([hero.x, hero.width]).toEqual([0, viewport])
      const footer = await box(page.locator('footer'))
      expect([footer.x, footer.width]).toEqual([0, viewport])

      const header = page.locator('header')
      expect((await box(header.getByRole('link', { name: 'MGS MEBEL — на главную' }))).x).toBe(left)
      const cta = await box(
        header.getByRole('button', { name: `${CTA_LABEL} — выбрать мессенджер` }),
      )
      expect(cta.x + cta.width).toBe(viewport - left)
      expect((await box(page.locator('h1'))).x).toBe(left)
      // The tab rail keeps to the right edge of the container
      const rail = await box(heroSection(page).getByRole('tab').first())
      // Half pixels with an odd containing block (the Linux scrollbar gutter): within 1px
      expect(Math.abs(rail.x + rail.width - (viewport - left))).toBeLessThanOrEqual(1)
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
      await page.screenshot({ path: `test-results/home/home-${width}.png` })
      await page.locator('footer').screenshot({ path: `test-results/home/footer-${width}.png` })
      expect(await cls(page)).toBe(0)
      expect(await axe(page)).toEqual([])
    })
  }

  // `display: 'optional'` (fonts.ts): a woff2 that arrives after the first paint must not reflow
  // the page — the browser keeps the already-painted fallback for the rest of the document.
  test.describe('fonts', () => {
    /** What actually painted the element, not the declared `font-family` list (next/font always
     * lists `"manrope", "manrope Fallback"` whether or not the woff2 made it in time). */
    const paintedFont = async (page: Page, selector: string) => {
      const cdp = await page.context().newCDPSession(page)
      await cdp.send('DOM.enable')
      await cdp.send('CSS.enable')
      const { root } = await cdp.send('DOM.getDocument')
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector })
      const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId })
      return fonts.map((f) => f.familyName).join(', ')
    }

    test('the page is painted with Manrope', async ({ page }) => {
      await page.goto(`${BASE}/`)
      await expect(page.locator('h1')).toBeVisible()
      await page.waitForTimeout(300)
      expect(await paintedFont(page, 'h1')).toMatch(/^Manrope/i)
      expect(await page.evaluate(() => document.fonts.check('16px Manrope'))).toBe(true)
      const family = await page.locator('h1').evaluate((el) => getComputedStyle(el).fontFamily)
      expect(family.toLowerCase().startsWith('manrope')).toBe(true)
    })

    for (const width of [390, 834, 1440] as const) {
      test(`${width}: a late font falls back to Arial without a layout shift`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.route('**/*.woff2', async (route) => {
          await new Promise((resolve) => setTimeout(resolve, 300))
          await route.continue()
        })
        await page.goto(`${BASE}/`)
        await expect(page.locator('h1')).toBeVisible()
        await page.waitForTimeout(500)
        expect(await layoutShifts(page), 'layout shifts: value, start, what moved').toEqual([])
        // `optional`: a font that misses its ~100ms window is not swapped in later
        expect(await paintedFont(page, 'h1')).not.toMatch(/^Manrope/i)
        await page.unrouteAll({ behavior: 'ignoreErrors' })
      })
    }
  })

  test('390: the news carousel starts at the page gutter', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${BASE}/`)
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

    // README §3: only the current card downloads and plays its cover video. In the fixture the
    // first and the last card have one (the minimal mp4). At 390 the first card is within the
    // mount margin of the viewport already on opening.
    test('a cover video only on the current card; the card left stays paused', async ({ page }) => {
      const covers = news((key) => (/^H\d/.test(key) ? 1 : 0))
        .slice(0, E2E_NEWS_COUNT)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 3)
        .map((item) => Boolean(item.coverVideo))
      expect(covers).toEqual([true, false, true])

      const errors = watchConsole(page)
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await stubPlayback(page)
      await page.goto(`${BASE}/`)
      await hydrated(page)
      const region = page.getByRole('region', { name: NEWS_TITLE })
      const slides = region.getByRole('group')
      await region.scrollIntoViewIfNeeded()
      const first = slides.nth(0).locator('video')
      await expect(first).toHaveAttribute(PLAYBACK_ATTR, 'playing')
      await expect(first.locator('source')).toHaveAttribute('src', /\.mp4$/)
      await expect(slides.nth(2).locator('video')).toHaveCount(0)

      await page.getByRole('button', { name: 'Следующая новость' }).focus()
      await page.keyboard.press('Enter')
      await expect.poll(() => current(page)).toBe(1)
      await expect(first).toHaveAttribute(PLAYBACK_ATTR, 'paused')
      await expect(slides.nth(1).locator('video')).toHaveCount(0)
      await expect(slides.nth(2).locator('video')).toHaveCount(0)

      await page.keyboard.press('Enter')
      await expect.poll(() => current(page)).toBe(2)
      await expect(slides.nth(2).locator('video')).toHaveAttribute(PLAYBACK_ATTR, 'playing')
      // Kept, paused where it was
      await expect(first).toHaveAttribute(PLAYBACK_ATTR, 'paused')
      expect(errors).toEqual([])
      await page.unrouteAll({ behavior: 'ignoreErrors' })
    })

    test('reduced motion: the cover posters only, no video requested', async ({ page }) => {
      const requests: string[] = []
      page.on('request', (r) => {
        if (/\.(mp4|webm)(\?|$)/.test(r.url())) requests.push(r.url())
      })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto(`${BASE}/`)
      await hydrated(page)
      const region = page.getByRole('region', { name: NEWS_TITLE })
      await region.scrollIntoViewIfNeeded()
      await page.waitForLoadState('networkidle')
      await expect(region.getByRole('group').first().locator('img')).toBeVisible()
      await expect(region.locator('video')).toHaveCount(0)
      expect(requests).toEqual([])
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

  test('salon card: × and «Показать салон» from the keyboard move the focus', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${BASE}/`)
    const section = page.getByRole('region', { name: SALONS_TITLE })
    const name = section.getByRole('heading', { level: 3, name: FIRST_SALON.name })

    // «Список» → Tab → × of the card
    await section.getByRole('link', { name: 'Список' }).focus()
    await page.keyboard.press('Tab')
    const close = section.getByRole('button', { name: 'Скрыть карточку салона' })
    await expect(close).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(name).toHaveCount(0)
    const show = section.getByRole('button', { name: 'Показать салон' })
    await expect(show).toBeFocused()

    await page.keyboard.press('Space')
    await expect(name).toBeVisible()
    await expect(section.getByRole('button', { name: 'Скрыть карточку салона' })).toBeFocused()
    await expect(show).toHaveCount(0)
  })

  test('«Список» opens the salons page', async ({ page }) => {
    await page.goto(`${BASE}/`)
    await page
      .getByRole('region', { name: SALONS_TITLE })
      .getByRole('link', { name: 'Список' })
      .click()
    await expect(page).toHaveURL(`${BASE}/salons`)
  })

  test.describe('hero scene', () => {
    test('1440: one wheel — one step, the page stays; then the wheel scrolls; up at the top → 01', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto(`${BASE}/`)
      await hydrated(page)
      await page.mouse.move(400, 450)

      await page.mouse.wheel(0, 100)
      await expect.poll(() => segment(page)).toBe(1)
      expect(await scrollY(page)).toBe(0)

      // A new gesture down on 02 scrolls the page
      await page.waitForTimeout(AFTER_STEP_MS)
      await page.mouse.wheel(0, 100)
      await expect.poll(() => scrollY(page)).toBeGreaterThan(0)
      expect(await segment(page)).toBe(1)

      // Back at the top, a gesture up returns to 01 and the page stays
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
      await page.waitForTimeout(AFTER_STEP_MS)
      await page.mouse.wheel(0, -100)
      await expect.poll(() => segment(page)).toBe(0)
      expect(await scrollY(page)).toBe(0)
      await expect(heroSection(page).getByRole('tab').first()).toHaveAttribute(
        'aria-selected',
        'true',
      )
    })

    test('1440: page keys step the scene; shortcuts and focused controls keep their keys', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto(`${BASE}/`)
      await hydrated(page)

      const steps: [string, number][] = [
        ['ArrowDown', 1],
        ['ArrowUp', 0],
        ['PageDown', 1],
        ['PageUp', 0],
        ['Space', 1],
        ['Shift+Space', 0],
      ]
      for (const [key, expected] of steps) {
        await page.keyboard.press(key)
        await expect.poll(() => segment(page), key).toBe(expected)
        expect(await scrollY(page), key).toBe(0)
        await page.waitForTimeout(AFTER_STEP_MS)
      }

      // ⌘↓ / Ctrl+↓ are not taken over: no step
      for (const key of ['Meta+ArrowDown', 'Control+ArrowDown']) {
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
        await page.keyboard.press(key)
        await page.waitForTimeout(200)
        expect(await segment(page), key).toBe(0)
      }
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))

      // Space on the CTA opens the choice of messengers, the scene stays
      const cta = heroSection(page).getByRole('button', {
        name: `${CTA_LABEL} — выбрать мессенджер`,
      })
      await cta.focus()
      await page.keyboard.press('Space')
      await expect(
        heroSection(page).getByRole('button', { name: 'Закрыть выбор мессенджера' }),
      ).toHaveAttribute('aria-expanded', 'true')
      expect(await segment(page)).toBe(0)
      await page.keyboard.press('Escape')
    })

    test('834: tabs from the keyboard go round with roving focus', async ({ page }) => {
      await page.setViewportSize({ width: 834, height: 1194 })
      await page.goto(`${BASE}/`)
      await hydrated(page)
      const tabs = heroSection(page).getByRole('tab')
      await tabs.first().focus()

      await page.keyboard.press('ArrowDown')
      await expect(tabs.nth(1)).toBeFocused()
      await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true')
      await expect(tabs.first()).toHaveAttribute('tabindex', '-1')
      expect(await segment(page)).toBe(1)
      await page.keyboard.press('ArrowRight')
      await expect(tabs.first()).toBeFocused()
      expect(await segment(page)).toBe(0)
      await page.keyboard.press('ArrowUp')
      await expect(tabs.nth(1)).toBeFocused()
      expect(await segment(page)).toBe(1)
      expect(await scrollY(page)).toBe(0)
    })

    test.describe('390 touch', () => {
      test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

      test('one swipe — one step, the page stays', async ({ page }) => {
        await page.goto(`${BASE}/`)
        await hydrated(page)
        const cdp = await page.context().newCDPSession(page)
        const swipe = async (from: number, to: number) => {
          await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints: [{ x: 195, y: from }],
          })
          for (let i = 1; i <= 6; i++) {
            await cdp.send('Input.dispatchTouchEvent', {
              type: 'touchMove',
              touchPoints: [{ x: 195, y: from + ((to - from) * i) / 6 }],
            })
          }
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
        }

        await swipe(500, 380)
        await expect.poll(() => segment(page)).toBe(1)
        expect(await scrollY(page)).toBe(0)
        await page.waitForTimeout(AFTER_STEP_MS)
        await swipe(380, 500)
        await expect.poll(() => segment(page)).toBe(0)
        expect(await scrollY(page)).toBe(0)
      })
    })

    test('a mouse click on → does not stop the automatic switching', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto(`${BASE}/`)
      await page.addStyleTag({ content: ':root { --motion-hero-progress: 1s }' })
      await hydrated(page)
      const next = heroSection(page).getByRole('button', { name: 'Следующий раздел' })
      const { x, y } = await center(next)
      await page.mouse.click(x, y)
      await expect.poll(() => segment(page)).toBe(1)
      await expect(next).toBeFocused()
      // The pointer stays over → (hover does not pause), the focus too (not from the keyboard)
      await expect.poll(() => segment(page), { timeout: 5000 }).toBe(0)
      await expect(next).toBeFocused()
    })

    for (const [width, height] of [
      [375, 667],
      [390, 844],
      [430, 932],
    ] as const) {
      test(`${width}: the progress line sits right above the label of either segment`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height })
        await page.goto(`${BASE}/`)
        await hydrated(page)
        const hero = heroSection(page)
        /** Visible progress row of the active block: «01 … 02», the gap down to its label. */
        const row = () =>
          hero.locator('.hero-text:not([data-inactive])').evaluate((block) => {
            const line = block.firstElementChild!
            const label = line.nextElementSibling!
            const numbers = [...line.children]
              .filter((el) => el.textContent)
              .map((el) => [el.textContent, getComputedStyle(el).color])
            return {
              gap: label.getBoundingClientRect().top - line.getBoundingClientRect().bottom,
              numbers,
            }
          })
        const first = await row()
        const next = hero.getByRole('button', { name: 'Следующий раздел' })
        const { x, y } = await center(next)
        await page.mouse.click(x, y)
        await expect.poll(() => segment(page)).toBe(1)
        const second = await row()
        expect(first.gap).toBeGreaterThan(0)
        expect(second.gap).toBe(first.gap)
        // «01 … 02»: the active number in accent, the other one dimmed
        expect(first.numbers.map(([text]) => text)).toEqual(['01', '02'])
        expect(second.numbers.map(([text]) => text)).toEqual(['01', '02'])
        expect(first.numbers[0]![1]).toBe(second.numbers[1]![1])
        expect(first.numbers[1]![1]).toBe(second.numbers[0]![1])
        expect(first.numbers[0]![1]).not.toBe(first.numbers[1]![1])
        // The link to «О нас» stays last: 32 as drawn, 14 under the arrows, 4 above the hero bottom
        const linkLocator = hero.getByRole('link', { name: HERO.linkLabel! })
        const link = (await linkLocator.boundingBox())!
        const box = (await hero.boundingBox())!
        const arrow = (await next.boundingBox())!
        expect(Math.round(link.height)).toBe(32)
        expect(Math.round(link.y - (arrow.y + arrow.height))).toBe(14)
        expect(Math.round(box.y + box.height - (link.y + link.height))).toBe(4)
        // Hit area ≥ 44 from ::before: its top edge, above the link box, still hits the link
        const hit = await linkLocator.evaluate((el) => {
          const before = getComputedStyle(el, '::before')
          const rect = el.getBoundingClientRect()
          const top = rect.top + rect.height / 2 - parseFloat(before.height) / 2 + 1
          const target = document.elementFromPoint(rect.left + rect.width / 2, top)
          return { height: parseFloat(before.height), hits: !!target && el.contains(target) }
        })
        expect(hit.height).toBeGreaterThanOrEqual(44)
        expect(hit.hits).toBe(true)
      })
    }

    test.describe('reduced motion', () => {
      test.use({ viewport: { width: 1440, height: 900 } })

      test('no progress animation, so no switching; no video requests', async ({ page }) => {
        const videos: string[] = []
        page.on('request', (r) => {
          if (/\.(mp4|webm)(\?|$)/.test(r.url())) videos.push(r.url())
        })
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.goto(`${BASE}/`)
        await hydrated(page)
        const fill = heroSection(page).locator('.hero-progress:visible')
        await expect(fill).toHaveCount(1)
        expect(await fill.evaluate((el) => getComputedStyle(el).animationName)).toBe('none')
        expect(await fill.evaluate((el) => getComputedStyle(el).transform)).toBe('none')
        expect(await segment(page)).toBe(0)
        expect(videos).toEqual([])
      })
    })

    // A single segment is a plain hero: no rail, no arrows, the wheel scrolls the page. Checked on
    // a draft in draft mode (published pages are cached), then the draft is put back.
    test('one segment: no controls, the wheel scrolls the page', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      const login = await page.request.post(`${BASE}/api/users/login`, {
        data: { email: e2eEditor.email, password: e2eEditor.password },
      })
      expect(login.ok()).toBe(true)
      const url = `${BASE}/api/globals/home?draft=true&depth=0`
      const draft = await (await page.request.get(url)).json()
      const save = (hero: unknown) =>
        page.request.post(`${BASE}/api/globals/home?draft=true`, {
          data: { ...draft, hero, _status: 'draft' },
        })
      try {
        expect(
          (await save({ ...draft.hero, slides: draft.hero.slides.slice(0, 1) })).ok(),
        ).toBe(true)
        await page.goto(`${BASE}/preview?path=/`)
        await hydrated(page)
        const hero = heroSection(page)
        await expect(page.locator('h1')).toHaveText(HOME_DRAFT_TITLE)
        await expect(hero).not.toHaveAttribute('aria-roledescription')
        await expect(hero).toHaveAttribute('aria-labelledby', 'home-hero-title')
        await expect(hero.getByRole('tab')).toHaveCount(0)
        await expect(hero.getByRole('button', { name: /раздел$/ })).toHaveCount(0)
        await expect(hero.locator('.hero-progress')).toHaveCount(0)

        await page.mouse.move(400, 450)
        await page.mouse.wheel(0, 100)
        await expect.poll(() => scrollY(page)).toBeGreaterThan(0)
      } finally {
        expect((await save(draft.hero)).ok()).toBe(true)
        await page.request.get(`${BASE}/preview/exit?path=/`, { maxRedirects: 0 })
      }
    })
  })

  test('anonymous API never gets the home draft', async ({ request }) => {
    for (const query of ['', '?draft=true']) {
      const response = await request.get(`${BASE}/api/globals/home${query}`)
      expect(response.ok()).toBe(true)
      expect((await response.json()).hero.slides[0].title).toBe(SEGMENTS[0]!.title)
    }
  })
})

test('home on an empty database renders without sections @empty', async ({ page }) => {
  test.skip(!EMPTY_DB, 'empty database only')
  const errors = watchConsole(page)
  const response = await page.goto(`${BASE}/`)
  expect(response?.status()).toBe(200)
  await expect(page.locator('main#content')).toHaveCount(1)
  await expect(page.locator('section[data-hero]')).toHaveCount(0)
  await expect(page.locator('section[aria-labelledby="home-salons-title"]')).toHaveCount(0)
  await expect(page.getByRole('group', { name: 'Вид: карта или список' })).toHaveCount(0)
  expect(await axe(page)).toEqual([])
  expect(errors).toEqual([])
})
