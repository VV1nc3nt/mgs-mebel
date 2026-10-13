import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { globals } from '../../src/seed/data/globals'
import { CATALOGS_DRAFT_TITLE, catalogPdfFile, E2E_CATALOGS } from '../helpers/e2eCatalogs'
import { e2eEditor } from '../helpers/e2eEditor'
import { layoutShifts, settle, tallPage, wheel } from '../helpers/scroll'

// «Каталоги» (README §6.5): heading, sticky category bar with the counter, catalog cards.
const BASE = 'http://localhost:3000'
const URL = `${BASE}/catalogs`
const EMPTY_DB = !!process.env.E2E_EMPTY_DB
const HERO = globals(() => 0).catalogsPage.hero!
const HEIGHTS = { 390: 844, 834: 1194, 1440: 900 } as const
const COLUMNS = { 390: 1, 834: 2, 1440: 3 } as const
// Fixture: 1 kitchen, 2 wardrobe and 5 facade catalogs; no bathrooms, no tables
const SEGMENTS = ['все', 'кухни', 'гардеробные', 'фасады']
const COUNT = { all: 8, kitchens: 1, wardrobes: 2, facades: 5 } as const
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

const bar = (page: Page) => page.getByRole('group', { name: 'Категории каталогов' })
const segment = (page: Page, name: string) =>
  bar(page).getByRole('button', { name: new RegExp(`^${name}$`, 'i') })
const counter = (page: Page) => page.locator('main p[aria-live="polite"]')
const cards = (page: Page) => page.locator('main article')
const stickyBar = (page: Page) => page.locator('main .sticky-under-header')

/** Viewport geometry the scroll checks compare. */
const geometry = (page: Page) =>
  page.evaluate(() => {
    const root = document.documentElement
    const sticky = document.querySelector('main .sticky-under-header')!.getBoundingClientRect()
    const first = document.querySelector('main article')!.getBoundingClientRect()
    return {
      y: window.scrollY,
      pinned: root.hasAttribute('data-header-pinned'),
      headerH: Number(root.style.getPropertyValue('--header-h')),
      headerBottom: document.querySelector('.header-bar')!.getBoundingClientRect().bottom,
      barTop: sticky.top,
      barBottom: sticky.bottom,
      firstTop: first.top,
    }
  })

/**
 * The first card right under the bar: 14, less a fraction of a pixel when the bar's own place is
 * fractional (the scroll target is rounded so that the bar sticks to the header without a gap).
 */
