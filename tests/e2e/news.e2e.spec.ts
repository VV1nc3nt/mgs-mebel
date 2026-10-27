import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, newConsentContext } from '../helpers/test'

import { globals } from '../../src/seed/data/globals'
import { e2eEditor } from '../helpers/e2eEditor'
import { NEWS_DRAFT_TITLE } from '../helpers/e2eHome'
import { E2E_NEWS, NEWS_PAGE_DRAFT_TITLE, newsGate } from '../helpers/e2eNews'
import { layoutShifts, settle } from '../helpers/scroll'

// «Новости» (README §6.7): heading, tabs with counters, the news grid and «Показать ещё».
const BASE = 'http://localhost:3000'
const URL = `${BASE}/news`
const EMPTY_DB = !!process.env.E2E_EMPTY_DB
const { newsPage, layout } = globals(() => 0)
const HERO = newsPage.hero!
const HEIGHTS = { 390: 844, 834: 1194, 1440: 900 } as const
const COLUMNS = { 390: 1, 834: 2, 1440: 3 } as const
const PAGE = 6
// Fixture: 13 published news — 7 «Новость», 6 «Новинка»; one draft
const OF = {
  all: E2E_NEWS,
  news: E2E_NEWS.filter((n) => n.type === 'news'),
  new: E2E_NEWS.filter((n) => n.type === 'new'),
}
const TABS = [
  ['все', 'all'],
  ['новости', 'news'],
  ['новинки', 'new'],
] as const
const MORE = 'Показать ещё'
// The browser's own line about the 500 of a failed load: expected in the failure checks only
const FAILED_LOAD = /status of 500/

/** Fails the test on hydration mismatches and other console errors. */
const watchConsole = (page: Page, allow?: RegExp) => {
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.location().url.endsWith('/favicon.ico')) return
    if (allow?.test(m.text())) return
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

const tabsOf = (page: Page) => page.getByRole('group', { name: 'Тип новостей' })
const tab = (page: Page, name: string) =>
  tabsOf(page).getByRole('button', { name: new RegExp(`^${name} \\d+$`) })
const list = (page: Page) => page.locator('main ul[data-news-list]')
const cards = (page: Page) => list(page).locator('> li:not([data-skeleton])')
const skeletons = (page: Page) => list(page).locator('> li[data-skeleton]')
const more = (page: Page) => page.getByRole('button', { name: MORE })
/** Card titles in order; retried until the list settles (skeletons while a page loads). */
const expectTitles = (page: Page, expected: string[]) =>
  expect(cards(page).locator('h2')).toHaveText(expected)
const titlesOf = (items: readonly { title: string }[]) => items.map((n) => n.title)
/** Accessible name of the focused element (a card link: its title). */
const focusedLink = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement
    return el?.tagName === 'A' ? el.getAttribute('href') : (el?.tagName ?? null)
  })

