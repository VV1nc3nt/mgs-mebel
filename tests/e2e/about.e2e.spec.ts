import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { globals } from '../../src/seed/data/globals'
import { layoutShifts } from '../helpers/scroll'
import { ABOUT_CTA } from '../helpers/e2eHome'
import { e2eEditor } from '../helpers/e2eEditor'
import { swiper } from '../helpers/swipe'
import { PLAYBACK_ATTR, stubPlayback } from '../helpers/video'

// «О нас» v2: hero, the statistics strip (< 1280), the intro (≥ 1280), history (+ the statistics
// grid ≥ 1280), the video presentation, hardware, exhibitions; plus the breadcrumbs.
const BASE = 'http://localhost:3000'
const URL = `${BASE}/about`
const EMPTY_DB = !!process.env.E2E_EMPTY_DB
const { about, layout, stats } = globals(() => 0)

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

const HEIGHTS = { 390: 844, 834: 1194, 1440: 900 } as const
const HERO = { 390: 640, 834: 780, 1440: 900 } as const

const hydrated = (page: Page) =>
  page.waitForFunction(() => document.documentElement.style.getPropertyValue('--header-h') !== '')
const presentationOf = (page: Page) =>
  page.locator('section[aria-labelledby="about-mission-title"]')
const hardwareOf = (page: Page) => page.locator('section[aria-labelledby="about-hardware-title"]')
const exhibitionsOf = (page: Page) =>
  page.locator('section[aria-labelledby="about-exhibitions-title"]')
const trackOf = (page: Page) => exhibitionsOf(page).locator('.snap-x')
const slideOf = (page: Page, i: number) => trackOf(page).getByRole('group').nth(i)
/** Index of the active exhibition card (`data-active`). */
const activeSlide = (page: Page) =>
  trackOf(page).evaluate((el) =>
    [...el.children].findIndex((child) => child.hasAttribute('data-active')),
  )
/** The track's distance from the snap target of a card (snap-start, clamped to the range). */
const offsetFromTarget = (page: Page, index: number) =>
  trackOf(page).evaluate((el, i) => {
    const card = el.children[i] as HTMLElement
    const max = el.scrollWidth - el.clientWidth
    const target = card.offsetLeft - parseFloat(getComputedStyle(el).scrollPaddingLeft)
    return Math.min(Math.max(target, 0), max) - el.scrollLeft
  }, index)