const expectListUnderBar = (g: { firstTop: number; barBottom: number }) => {
  const gap = g.firstTop - g.barBottom
  expect(gap).toBeGreaterThan(LIST_GAP - 1)
  expect(gap).toBeLessThanOrEqual(LIST_GAP + 0.05)
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

/** Mouse click at the centre: the bar sits in the top 80 px, where a locator click scrolls. */
const clickAt = async (page: Page, name: string) => {
  const box = (await segment(page, name).boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

/** Waits for the header's slide and the bar's `top` transition (350 ms). */
const settled = (page: Page) => page.waitForTimeout(500)

test.describe('catalogs', () => {
  test.skip(EMPTY_DB, 'needs the catalogs fixture')

  for (const width of [390, 834, 1440] as const) {
    test(`${width}: heading, bar, grid — no violations, errors or shifts`, async ({ page }) => {
      await page.setViewportSize({ width, height: HEIGHTS[width] })
      const errors = watchConsole(page)
      const response = await page.goto(URL)
      expect(response?.status()).toBe(200)
      await hydrated(page)
      await settle(page)

      await expect(page.getByRole('heading', { level: 1 })).toHaveText(HERO.title!)
      await expect(page.locator('main').getByText(HERO.lead!)).toBeVisible()
      await expect(bar(page).getByRole('button')).toHaveCount(SEGMENTS.length)
      for (const name of SEGMENTS) await expect(segment(page, name)).toBeVisible()
      await expect(segment(page, 'все')).toHaveAttribute('aria-pressed', 'true')
      await expect(counter(page)).toHaveText('8 каталогов')
      await expect(cards(page)).toHaveCount(COUNT.all)
      // Columns: the distinct left edges of the cards
      const lefts = await cards(page).evaluateAll((els) =>
        [...new Set(els.map((el) => Math.round(el.getBoundingClientRect().left)))].length,
      )
      expect(lefts).toBe(COLUMNS[width])
      // The grid starts 14 below the bar
      const g = await geometry(page)
      expect(Math.round(g.firstTop - g.barBottom)).toBe(LIST_GAP)

      expect(await axe(page)).toEqual([])
      expect(await layoutShifts(page)).toEqual([])
      expect(errors).toEqual([])
    })
  }

  test('SEO: canonical without the filter, breadcrumbs', async ({ page }) => {
    await page.goto(`${URL}?category=wardrobes`)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/catalogs$/)
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents()
    const crumbs = ld.map((s) => JSON.parse(s)).find((d) => d['@type'] === 'BreadcrumbList')
    expect(crumbs.itemListElement.map((i: { name: string }) => i.name)).toEqual([
      'Главная',
      'Каталоги',
    ])
  })

  test('filter with the mouse: the counter, plural forms and the URL', async ({ page }) => {
    await page.goto(URL)
    await hydrated(page)
    const history = await page.evaluate(() => window.history.length)
    for (const [name, key, count] of [
      ['кухни', 'kitchens', '1 каталог'],
      ['гардеробные', 'wardrobes', '2 каталога'],
      ['фасады', 'facades', '5 каталогов'],
    ] as const) {
      await segment(page, name).click()
      await expect(segment(page, name)).toHaveAttribute('aria-pressed', 'true')
      await expect(counter(page)).toHaveText(count)
      await expect(cards(page)).toHaveCount(COUNT[key])
      expect(new globalThis.URL(page.url()).searchParams.get('category')).toBe(key)
    }
    await segment(page, 'все').click()
    await expect(cards(page)).toHaveCount(COUNT.all)
    await expect(page).toHaveURL(URL)
    // The history entry is replaced, not added
    expect(await page.evaluate(() => window.history.length)).toBe(history)
  })

  test('filter with the keyboard: Tab, Enter and Space', async ({ page }) => {
    await page.goto(URL)
    await hydrated(page)
    await segment(page, 'все').focus()
    await page.keyboard.press('Tab')
    await expect(segment(page, 'кухни')).toBeFocused()
    // Moving focus alone does not filter
    await expect(cards(page)).toHaveCount(COUNT.all)
    await page.keyboard.press('Enter')
    await expect(counter(page)).toHaveText('1 каталог')
    await page.keyboard.press('Tab')
    await expect(segment(page, 'гардеробные')).toBeFocused()
    await page.keyboard.press('Space')
    await expect(counter(page)).toHaveText('2 каталога')
    await expect(page).toHaveURL(`${URL}?category=wardrobes`)
  })

  test('a direct visit renders the filtered HTML; unknown and empty categories show all', async ({
    request,
  }) => {
    const html = async (query: string) => (await request.get(`${URL}${query}`)).text()
    const wardrobes = await html('?category=wardrobes')
    expect(wardrobes).not.toContain('BAILOUT_TO_CLIENT_SIDE_RENDERING')
    expect(wardrobes.match(/<article/g)).toHaveLength(COUNT.wardrobes)
    expect(wardrobes).toContain('>2 каталога<')
    expect(wardrobes).toContain('aria-pressed="true"')
    for (const query of ['', '?category=unknown', '?category=bathrooms']) {
      expect((await html(query)).match(/<article/g)).toHaveLength(COUNT.all)
    }
  })

  test('without JavaScript: only the chosen category in the markup', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto(`${URL}?category=facades`)
    await expect(cards(page)).toHaveCount(COUNT.facades)
    await expect(counter(page)).toHaveText('5 каталогов')
    await expect(page.getByRole('heading', { level: 3, name: 'Кухни 2026' })).toHaveCount(0)
    await page.goto(URL)
    await expect(cards(page)).toHaveCount(COUNT.all)
    await expect(counter(page)).toHaveText('8 каталогов')
    await context.close()
  })

  for (const width of [390, 1440] as const) {
    test(`${width}: the bar sticks under the smart header`, async ({ page }) => {
      await page.setViewportSize({ width, height: HEIGHTS[width] })
      await page.goto(URL)
      await hydrated(page)
      await tallPage(page)
      await settle(page)
      // Down: the header goes away, the bar at the top edge
      await wheel(page, 1400)
      await settled(page)
      let g = await geometry(page)
      expect(g.pinned).toBe(false)
      expect(g.barTop).toBeCloseTo(0, 1)
      // Up: the header is pinned, the bar right under it — no gap, no overlap
      await wheel(page, -200)
      await settled(page)
      g = await geometry(page)
      expect(g.pinned).toBe(true)
      expect(g.barTop).toBeCloseTo(g.headerH, 1)
      expect(g.barTop).toBeCloseTo(g.headerBottom, 1)
    })

    for (const start of ['header hidden', 'header pinned'] as const) {
      test(`${width}: a filter change with the bar stuck (${start}) → the list from its start`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: HEIGHTS[width] })
        await page.emulateMedia({ reducedMotion: 'no-preference' })
        await page.goto(URL)
        await hydrated(page)
        await tallPage(page)
        await settle(page)
        await wheel(page, 1600)
        if (start === 'header pinned') await wheel(page, -200)
        await settled(page)
        expect((await geometry(page)).pinned).toBe(start === 'header pinned')

        await armScrollEnd(page)
        await clickAt(page, 'фасады')
        await scrollEnded(page)
        await settled(page)
        await expect(counter(page)).toHaveText('5 каталогов')
        const g = await geometry(page)
        expect(g.pinned).toBe(true)
        expect(g.barTop).toBeCloseTo(g.headerBottom, 1)
        expectListUnderBar(g)
        expect(await layoutShifts(page)).toEqual([])
      })
    }

    test(`${width}: reduced motion — the jump to the list is instant`, async ({ page }) => {
      await page.setViewportSize({ width, height: HEIGHTS[width] })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto(URL)
      await hydrated(page)
      await tallPage(page)
      await settle(page)
      await wheel(page, 1600)
      await settled(page)
      await clickAt(page, 'гардеробные')
      await expect(counter(page)).toHaveText('2 каталога')
      // No smooth scroll: at the target within two frames
      await page.evaluate(
        () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
      )
      const y = await page.evaluate(() => window.scrollY)
      await settled(page)
      const g = await geometry(page)
      expect(g.y).toBe(y)
      expect(g.pinned).toBe(true)
      expect(g.barTop).toBeCloseTo(g.headerBottom, 1)
      expectListUnderBar(g)
    })
  }

  test('a filter change with the bar in its place keeps the position', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(URL)
    await hydrated(page)
    await settle(page)
    await page.mouse.wheel(0, 60)
    await page.waitForFunction(() => window.scrollY > 0)
    await settled(page)
    const before = await geometry(page)
    expect(before.barTop).toBeGreaterThan(before.headerH)
    await segment(page, 'кухни').click()
    await expect(counter(page)).toHaveText('1 каталог')
    await settled(page)
    expect((await geometry(page)).y).toBe(before.y)
  })

  test('390: a fade on the right while the bar scrolls further', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(URL)
    await hydrated(page)
    const fade = stickyBar(page).locator('[aria-hidden="true"].bg-linear-to-r')
    await expect(fade).toBeVisible()
    await bar(page).evaluate((el) => el.scrollTo({ left: el.scrollWidth }))
    await expect(fade).toHaveCount(0)
  })

  test('card links: the PDF in a new tab and the download', async ({ page, request }) => {
    await page.goto(URL)
    const first = E2E_CATALOGS[0]!
    const view = page.getByRole('link', { name: `Смотреть каталог „${first.title}“` })
    const download = page.getByRole('link', { name: `Скачать PDF „${first.title}“` })
    const href = `/api/media/file/${catalogPdfFile(0)}`
    await expect(view).toHaveAttribute('href', href)
    await expect(view).toHaveAttribute('target', '_blank')
    await expect(view).toHaveAttribute('rel', 'noopener noreferrer')
    await expect(download).toHaveAttribute('href', href)
    await expect(download).toHaveAttribute('download', '')
    await expect(download).not.toHaveAttribute('target')
    // Opens in the browser: a PDF, not an attachment
    const response = await request.get(`${BASE}${href}`)
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toBe('application/pdf')
    expect(response.headers()['content-disposition'] ?? '').not.toContain('attachment')

    const card = (title: string) => cards(page).filter({ hasText: title })
    await expect(card(first.title)).toContainText('96 страниц · PDF, 1 КБ')
    const noPages = E2E_CATALOGS.find((c) => !c.pages)!
    await expect(card(noPages.title).locator('p').last()).toHaveText('PDF, 1 КБ')
  })

  test('a render replaces the booklet mockup', async ({ page }) => {
    await page.goto(URL)
    for (const catalog of E2E_CATALOGS) {
      const card = cards(page).filter({ hasText: catalog.title })
      await expect(card.locator('.catalog-booklet')).toHaveCount(catalog.render ? 0 : 1)
      if (catalog.render) {
        await expect(card.getByRole('img', { name: 'Тестовый рендер каталога' })).toBeVisible()
      }
    }
  })

  // Live Preview reads the draft of the heading; visitors keep the published one. Put back after.
  test('draft mode: the heading draft', async ({ page, browser }) => {
    const login = await page.request.post(`${BASE}/api/users/login`, {
      data: { email: e2eEditor.email, password: e2eEditor.password },
    })
    expect(login.ok()).toBe(true)
    const draft = await (
      await page.request.get(`${BASE}/api/globals/catalogsPage?draft=true&depth=0`)
    ).json()
    const save = async (hero: unknown) => {
      const response = await page.request.post(`${BASE}/api/globals/catalogsPage?draft=true`, {
        data: { ...draft, hero, _status: 'draft' },
      })
      expect(response.ok(), await response.text()).toBe(true)
    }
    try {
      await save({ ...draft.hero, title: CATALOGS_DRAFT_TITLE })
      await page.goto(`${BASE}/preview?path=/catalogs`)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(CATALOGS_DRAFT_TITLE)
      const visitor = await browser.newPage()
      await visitor.goto(URL)
      await expect(visitor.getByRole('heading', { level: 1 })).toHaveText(HERO.title!)
      await visitor.close()
    } finally {
      await save(draft.hero)
      await page.request.get(`${BASE}/preview/exit?path=/catalogs`, { maxRedirects: 0 })
    }
  })
})

test('catalogs on an empty database: no bar, no cards @empty', async ({ page }) => {
  test.skip(!EMPTY_DB, 'empty database only')
  const errors = watchConsole(page)
  const response = await page.goto(URL)
  expect(response?.status()).toBe(200)
  await expect(bar(page)).toHaveCount(0)
  await expect(cards(page)).toHaveCount(0)
  expect(await axe(page)).toEqual([])
  expect(errors).toEqual([])
})
