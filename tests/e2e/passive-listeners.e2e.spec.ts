import { expect, test, type Page } from '@playwright/test'

import { blockingScroll, pageListeners } from '../helpers/listeners'

const BASE = 'http://localhost:3000'
const EMPTY_DB = !!process.env.E2E_EMPTY_DB

// Only the home hero scene and the open viewer listen to these on window (React's own listeners
// on document are passive)
const GESTURES = ['wheel', 'touchstart', 'touchmove', 'touchend']

const frames = (page: Page) =>
  page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))

/** Effects have run: the header measured itself, then two frames. */
const hydrated = async (page: Page) => {
  await page.waitForFunction(
    () => document.documentElement.style.getPropertyValue('--header-h') !== '',
  )
  await frames(page)
}

/** The hero scene listens once its section is hydrated. */
const homeHydrated = async (page: Page) => {
  await page.waitForFunction(() => {
    const hero = document.querySelector('section[data-hero]')
    return !!hero && Object.keys(hero).some((key) => key.startsWith('__reactFiber'))
  })
  await hydrated(page)
}

const gestures = async (page: Page) =>
  (await pageListeners(page)).window.filter((l) => GESTURES.includes(l.type))

const keydowns = async (page: Page) =>
  (await pageListeners(page)).window.filter((l) => l.type === 'keydown').length

const scrollTo = async (page: Page, top: number) => {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top)
  await frames(page)
}

/** A client-side transition by the header's link (no Playwright scrolling). */
const goWorks = async (page: Page) => {
  await page.locator('header a[href="/works"]').first().evaluate((a: HTMLElement) => a.click())
  await expect(page).toHaveURL(`${BASE}/works`)
  await page.locator('[data-works-feed]').waitFor()
  await frames(page)
}

test.describe('no scroll-blocking listeners', () => {
  test.skip(EMPTY_DB, 'needs the home hero scene of tests/helpers/seedHome.ts')
  test.use({ viewport: { width: 1440, height: 900 } })

  test('home: blocking at the very top only, passive below', async ({ page }) => {
    await page.goto(`${BASE}/`)
    await homeHydrated(page)
    expect(await blockingScroll(page)).toEqual(['window:wheel', 'window:touchmove'])

    await scrollTo(page, 600)
    expect(await blockingScroll(page)).toEqual([])
    // The scene still sees the gestures, passively
    expect((await gestures(page)).map((l) => l.type).sort()).toEqual([...GESTURES].sort())

    await scrollTo(page, 0)
    expect(await blockingScroll(page)).toEqual(['window:wheel', 'window:touchmove'])
  })

  for (const path of ['/works', '/about']) {
    test(`${path}: none`, async ({ page }) => {
      await page.goto(`${BASE}${path}`)
      await hydrated(page)
      expect(await gestures(page)).toEqual([])
    })
  }

  test('home → /works by a link: none of the scene listeners stay, at the top too', async ({
    page,
    context,
  }) => {
    await page.goto(`${BASE}/`)
    await homeHydrated(page)
    await goWorks(page)
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
    expect(await gestures(page)).toEqual([])

    // Its key listener is gone too: as many as on /works opened directly
    const direct = await context.newPage()
    await direct.goto(`${BASE}/works`)
    await hydrated(direct)
    expect(await keydowns(page)).toBe(await keydowns(direct))
  })

  test('home → /works → back: one set of the scene listeners, no duplicates', async ({ page }) => {
    await page.goto(`${BASE}/`)
    await homeHydrated(page)
    await goWorks(page)
    await page.goBack()
    await expect(page).toHaveURL(`${BASE}/`)
    await homeHydrated(page)
    await scrollTo(page, 0)
    expect(await blockingScroll(page)).toEqual(['window:wheel', 'window:touchmove'])
    expect((await gestures(page)).map((l) => l.type).sort()).toEqual([...GESTURES].sort())
  })

  test('/works: the viewer blocks while open only', async ({ page }) => {
    await page.goto(`${BASE}/works`)
    await hydrated(page)
    await page.locator('[data-works-feed] a').first().evaluate((a: HTMLElement) => a.click())
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    expect(await blockingScroll(page)).toEqual(['window:wheel', 'window:touchmove'])

    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await frames(page)
    expect(await gestures(page)).toEqual([])
  })
})