test.describe('about', () => {
  test.skip(EMPTY_DB, 'needs tests/helpers/seedChrome.ts + seedHome.ts data')

  for (const width of [390, 834, 1440] as const) {
    test(`${width}: hero, statistics, history; axe, CLS, console`, async ({ page }) => {
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
      const cta = hero.getByRole('button', { name: `${ABOUT_CTA} — выбрать мессенджер` })
      await expect(cta).toHaveAttribute('aria-expanded', 'false')

      // Statistics: a scroll-snap strip under 1280, a grid of 3 in the history from 1280
      const strip = page.locator('ul[tabindex="0"]').filter({ hasText: stats.items[0].label })
      const grid = page.locator('ul:not([tabindex])').filter({ hasText: stats.items[0].label })
      await expect(strip.locator('li')).toHaveCount(stats.items.length)
      await expect(grid.locator('li')).toHaveCount(stats.items.length)
      if (width < 1280) {
        await expect(strip).toBeVisible()
        await expect(grid).toBeHidden()
        expect(await strip.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true)
      } else {
        await expect(strip).toBeHidden()
        await expect(grid).toBeVisible()
        expect(
          await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length),
        ).toBe(3)
      }

      // Intro: in the HTML at every width, shown from 1280 only
      const intro = page.getByText(about.intro!.accent!, { exact: true })
      await expect(intro).toHaveCount(1)
      if (width < 1280) await expect(intro).toBeHidden()
      else await expect(intro).toBeVisible()

      // History: year plate; no link to the page itself
      await expect(page.getByText(about.history.yearValue!, { exact: true })).toBeVisible()
      await expect(page.getByRole('link', { name: /Подробнее о компании/ })).toHaveCount(0)

      // Sections in order: hero, [strip], [intro], history, presentation, hardware, exhibitions
      const order = [
        page.locator('h1'),
        ...(width < 1280 ? [strip] : [intro]),
        page.getByText(about.history.lead!, { exact: true }),
        page.locator('#about-mission-title'),
        page.locator('#about-hardware-title'),
        page.locator('#about-exhibitions-title'),
      ]
      const tops: number[] = []
      for (const locator of order) tops.push((await locator.boundingBox())!.y)
      expect(tops).toEqual([...tops].sort((a, b) => a - b))
      await expect(page.locator('main h2')).toHaveText([
        about.mission.title!,
        about.hardware.title!,
        about.exhibitions!.title!,
      ])
      await expect(exhibitionsOf(page).locator('h3')).toHaveText(
        about.exhibitions!.items!.map((item) => item.title),
      )

      // Lazy images below the fold: scroll through before the full-page screenshot
      await page.evaluate(async () => {
        for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight / 2) {
          window.scrollTo({ top: y, behavior: 'instant' })
          await new Promise((r) => setTimeout(r, 50))
        }
        // Loaded images only
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
        header.getByRole('button', { name: `${layout.header!.ctaLabel} — выбрать мессенджер` }),
      )
      expect(cta.x + cta.width).toBe(viewport - left)
      expect((await box(page.locator('h1'))).x).toBe(left)
      expect((await box(presentationOf(page).locator('h2'))).x).toBe(left + 48)
      expect((await box(hardwareOf(page).locator('.rounded-media'))).x).toBe(left)
      expect((await box(slideOf(page, 0))).x).toBe(left)
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

    // On opening only the hero video is mounted and requested; out of view it pauses.
    test('on opening only the hero video; it pauses out of view', async ({ page }) => {
      const errors = watchConsole(page)
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await stubPlayback(page)
      await page.goto(URL)
      await hydrated(page)
      await expect(heroOf(page).locator('video')).toHaveAttribute(PLAYBACK_ATTR, 'playing')
      await expect(page.locator('video')).toHaveCount(1)

      await page.locator('footer').scrollIntoViewIfNeeded()
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

  // Video presentation (about v2 §2.5): the file plays in place with the native controls and gives
  // the poster back when it ends; from 1280 the heading over it fades while it plays.
  test.describe('presentation', () => {
    const PLAY = `Смотреть видео: ${about.mission.caption}`

    for (const width of [390, 1440] as const) {
      test(`${width}: a click / Enter plays the file; ended — the poster and ▶`, async ({
        page,
      }) => {
        const errors = watchConsole(page)
        await page.emulateMedia({ reducedMotion: 'no-preference' })
        await stubPlayback(page)
        await page.setViewportSize({ width, height: HEIGHTS[width] })
        await page.goto(URL)
        await hydrated(page)
        const section = presentationOf(page)
        const play = section.getByRole('button', { name: PLAY })
        await play.scrollIntoViewIfNeeded()
        const heading = section.locator('h2')
        const shown = () =>
          heading.evaluate((el) => {
            const box = el.parentElement!
            return `${getComputedStyle(box).opacity} ${getComputedStyle(box).visibility}`
          })
        expect(await shown()).toBe('1 visible')
        // Nothing loaded before the click
        await expect(section.locator('video')).toHaveCount(0)

        await play.click()
        const video = section.locator('video')
        await expect(video).toHaveAttribute('controls', '')
        await expect(video).toHaveAttribute(PLAYBACK_ATTR, 'playing')
        await expect(video).toBeFocused()
        await expect(section.getByRole('button')).toHaveCount(0)
        // From 1280 the heading over the player fades (opacity, then visibility); in the DOM still
        if (width === 1440) await expect.poll(shown).toBe('0 hidden')
        else expect(await shown()).toBe('1 visible')
        await expect(heading).toHaveCount(1)

        await video.dispatchEvent('ended')
        await expect(section.locator('video')).toHaveCount(0)
        await expect(play).toBeFocused()
        await expect.poll(shown).toBe('1 visible')

        // The keyboard: Enter on ▶
        await page.keyboard.press('Enter')
        await expect(section.locator('video')).toHaveAttribute(PLAYBACK_ATTR, 'playing')
        await expect(section.locator('video')).toBeFocused()
        expect(await layoutShifts(page), 'layout shifts: value, start, what moved').toEqual([])
        expect(errors).toEqual([])
        await page.unrouteAll({ behavior: 'ignoreErrors' })
      })
    }

    // The other sources on a draft in draft mode (the published page stays as is), put back after:
    // a RuTube link — the platform's player in the block; no source — the poster without ▶; no
    // poster — no section. Also proves the new sections read the draft (what Live Preview shows).
    test('draft: a RuTube link, no source, no poster', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      // No external network: the player page answers empty
      await page.route('https://rutube.ru/**', (route) =>
        route.fulfill({ status: 200, contentType: 'text/html', body: '' }),
      )
      const login = await page.request.post(`${BASE}/api/users/login`, {
        data: { email: e2eEditor.email, password: e2eEditor.password },
      })
      expect(login.ok()).toBe(true)
      const draft = await (
        await page.request.get(`${BASE}/api/globals/about?draft=true&depth=0`)
      ).json()
      const save = async (mission: unknown) => {
        const response = await page.request.post(`${BASE}/api/globals/about?draft=true`, {
          data: { ...draft, mission, _status: 'draft' },
        })
        expect(response.ok(), await response.text()).toBe(true)
      }
      const id = '1480655fcab995b927db77bdd9d83986'
      try {
        await save({ ...draft.mission, video: null, embedUrl: `https://rutube.ru/video/${id}/` })
        await page.goto(`${BASE}/preview?path=/about`)
        await hydrated(page)
        const section = presentationOf(page)
        await section
          .getByRole('button', { name: `Смотреть видео: ${about.mission.caption}` })
          .click()
        const frame = section.locator('iframe')
        await expect(frame).toHaveAttribute(
          'src',
          `https://rutube.ru/play/embed/${id}/?autoplay=true`,
        )
        await expect(frame).toHaveAttribute('title', about.mission.caption!)
        await expect(frame).toHaveAttribute(
          'sandbox',
          'allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox',
        )
        await expect(frame).toHaveAttribute(
          'allow',
          'autoplay; encrypted-media; fullscreen; picture-in-picture',
        )
        await expect(frame).toBeFocused()

        await save({ ...draft.mission, video: null, embedUrl: null })
        await page.reload()
        await hydrated(page)
        await expect(presentationOf(page).locator('img')).toHaveCount(1)
        await expect(presentationOf(page).getByRole('button')).toHaveCount(0)

        await save({ ...draft.mission, poster: null })
        await page.reload()
        await hydrated(page)
        await expect(page.locator('#about-hardware-title')).toBeVisible()
        await expect(presentationOf(page)).toHaveCount(0)
      } finally {
        await save(draft.mission)
        await page.request.get(`${BASE}/preview/exit?path=/about`, { maxRedirects: 0 })
      }
    })
  })

  // Hardware (about v2 §2.6): the background video mounts and plays once half of the block is in
  // view, pauses below that.
  test('hardware: the video plays only with half of the block in view', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await stubPlayback(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(URL)
    await hydrated(page)
    const section = hardwareOf(page)
    const block = section.locator('.rounded-media')
    await expect(section.locator('video')).toHaveCount(0)

    // A third of the block in view: still nothing
    const top = await block.evaluate((el) => el.getBoundingClientRect().top + window.scrollY)
    const height = (await block.boundingBox())!.height
    await page.evaluate(
      (y) => window.scrollTo({ top: y, behavior: 'instant' }),
      top - 844 + height / 3,
    )
    await page.waitForTimeout(300)
    await expect(section.locator('video')).toHaveCount(0)

    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top - 100)
    await expect(section.locator('video')).toHaveAttribute(PLAYBACK_ATTR, 'playing')
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
    await expect(section.locator('video')).toHaveAttribute(PLAYBACK_ATTR, 'paused')
    await page.unrouteAll({ behavior: 'ignoreErrors' })
  })

  // Exhibitions (about v2 §2.7): only the active card's video plays; desktop arrows by one card,
  // aria-disabled at the ends with the focus kept.
  test.describe('exhibitions', () => {
    test('1440: the active card plays; arrows by one card, disabled at the ends', async ({
      page,
    }) => {
      const errors = watchConsole(page)
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await stubPlayback(page)
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto(URL)
      await hydrated(page)
      const section = exhibitionsOf(page)
      await expect(section.locator('video')).toHaveCount(0)

      await section.scrollIntoViewIfNeeded()
      await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'instant' }))
      const first = slideOf(page, 0).locator('video')
      await expect(first).toHaveAttribute(PLAYBACK_ATTR, 'playing')
      await expect(section.locator('video')).toHaveCount(1)
      await first.evaluate((el) => ((el as HTMLElement & { e2eMark?: boolean }).e2eMark = true))

      const prev = section.getByRole('button', { name: 'Предыдущая выставка' })
      const next = section.getByRole('button', { name: 'Следующая выставка' })
      await expect(prev).toHaveAttribute('aria-disabled', 'true')
      await expect(next).not.toHaveAttribute('aria-disabled')

      // The keyboard: Enter on → to the end; the focus stays on →, Enter there does nothing
      await next.focus()
      await page.keyboard.press('Enter')
      await expect.poll(() => activeSlide(page)).toBe(1)
      await expect(first).toHaveAttribute(PLAYBACK_ATTR, 'paused')
      await expect(prev).not.toHaveAttribute('aria-disabled')
      await page.keyboard.press('Enter')
      await expect.poll(() => activeSlide(page)).toBe(2)
      await expect(slideOf(page, 2).locator('video')).toHaveAttribute(PLAYBACK_ATTR, 'playing')
      await expect(next).toHaveAttribute('aria-disabled', 'true')
      await expect(next).toBeFocused()
      await page.keyboard.press('Enter')
      await page.waitForTimeout(400)
      expect(await activeSlide(page)).toBe(2)
      expect(Math.abs(await offsetFromTarget(page, 2))).toBeLessThan(1)
      await expect(next).toBeFocused()

      // Back with the mouse: the first card resumes, the same element
      await prev.click()
      await expect.poll(() => activeSlide(page)).toBe(1)
      await expect(slideOf(page, 2).locator('video')).toHaveAttribute(PLAYBACK_ATTR, 'paused')
      await prev.click()
      await expect.poll(() => activeSlide(page)).toBe(0)
      await expect(first).toHaveAttribute(PLAYBACK_ATTR, 'playing')
      expect(
        await first.evaluate((el) => (el as HTMLElement & { e2eMark?: boolean }).e2eMark),
      ).toBe(true)
      await expect(prev).toHaveAttribute('aria-disabled', 'true')
      // At the start ← stays focusable and Enter does nothing
      await prev.focus()
      await page.keyboard.press('Enter')
      await page.waitForTimeout(400)
      expect(await activeSlide(page)).toBe(0)
      await expect(prev).toBeFocused()
      expect(errors).toEqual([])
      await page.unrouteAll({ behavior: 'ignoreErrors' })
    })

    // A turn of the device: the active card stays, the track moves to its new target. «Without
    // re-snap» — a browser that leaves the scroll position as it was (snapping off during resize).
    for (const [from, to, resnap] of [
      [390, 834, true],
      [834, 390, true],
      [390, 834, false],
      [834, 390, false],
    ] as const) {
      const how = resnap ? '' : ', without re-snap'
      test(`${from} → ${to}${how}: a resize keeps the third card`, async ({ page }) => {
        await page.setViewportSize({ width: from, height: HEIGHTS[from] })
        await page.goto(URL)
        await hydrated(page)
        const track = trackOf(page)
        await track.scrollIntoViewIfNeeded()
        await track.evaluate((el) => {
          const card = el.children[2] as HTMLElement
          el.scrollTo({
            left: card.offsetLeft - parseFloat(getComputedStyle(el).scrollPaddingLeft),
            behavior: 'instant',
          })
        })
        await expect.poll(() => activeSlide(page)).toBe(2)
        await track.evaluate((el) => {
          const w = window as Window & { activated?: number[] }
          w.activated = []
          new MutationObserver((records) => {
            for (const r of records) {
              const slide = r.target as HTMLElement
              if (slide.hasAttribute('data-active')) {
                w.activated!.push([...el.children].indexOf(slide))
              }
            }
          }).observe(el, { attributes: true, attributeFilter: ['data-active'], subtree: true })
        })
        if (!resnap) await track.evaluate((el) => el.style.setProperty('scroll-snap-type', 'none'))
        await page.setViewportSize({ width: to, height: HEIGHTS[to] })
        await expect.poll(async () => Math.abs(await offsetFromTarget(page, 2))).toBeLessThan(1)
        const left = await track.evaluate((el) => el.scrollLeft)
        await page.waitForTimeout(300)
        expect(await track.evaluate((el) => el.scrollLeft)).toBe(left)
        expect(
          await page.evaluate(() => (window as Window & { activated?: number[] }).activated),
          'no other card active on the way',
        ).toEqual([])
        expect(await activeSlide(page)).toBe(2)
        if (!resnap) {
          await track.evaluate((el) => el.style.removeProperty('scroll-snap-type'))
          await page.waitForTimeout(300)
          expect(Math.abs(await offsetFromTarget(page, 2))).toBeLessThan(1)
          expect(await activeSlide(page)).toBe(2)
        }
      })
    }

    // Swipes pick every card in turn both ways (check in the Linux Chromium of the Playwright image)
    test.describe('touch', () => {
      test.use({ hasTouch: true })
      for (const width of [390, 834] as const) {
        test(`${width}: swipes pick each exhibition in turn`, async ({ page }) => {
          await page.setViewportSize({ width, height: HEIGHTS[width] })
          await page.goto(URL)
          await hydrated(page)
          await trackOf(page).scrollIntoViewIfNeeded()
          const swipe = await swiper(page, { track: trackOf(page), slide: slideOf(page, 0) })
          const count = about.exhibitions!.items!.length
          for (let i = 1; i < count; i++) {
            await swipe(1)
            await expect.poll(() => activeSlide(page)).toBe(i)
            expect(Math.abs(await offsetFromTarget(page, i))).toBeLessThan(1)
          }
          for (let i = count - 2; i >= 0; i--) {
            await swipe(-1)
            await expect.poll(() => activeSlide(page)).toBe(i)
            expect(Math.abs(await offsetFromTarget(page, i))).toBeLessThan(1)
          }
        })
      }
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
  // No section without its content: neither the intro, history, presentation, hardware nor exhibitions
  await expect(page.locator('main section')).toHaveCount(0)
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1)
  expect(await axe(page)).toEqual([])
  expect(errors).toEqual([])
})
