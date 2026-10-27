import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, newConsentContext } from '../helpers/test'

import { globals } from '../../src/seed/data/globals'
import { CATALOGS_DRAFT_TITLE, catalogPdfFile, E2E_CATALOGS } from '../helpers/e2eCatalogs'
import { e2eEditor } from '../helpers/e2eEditor'
import { countActions, recordWave, waveStates } from '../helpers/feeds'
import { layoutShifts, settle } from '../helpers/scroll'

// «Каталоги» (README §6.5): heading with the counter, category chips, catalog cards.
const BASE = 'http://localhost:3000'
const URL = `${BASE}/catalogs`
const EMPTY_DB = !!process.env.E2E_EMPTY_DB
const HERO = globals(() => 0).catalogsPage.hero!
const HEIGHTS = { 390: 844, 834: 1194, 1440: 900 } as const
const COLUMNS = { 390: 1, 834: 2, 1440: 3 } as const
// Fixture: 1 kitchen, 2 wardrobe and 5 facade catalogs; no bathrooms, no tables
const SEGMENTS = ['все', 'кухни', 'гардеробные', 'фасады']
const COUNT = { all: 8, kitchens: 1, wardrobes: 2, facades: 5 } as const
// Cards follow the chips after the row's bottom padding (as on the works page)
const LIST_GAP = 20

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

const chips = (page: Page) => page.getByRole('group', { name: 'Категории каталогов' })
const segment = (page: Page, name: string) =>
  chips(page).getByRole('button', { name: new RegExp(`^${name} \\d+$`, 'i') })
const counter = (page: Page) => page.locator('main p[aria-live="polite"]')
const GRID = 'main [data-catalogs-grid]'
const cards = (page: Page) => page.locator('main article')

test.describe('catalogs', () => {
  test.skip(EMPTY_DB, 'needs the catalogs fixture')

  for (const width of [390, 834, 1440] as const) {
    test(`${width}: heading, chips, grid — no violations, errors or shifts`, async ({ page }) => {
      await page.setViewportSize({ width, height: HEIGHTS[width] })
      const errors = watchConsole(page)
      const response = await page.goto(URL)
      expect(response?.status()).toBe(200)
      await hydrated(page)
      await settle(page)

      await expect(page.getByRole('heading', { level: 1 })).toHaveText(HERO.title!)
      await expect(page.locator('main').getByText(HERO.lead!)).toBeVisible()
      await expect(chips(page).getByRole('button')).toHaveCount(SEGMENTS.length)
      for (const name of SEGMENTS) await expect(segment(page, name)).toBeVisible()
      for (const [name, key] of [
        ['все', 'all'],
        ['кухни', 'kitchens'],
        ['гардеробные', 'wardrobes'],
        ['фасады', 'facades'],
      ] as const) {
        await expect(segment(page, name)).toHaveAccessibleName(
          new RegExp(`^${name} ${COUNT[key]}$`, 'i'),
        )
        // Capitalised in the CMS, lowercase on the site
        await expect(segment(page, name)).toHaveCSS('text-transform', 'lowercase')
        expect(Math.round((await segment(page, name).boundingBox())!.height)).toBe(44)
      }
      await expect(segment(page, 'все')).toHaveAttribute('aria-pressed', 'true')
      await expect(counter(page)).toHaveText('8 каталогов')
      await expect(cards(page)).toHaveCount(COUNT.all)
      // H1 → H2 card titles, no skipped level
      await expect(page.locator('main h2')).toHaveCount(COUNT.all)
      await expect(page.locator('main h3')).toHaveCount(0)
      // Columns: the distinct left edges of the cards
      const lefts = await cards(page).evaluateAll(
        (els) => [...new Set(els.map((el) => Math.round(el.getBoundingClientRect().left)))].length,
      )
      expect(lefts).toBe(COLUMNS[width])
      // The grid starts 20 below the chips; the counter is next to (under, on mobile) the H1
      const [chip, card] = await Promise.all([
        segment(page, 'все').boundingBox(),
        cards(page).first().boundingBox(),
      ])
      expect(Math.round(card!.y - chip!.y - chip!.height)).toBe(LIST_GAP)
      await expect(page.locator('main h1 + p[aria-live]')).toHaveText('8 каталогов')

      expect(await axe(page)).toEqual([])
      expect(await layoutShifts(page)).toEqual([])
      expect(errors).toEqual([])
      await page.screenshot({ path: `test-results/catalogs/page-${width}.png` })
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
    const context = await newConsentContext(browser, { javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto(`${URL}?category=facades`)
    await expect(cards(page)).toHaveCount(COUNT.facades)
    await expect(counter(page)).toHaveText('5 каталогов')
    await expect(page.getByRole('heading', { level: 2, name: 'Кухни 2026' })).toHaveCount(0)
    await page.goto(URL)
    await expect(cards(page)).toHaveCount(COUNT.all)
    await expect(counter(page)).toHaveText('8 каталогов')
    await context.close()
  })

  test('a filter change keeps the position, makes no request, shifts nothing', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(URL)
    await hydrated(page)
    await settle(page)
    const actions = countActions(page)
    const navigations: string[] = []
    page.on('request', (r) => {
      if (r.headers()['rsc'] && !r.headers()['next-router-prefetch']) navigations.push(r.url())
    })
    await page.mouse.wheel(0, 120)
    await page.waitForFunction(() => window.scrollY > 0)
    await page.waitForTimeout(300)
    const y = await page.evaluate(() => window.scrollY)
    await segment(page, 'кухни').click()
    await expect(counter(page)).toHaveText('1 каталог')
    await expect(cards(page)).toHaveCount(COUNT.kitchens)
    await page.waitForTimeout(300)
    expect(await page.evaluate(() => window.scrollY)).toBe(y)
    expect(actions.count()).toBe(0)
    expect(navigations).toEqual([])
    expect(await layoutShifts(page)).toEqual([])
  })

  test('the wave: the old cards fade out, the new ones in the viewport rise', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto(URL)
    await hydrated(page)
    await recordWave(page, GRID)
    await segment(page, 'фасады').click()
    await expect(cards(page)).toHaveCount(COUNT.facades)
    await expect(page.locator(`${GRID} > [data-wave="wait"]`)).toHaveCount(0)
    const states = await waveStates(page)
    expect(states).toContain('list:out')
    expect(states).toContain('wait')
    expect(states).toContain('in')
    await expect
      .poll(() =>
        cards(page).evaluateAll((els) => els.every((el) => getComputedStyle(el).opacity === '1')),
      )
      .toBe(true)
  })

  test('reduced motion: the new cards show at once, no wave', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(URL)
    await hydrated(page)
    await recordWave(page, GRID)
    await segment(page, 'гардеробные').click()
    await expect(cards(page)).toHaveCount(COUNT.wardrobes)
    expect(await waveStates(page)).toEqual([])
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

test('catalogs on an empty database: no chips, no cards @empty', async ({ page }) => {
  test.skip(!EMPTY_DB, 'empty database only')
  const errors = watchConsole(page)
  const response = await page.goto(URL)
  expect(response?.status()).toBe(200)
  await expect(chips(page)).toHaveCount(0)
  await expect(cards(page)).toHaveCount(0)
  expect(await axe(page)).toEqual([])
  expect(errors).toEqual([])
})
