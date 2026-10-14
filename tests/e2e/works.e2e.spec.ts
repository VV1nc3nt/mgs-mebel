import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { globals } from '../../src/seed/data/globals'
import { e2eEditor } from '../helpers/e2eEditor'
import { actionGate, E2E_WORKS, WORKS_DRAFT_TITLE } from '../helpers/e2eWorks'
import { layoutShifts, settle, tallPage, wheel } from '../helpers/scroll'

// «Наши работы» (README §6.4): heading, sticky filter bar with the counter, infinite grid of works.
const BASE = 'http://localhost:3000'
const URL = `${BASE}/works`
const EMPTY_DB = !!process.env.E2E_EMPTY_DB
const HERO = globals(() => 0).worksPage.hero!
const HEIGHTS = { 390: 844, 834: 1194, 1440: 900 } as const
const COLUMNS = { 390: 3, 834: 4, 1440: 6 } as const
const PAGE = 12
// Fixture = the seed projects: 30 in all, 12 «комплекс», 3 in every other category, 20 with a video
const CHIPS = [
  'все',
  'reels',
  'комплекс',
  'кухни',
  'прихожие',
  'спальни',
  'санузлы',
  'гардеробные',
  'гостиные',
]
const ALL = E2E_WORKS.length
const ofCategory = (category: string) => E2E_WORKS.filter((w) => w.category === category)
const REELS = E2E_WORKS.filter((w) => w.video)
// Cards follow the bar after the grid's top padding (design: 14)
const LIST_GAP = 14

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

/** The header island has measured itself: the page is hydrated. */
const hydrated = (page: Page) =>
  page.waitForFunction(() => document.documentElement.style.getPropertyValue('--header-h') !== '')

const bar = (page: Page) => page.getByRole('group', { name: 'Категории работ' })
const chip = (page: Page, name: string) =>
  bar(page).getByRole('button', { name: new RegExp(`^${name}$`, 'i') })
const counter = (page: Page) => page.locator('main p[aria-live="polite"]')
const list = (page: Page) => page.locator('main ul').last()
const cards = (page: Page) => list(page).locator('> li:not([data-skeleton])')
const skeletons = (page: Page) => list(page).locator('> li[data-skeleton]:visible')
const theEnd = (page: Page) => page.getByText('Вы посмотрели все работы')
const titles = (page: Page) => cards(page).locator('h2').allTextContents()

/** Scrolls to the end of the page (instant): the grid's end comes into the preload zone. */
const toBottom = (page: Page) =>
  page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight }))

/** Viewport geometry the scroll checks compare. */
const geometry = (page: Page) =>
  page.evaluate(() => {
    const root = document.documentElement
    const sticky = document.querySelector('main .sticky-under-header')!.getBoundingClientRect()
    const first = document.querySelector('main ul:last-of-type > li')!.getBoundingClientRect()
    return {
      pinned: root.hasAttribute('data-header-pinned'),
      headerBottom: document.querySelector('.header-bar')!.getBoundingClientRect().bottom,
      barTop: sticky.top,
      barBottom: sticky.bottom,
      firstTop: first.top,
    }
  })