test.describe('news', () => {
  test.skip(EMPTY_DB, 'needs the news fixture')

  for (const width of [390, 834, 1440] as const) {
    test(`${width}: heading, tabs, the first page — no violations, errors or shifts`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: HEIGHTS[width] })
      const errors = watchConsole(page)
      const response = await page.goto(URL)
      expect(response?.status()).toBe(200)
      await hydrated(page)
      await settle(page)

      await expect(page.getByRole('heading', { level: 1 })).toHaveText(HERO.title!)
      // Not a hero page: the header is in the flow
      await expect(page.locator('header')).not.toHaveAttribute('data-variant', 'hero')
      await expect(tabsOf(page).getByRole('button')).toHaveCount(TABS.length)
      for (const [label, key] of TABS) {
        await expect(tab(page, label)).toHaveAccessibleName(`${label} ${OF[key].length}`)
      }
      await expect(tab(page, 'все')).toHaveAttribute('aria-pressed', 'true')
      await expect(tab(page, 'новости')).toHaveAttribute('aria-pressed', 'false')

      await expect(cards(page)).toHaveCount(PAGE)
      // H1 → H2 card titles, no skipped level
      await expect(page.locator('main h2')).toHaveCount(PAGE)
      await expect(page.locator('main h3')).toHaveCount(0)
      await expectTitles(page, titlesOf(OF.all.slice(0, PAGE)))
      for (const [i, item] of OF.all.slice(0, PAGE).entries()) {
        const link = cards(page).nth(i).getByRole('link')
        await expect(link).toHaveAttribute('href', `/news/${item.slug}`)
        // The title names the whole card link
        await expect(link).toHaveAccessibleName(item.title)
        await expect(link).toContainText(item.type === 'new' ? 'Новинка' : 'Новость')
        await expect(link).toContainText('Читать')
      }
      // Only the first card's cover is the LCP candidate
      await expect(list(page).locator('img[fetchpriority="high"]')).toHaveCount(1)
      const lefts = await cards(page).evaluateAll(
        (els) => [...new Set(els.map((el) => Math.round(el.getBoundingClientRect().left)))].length,
      )
      expect(lefts).toBe(COLUMNS[width])
      const heights = await cards(page).evaluateAll((els) =>
        els.map((el) => Math.round(el.getBoundingClientRect().height)),
      )
      expect(new Set(heights)).toEqual(new Set([420]))
      await expect(more(page)).toBeVisible()
      // Mobile: the button is as wide as the grid; from tablet — by its content, centred
      const [button, grid, card] = await Promise.all([
        more(page).boundingBox(),
        list(page).boundingBox(),
        cards(page).first().boundingBox(),
      ])
      if (width === 390) expect(button!.width).toBeCloseTo(card!.width, 1)
      else expect(button!.x + button!.width / 2).toBeCloseTo(grid!.x + grid!.width / 2, 0)
      if (width === 1440) {
        await expect(page.locator('header nav [aria-current="page"]')).toHaveText(
          layout.nav!.news!.shortLabel!,
        )
      }

      expect(await layoutShifts(page), 'layout shifts: value, start, what moved').toEqual([])
      expect(await axe(page)).toEqual([])
      expect(errors).toEqual([])
    })
  }

  test('390: «Новости» is the active item of the menu', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(URL)
    await hydrated(page)
    await page.getByRole('button', { name: 'Открыть меню' }).click()
    const menu = page.getByRole('dialog', { name: 'Меню' })
    await expect(menu.locator('[aria-current="page"]')).toContainText(layout.nav!.news!.label)
  })

  test('«Показать ещё»: skeletons while loading, +6, the focus on the first new card, no button at the end', async ({
    page,
  }) => {
    const errors = watchConsole(page)
    const gate = await newsGate(page)
    await page.goto(URL)
    await hydrated(page)
    gate.hold()

    await more(page).click()
    await expect(skeletons(page)).toHaveCount(PAGE)
    await expect(list(page)).toHaveAttribute('aria-busy', 'true')
    await expect(cards(page)).toHaveCount(PAGE)
    // A second click while loading does nothing
    await more(page).click()
    expect(gate.held()).toBe(1)
    await gate.release('"page":2')
    await expect(cards(page)).toHaveCount(2 * PAGE)
    await expect(skeletons(page)).toHaveCount(0)
    await expect(list(page)).not.toHaveAttribute('aria-busy')
    await expectTitles(page, titlesOf(OF.all.slice(0, 2 * PAGE)))
    expect(await focusedLink(page)).toBe(`/news/${OF.all[PAGE]!.slug}`)

    // The last page: one card, one skeleton for it; then no button, the focus on that card
    await more(page).click()
    await expect(skeletons(page)).toHaveCount(OF.all.length - 2 * PAGE)
    await gate.release('"page":3')
    await expect(cards(page)).toHaveCount(OF.all.length)
    await expect(more(page)).toHaveCount(0)
    await expectTitles(page, titlesOf(OF.all))
    expect(await focusedLink(page)).toBe(`/news/${OF.all.at(-1)!.slug}`)
    // The draft is never in the list
    await expect(list(page).getByText(NEWS_DRAFT_TITLE)).toHaveCount(0)
    expect(errors).toEqual([])
  })

  test('a failed load keeps the button; a click retries', async ({ page }) => {
    const errors = watchConsole(page, FAILED_LOAD)
    const gate = await newsGate(page)
    await page.goto(URL)
    await hydrated(page)

    gate.fail(true)
    const failed = page.waitForResponse(
      (r) => r.request().method() === 'POST' && r.status() === 500,
    )
    await more(page).click()
    await failed
    await expect(skeletons(page)).toHaveCount(0)
    await expect(list(page)).not.toHaveAttribute('aria-busy')
    await expect(cards(page)).toHaveCount(PAGE)
    await expect(more(page)).toBeVisible()

    gate.fail(false)
    await more(page).click()
    await expect(cards(page)).toHaveCount(2 * PAGE)
    expect(await focusedLink(page)).toBe(`/news/${OF.all[PAGE]!.slug}`)
    expect(errors).toEqual([])
  })

  test('a failed first page of a tab: no skeletons left, the button loads it again', async ({
    page,
  }) => {
    const errors = watchConsole(page, FAILED_LOAD)
    const gate = await newsGate(page)
    await page.goto(URL)
    await hydrated(page)

    gate.fail(true)
    const failed = page.waitForResponse(
      (r) => r.request().method() === 'POST' && r.status() === 500,
    )
    await tab(page, 'новинки').click()
    await failed
    await expect(skeletons(page)).toHaveCount(0)
    await expect(cards(page)).toHaveCount(0)
    await expect(more(page)).toBeVisible()

    gate.fail(false)
    await more(page).click()
    await expect(cards(page)).toHaveCount(PAGE)
    await expectTitles(page, titlesOf(OF.new))
    // 6 new news: one page, no button
    await expect(more(page)).toHaveCount(0)
    expect(errors).toEqual([])
  })

  test('tabs with the mouse: the list, the counters and the URL; history does not grow', async ({
    page,
  }) => {
    await page.goto(URL)
    await hydrated(page)
    const history = await page.evaluate(() => window.history.length)
    for (const [label, key] of [TABS[1], TABS[2]]) {
      await tab(page, label).click()
      await expect(tab(page, label)).toHaveAttribute('aria-pressed', 'true')
      await expect(cards(page)).toHaveCount(Math.min(PAGE, OF[key].length))
      await expectTitles(page, titlesOf(OF[key].slice(0, PAGE)))
      expect(new globalThis.URL(page.url()).searchParams.get('type')).toBe(key)
      // The counters stay the same on every tab
      await expect(tab(page, 'все')).toHaveAccessibleName(`все ${OF.all.length}`)
    }
    // 7 news: a second page; 6 new: none
    await tab(page, 'новости').click()
    await expect(more(page)).toBeVisible()
    await tab(page, 'новинки').click()
    await expect(cards(page)).toHaveCount(PAGE)
    await expect(more(page)).toHaveCount(0)
    await tab(page, 'все').click()
    await expect(cards(page)).toHaveCount(PAGE)
    await expect(page).toHaveURL(URL)
    expect(await page.evaluate(() => window.history.length)).toBe(history)
  })

  test('tabs with the keyboard: Tab, Enter and Space', async ({ page }) => {
    await page.goto(URL)
    await hydrated(page)
    await tab(page, 'все').focus()
    await page.keyboard.press('Tab')
    await expect(tab(page, 'новости')).toBeFocused()
    // Moving focus alone does not filter
    await expect(page).toHaveURL(URL)
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(`${URL}?type=news`)
    await expectTitles(page, titlesOf(OF.news.slice(0, PAGE)))
    await page.keyboard.press('Tab')
    await expect(tab(page, 'новинки')).toBeFocused()
    await page.keyboard.press('Space')
    await expect(page).toHaveURL(`${URL}?type=new`)
    await expect(tab(page, 'новинки')).toHaveAttribute('aria-pressed', 'true')
    await expectTitles(page, titlesOf(OF.new))
  })

  test('another tab after «Показать ещё» starts the list over', async ({ page }) => {
    await page.goto(URL)
    await hydrated(page)
    await more(page).click()
    await expect(cards(page)).toHaveCount(2 * PAGE)
    await tab(page, 'новости').click()
    await expect(cards(page)).toHaveCount(PAGE)
    await expectTitles(page, titlesOf(OF.news.slice(0, PAGE)))
    await tab(page, 'все').click()
    await expect(cards(page)).toHaveCount(PAGE)
    await expectTitles(page, titlesOf(OF.all.slice(0, PAGE)))
  })

  test('two quick tab changes: the last one is shown, whatever answers first', async ({ page }) => {
    const gate = await newsGate(page)
    await page.goto(URL)
    await hydrated(page)
    gate.hold()
    await tab(page, 'новости').click()
    await tab(page, 'новинки').click()
    await expect.poll(() => gate.held()).toBe(2)
    await expect(skeletons(page)).toHaveCount(PAGE)
    // The newer request answers first, the older one after it: the older is dropped
    await gate.release('"new"')
    await expect(cards(page)).toHaveCount(PAGE)
    await gate.release('"news"')
    await page.waitForTimeout(300)
    await expectTitles(page, titlesOf(OF.new))
    await expect(page).toHaveURL(`${URL}?type=new`)
  })

  test('a tab change while «Показать ещё» loads: the late page of the old tab is dropped', async ({
    page,
  }) => {
    const gate = await newsGate(page)
    await page.goto(URL)
    await hydrated(page)
    gate.hold()
    await more(page).click()
    await expect.poll(() => gate.held('"page":2')).toBe(1)
    await tab(page, 'новинки').click()
    await expect.poll(() => gate.held('"new"')).toBe(1)
    await gate.release('"new"')
    await expect(cards(page)).toHaveCount(PAGE)
    await gate.release('"page":2')
    await page.waitForTimeout(300)
    await expect(cards(page)).toHaveCount(PAGE)
    await expectTitles(page, titlesOf(OF.new))
  })

  test('a direct visit renders the filtered HTML; unknown and empty types show all', async ({
    request,
  }) => {
    const html = async (query: string) => (await request.get(`${URL}${query}`)).text()
    const links = (doc: string) => doc.match(/href="\/news\/[^"]+"/g)?.map((m) => m.slice(6, -1))
    const newOnly = await html('?type=new')
    expect(newOnly).not.toContain('BAILOUT_TO_CLIENT_SIDE_RENDERING')
    expect(links(newOnly)).toEqual(OF.new.map((n) => `/news/${n.slug}`))
    expect(newOnly).not.toContain(`>${MORE}<`)
    const newsOnly = await html('?type=news')
    expect(links(newsOnly)).toEqual(OF.news.slice(0, PAGE).map((n) => `/news/${n.slug}`))
    expect(newsOnly).toContain(`>${MORE}<`)
    for (const query of ['', '?type=', '?type=unknown']) {
      expect(links(await html(query))).toEqual(OF.all.slice(0, PAGE).map((n) => `/news/${n.slug}`))
    }
  })

  test('without JavaScript: the chosen tab in the markup, the button rendered', async ({
    browser,
  }) => {
    const context = await newConsentContext(browser, { javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto(`${URL}?type=new`)
    await expect(cards(page)).toHaveCount(OF.new.length)
    await expect(tab(page, 'новинки')).toHaveAttribute('aria-pressed', 'true')
    await expectTitles(page, titlesOf(OF.new))
    await page.goto(URL)
    await expect(cards(page)).toHaveCount(PAGE)
    await expect(more(page)).toBeVisible()
    await context.close()
  })

  test('SEO: canonical without the tab, breadcrumbs, ItemList of every news item', async ({
    page,
  }) => {
    await page.goto(`${URL}?type=new`)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/news$/)
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).map(
      (s) => JSON.parse(s),
    )
    const crumbs = ld.find((d) => d['@type'] === 'BreadcrumbList')
    expect(crumbs.itemListElement.map((i: { name: string }) => i.name)).toEqual([
      'Главная',
      layout.nav!.news!.label,
    ])
    const items = ld.find((d) => d['@type'] === 'ItemList')
    expect(
      items.itemListElement.map((i: { position: number; name: string; url: string }) => [
        i.position,
        i.name,
        new globalThis.URL(i.url).pathname,
      ]),
    ).toEqual(OF.all.map((n, i) => [i + 1, n.title, `/news/${n.slug}`]))
  })

  // Live Preview reads the draft of the heading; the list stays published. Put back after.
  test('draft mode: the heading draft, no news drafts in the list', async ({ page, browser }) => {
    const login = await page.request.post(`${BASE}/api/users/login`, {
      data: { email: e2eEditor.email, password: e2eEditor.password },
    })
    expect(login.ok()).toBe(true)
    const draft = await (
      await page.request.get(`${BASE}/api/globals/newsPage?draft=true&depth=0`)
    ).json()
    const save = async (hero: unknown) => {
      const response = await page.request.post(`${BASE}/api/globals/newsPage?draft=true`, {
        data: { ...draft, hero, _status: 'draft' },
      })
      expect(response.ok(), await response.text()).toBe(true)
    }
    try {
      await save({ ...draft.hero, title: NEWS_PAGE_DRAFT_TITLE })
      await page.goto(`${BASE}/preview?path=/news`)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(NEWS_PAGE_DRAFT_TITLE)
      await expect(tab(page, 'все')).toHaveAccessibleName(`все ${OF.all.length}`)
      await expectTitles(page, titlesOf(OF.all.slice(0, PAGE)))
      await expect(page.getByText(NEWS_DRAFT_TITLE)).toHaveCount(0)
      const visitor = await browser.newPage()
      await visitor.goto(URL)
      await expect(visitor.getByRole('heading', { level: 1 })).toHaveText(HERO.title!)
      await visitor.close()
    } finally {
      await save(draft.hero)
      await page.request.get(`${BASE}/preview/exit?path=/news`, { maxRedirects: 0 })
    }
  })
})

test('news on an empty database: the heading only @empty', async ({ page }) => {
  test.skip(!EMPTY_DB, 'empty database only')
  const errors = watchConsole(page)
  const response = await page.goto(URL)
  expect(response?.status()).toBe(200)
  await expect(tabsOf(page)).toHaveCount(0)
  await expect(list(page)).toHaveCount(0)
  await expect(more(page)).toHaveCount(0)
  await expect(
    page.locator('script[type="application/ld+json"]', { hasText: 'ItemList' }),
  ).toHaveCount(0)
  expect(await axe(page)).toEqual([])
  expect(errors).toEqual([])
})