/** Mouse click at the centre: the bar sits in the top 80 px, where a locator click scrolls. */
const clickAt = async (page: Page, name: string) => {
  const box = (await chip(page, name).boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

/** Resolves on the next `scrollend` (or after 2 s if nothing scrolls). */
const armScrollEnd = (page: Page) =>
  page.evaluate(() => {
    const w = window as Window & { filterScrollEnd?: Promise<void> }
    w.filterScrollEnd = new Promise((resolve) => {
      window.addEventListener('scrollend', () => resolve(), { once: true })
      setTimeout(resolve, 2000)
    })
  })
const scrollEnded = (page: Page) =>
  page.evaluate(() => (window as Window & { filterScrollEnd?: Promise<void> }).filterScrollEnd)

test.describe('works', () => {
  test.skip(EMPTY_DB, 'needs the projects fixture')

  for (const width of [390, 834, 1440] as const) {
    test(`${width}: heading, bar, the first page — no violations, errors or shifts`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: HEIGHTS[width] })
      const errors = watchConsole(page)
      // The first page only: on a tall screen the next one would start loading at once
      const gate = await actionGate(page)
      gate.hold()
      const response = await page.goto(URL)
      expect(response?.status()).toBe(200)
      await hydrated(page)
      await settle(page)

      await expect(page.getByRole('heading', { level: 1 })).toHaveText(HERO.title!)
      await expect(bar(page).getByRole('button')).toHaveCount(CHIPS.length)
      for (const name of CHIPS) await expect(chip(page, name)).toBeAttached()
      await expect(chip(page, 'все')).toHaveAttribute('aria-pressed', 'true')
      await expect(counter(page)).toHaveText(`${ALL} работ`)
      await expect(cards(page)).toHaveCount(PAGE)
      // H1 → H2 card titles, no skipped level
      await expect(page.locator('main h2')).toHaveCount(PAGE)
      await expect(page.locator('main h3')).toHaveCount(0)
      expect(await titles(page)).toEqual(E2E_WORKS.slice(0, PAGE).map((w) => w.title))
      // Every card links to its project page; ▶ for a video project, the carousel for photos
      for (const [i, work] of E2E_WORKS.slice(0, PAGE).entries()) {
        const card = cards(page).nth(i)
        await expect(card.getByRole('link')).toHaveAttribute('href', `/works/${work.slug}`)
        await expect(card.locator('.sr-only')).toHaveText(work.video ? 'Видео' : 'Фото')
      }
      // Columns: the distinct left edges of the cards
      const lefts = await cards(page).evaluateAll(
        (els) => [...new Set(els.map((el) => Math.round(el.getBoundingClientRect().left)))].length,
      )
      expect(lefts).toBe(COLUMNS[width])
      const g = await geometry(page)
      expect(Math.round(g.firstTop - g.barBottom)).toBe(LIST_GAP)
      await expect(theEnd(page)).toHaveCount(0)

      expect(await axe(page)).toEqual([])
      expect(await layoutShifts(page)).toEqual([])
      expect(errors).toEqual([])
      await gate.free()
    })
  }

  test('active nav item and breadcrumbs, canonical without the filter', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${URL}?category=kitchens`)
    await expect(
      page.locator('header').getByRole('link', { name: 'Наши работы', exact: true }),
    ).toHaveAttribute('aria-current', 'page')
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/works$/)
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents()
    const crumbs = ld.map((s) => JSON.parse(s)).find((d) => d['@type'] === 'BreadcrumbList')
    expect(crumbs.itemListElement.map((i: { name: string }) => i.name)).toEqual([
      'Главная',
      'Наши работы',
    ])
  })

  test('390: scrolling loads the next pages with a row of skeletons, then the end', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const errors = watchConsole(page)
    const gate = await actionGate(page)
    gate.hold()
    await page.goto(URL)
    await hydrated(page)
    await expect(cards(page)).toHaveCount(PAGE)

    for (const shown of [2 * PAGE, ALL]) {
      await toBottom(page)
      // A row of skeletons (3 columns) while the page loads
      await expect.poll(() => gate.held()).toBe(1)
      await expect(skeletons(page)).toHaveCount(COLUMNS[390])
      await expect(list(page)).toHaveAttribute('aria-busy', 'true')
      await expect(theEnd(page)).toHaveCount(0)
      await gate.release()
      await expect(cards(page)).toHaveCount(shown)
      await expect(skeletons(page)).toHaveCount(0)
      await expect(list(page)).not.toHaveAttribute('aria-busy')
    }
    expect(await titles(page)).toEqual(E2E_WORKS.map((w) => w.title))
    await expect(theEnd(page)).toBeVisible()
    // The end: no more requests
    await toBottom(page)
    await page.waitForTimeout(500)
    expect(gate.count()).toBe(2)
    expect(errors).toEqual([])
  })

  test('a tall screen keeps loading until it is full, without a scroll', async ({ page }) => {
    // 30 works at 6 columns = 5 rows; the end comes into the preload zone after every page
    await page.setViewportSize({ width: 1440, height: 2560 })
    await page.goto(URL)
    await expect(cards(page)).toHaveCount(ALL)
    await expect(theEnd(page)).toBeVisible()
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
  })

  test('filter with the mouse: the counter, plural forms, the URL and the first page', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(URL)
    await hydrated(page)
    const history = await page.evaluate(() => window.history.length)
    for (const [name, key, count, works] of [
      ['комплекс', 'complex', '12 работ · комплекс', ofCategory('complex')],
      ['кухни', 'kitchens', '3 работы · кухни', ofCategory('kitchens')],
      ['reels', 'reels', '20 работ · reels', REELS],
    ] as const) {
      await chip(page, name).click()
      await expect(chip(page, name)).toHaveAttribute('aria-pressed', 'true')
      await expect(counter(page)).toHaveText(count)
      await expect(cards(page)).toHaveCount(Math.min(PAGE, works.length))
      expect(await titles(page)).toEqual(works.slice(0, PAGE).map((w) => w.title))
      expect(new globalThis.URL(page.url()).searchParams.get('category')).toBe(key)
    }
    await chip(page, 'все').click()
    await expect(counter(page)).toHaveText(`${ALL} работ`)
    await expect(page).toHaveURL(URL)
    // The history entry is replaced, not added
    expect(await page.evaluate(() => window.history.length)).toBe(history)
  })

  test('filter with the keyboard: Tab, Enter and Space', async ({ page }) => {
    await page.goto(URL)
    await hydrated(page)
    await chip(page, 'все').focus()
    await page.keyboard.press('Tab')
    await expect(chip(page, 'reels')).toBeFocused()
    // Moving focus alone does not filter
    await expect(counter(page)).toHaveText(`${ALL} работ`)
    await page.keyboard.press('Enter')
    await expect(counter(page)).toHaveText('20 работ · reels')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await expect(chip(page, 'кухни')).toBeFocused()
    await page.keyboard.press('Space')
    await expect(counter(page)).toHaveText('3 работы · кухни')
    await expect(cards(page)).toHaveCount(3)
    await expect(page).toHaveURL(`${URL}?category=kitchens`)
  })

  test('a filter change: a page of skeletons in place of the list, then its first page', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const gate = await actionGate(page)
    await page.goto(URL)
    await hydrated(page)
    await toBottom(page)
    await expect(cards(page)).toHaveCount(2 * PAGE)

    gate.hold()
    await chip(page, 'комплекс').click()
    await expect.poll(() => gate.held()).toBe(1)
    await expect(cards(page)).toHaveCount(0)
    await expect(list(page).locator('> li[data-skeleton]')).toHaveCount(PAGE)
    await expect(list(page)).toHaveAttribute('aria-busy', 'true')
    await gate.release()
    await expect(cards(page)).toHaveCount(PAGE)
    expect(await titles(page)).toEqual(ofCategory('complex').map((w) => w.title))
    await gate.free()
  })

  test('two quick filter changes: the last one wins whatever answers first', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const gate = await actionGate(page)
    await page.goto(URL)
    await hydrated(page)
    gate.hold()
    await chip(page, 'кухни').click()
    await chip(page, 'спальни').click()
    await expect.poll(() => gate.held()).toBe(2)
    // The latest answers first, the stale one after it
    await gate.release('"bedrooms"')
    await expect(cards(page)).toHaveCount(3)
    await gate.release('"kitchens"')
    await page.waitForTimeout(500)
    await expect(counter(page)).toHaveText('3 работы · спальни')
    expect(await titles(page)).toEqual(ofCategory('bedrooms').map((w) => w.title))
    await expect(cards(page).locator('p').first()).toHaveText(/спальни/i)
    await gate.free()
  })

  for (const width of [390, 1440] as const) {
    test(`${width}: a filter change with the bar stuck → the list from its start`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: HEIGHTS[width] })
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      // No next pages: the list under the bar is the first one
      const gate = await actionGate(page)
      gate.hold()
      await page.goto(URL)
      await hydrated(page)
      await tallPage(page)
      await settle(page)
      // The bar sticks inside the feed only: down into the first page, the list still under it
      await wheel(page, 600)
      await page.waitForTimeout(500)
      const before = await geometry(page)
      expect(before.pinned).toBe(false)
      expect(before.barTop).toBeCloseTo(0, 1)

      await armScrollEnd(page)
      await clickAt(page, 'кухни')
      await gate.release('"kitchens"')
      await scrollEnded(page)
      await page.waitForTimeout(500)
      await expect(counter(page)).toHaveText('3 работы · кухни')
      await expect(cards(page)).toHaveCount(3)
      const g = await geometry(page)
      expect(g.pinned).toBe(true)
      expect(g.barTop).toBeCloseTo(g.headerBottom, 1)
      const gap = g.firstTop - g.barBottom
      expect(gap).toBeGreaterThan(LIST_GAP - 1)
      expect(gap).toBeLessThanOrEqual(LIST_GAP + 0.05)
      await gate.free()
    })
  }

  test('a direct visit renders the filtered first page; no request before a scroll', async ({
    page,
    request,
  }) => {
    const html = await (await request.get(`${URL}?category=kitchens`)).text()
    expect(html).not.toContain('BAILOUT_TO_CLIENT_SIDE_RENDERING')
    expect(html.match(/<h2/g)).toHaveLength(3)
    expect(html).toContain('>3 работы · кухни<')
    expect(html).toContain('Вы посмотрели все работы')
    for (const query of ['', '?category=unknown', '?category=']) {
      const all = await (await request.get(`${URL}${query}`)).text()
      expect(all.match(/<h2/g)).toHaveLength(PAGE)
      expect(all).toContain(`>${ALL} работ<`)
    }

    const gate = await actionGate(page)
    await page.goto(`${URL}?category=kitchens`)
    await hydrated(page)
    await settle(page)
    await page.waitForTimeout(1000)
    await expect(cards(page)).toHaveCount(3)
    expect(gate.count()).toBe(0)
  })

  test('without JavaScript: the chosen category in the markup', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto(`${URL}?category=hallways`)
    await expect(cards(page)).toHaveCount(3)
    await expect(counter(page)).toHaveText('3 работы · прихожие')
    expect(await titles(page)).toEqual(ofCategory('hallways').map((w) => w.title))
    await page.goto(URL)
    await expect(cards(page)).toHaveCount(PAGE)
    await expect(counter(page)).toHaveText(`${ALL} работ`)
    await context.close()
  })

  // Live Preview reads the draft of the heading; visitors keep the published one. Put back after.
  test('draft mode: the heading draft', async ({ page, browser }) => {
    const login = await page.request.post(`${BASE}/api/users/login`, {
      data: { email: e2eEditor.email, password: e2eEditor.password },
    })
    expect(login.ok()).toBe(true)
    const draft = await (
      await page.request.get(`${BASE}/api/globals/worksPage?draft=true&depth=0`)
    ).json()
    const save = async (hero: unknown) => {
      const response = await page.request.post(`${BASE}/api/globals/worksPage?draft=true`, {
        data: { ...draft, hero, _status: 'draft' },
      })
      expect(response.ok(), await response.text()).toBe(true)
    }
    try {
      await save({ ...draft.hero, title: WORKS_DRAFT_TITLE })
      await page.goto(`${BASE}/preview?path=/works`)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(WORKS_DRAFT_TITLE)
      const visitor = await browser.newPage()
      await visitor.goto(URL)
      await expect(visitor.getByRole('heading', { level: 1 })).toHaveText(HERO.title!)
      await visitor.close()
    } finally {
      await save(draft.hero)
      await page.request.get(`${BASE}/preview/exit?path=/works`, { maxRedirects: 0 })
    }
  })
})

test('works on an empty database: no bar, no cards @empty', async ({ page }) => {
  test.skip(!EMPTY_DB, 'empty database only')
  const errors = watchConsole(page)
  const response = await page.goto(URL)
  expect(response?.status()).toBe(200)
  await expect(bar(page)).toHaveCount(0)
  await expect(page.locator('main li')).toHaveCount(0)
  await expect(theEnd(page)).toHaveCount(0)
  expect(await axe(page)).toEqual([])
  expect(errors).toEqual([])
})
