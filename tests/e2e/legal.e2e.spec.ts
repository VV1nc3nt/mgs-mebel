import AxeBuilder from '@axe-core/playwright'
import { expect, test, type APIRequestContext, type Page } from '../helpers/test'

import { news } from '../../src/seed/data/news'
import { e2eEditor } from '../helpers/e2eEditor'
import { E2E_LEGAL, LEGAL_EXTERNAL_URL, LEGAL_TEXT } from '../helpers/e2eLegal'
import { layoutShifts, settle } from '../helpers/scroll'

const BASE = 'http://localhost:3000'
const EMPTY_DB = !!process.env.E2E_EMPTY_DB
const NOT_FOUND = 'Страница не найдена'
const NOT_FOUND_TITLE = `${NOT_FOUND} — MGS MEBEL`
const HEIGHTS = { 390: 844, 834: 1194, 1440: 900 } as const
const PRIVACY = E2E_LEGAL.privacy
// The published news the documents link to (seedHome: the second one of the seed)
const linked = news(() => 1)[1]!

const AGENTS = {
  browser:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  yandex: 'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)',
} as const

/** Fails the test on hydration mismatches and other console errors. */
const watchConsole = (page: Page) => {
  const errors: string[] = []
  page.on('console', (message) => {
    // The site has no favicon yet (branding comes later): its 404 is not a page error.
    if (message.location().url.endsWith('/favicon.ico')) return
    // Chrome logs the 404 status of the document itself: that status is what is tested here.
    if (message.location().url === page.url() && /status of 404/.test(message.text())) return
    if (message.type() === 'error' || /hydrat/i.test(message.text())) errors.push(message.text())
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

/** The site 404 inside the site layout: status, one h1, noindex. */
const expectSite404 = async (page: Page, path: string) => {
  const response = await page.goto(`${BASE}${path}`)
  expect(response?.status(), path).toBe(404)
  await expect(page).toHaveTitle(NOT_FOUND_TITLE)
  await expect(page.locator('h1')).toHaveCount(1)
  await expect(page.locator('h1')).toHaveText(NOT_FOUND)
  const robots = await page
    .locator('meta[name="robots"]')
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('content') ?? ''))
  expect(robots.length).toBeGreaterThan(0)
  for (const content of robots) expect(content).toContain('noindex')
}

/** The 404 document as served (no JS) to a browser and to Яндекс: status, one <title>, noindex. */
const expectServed404 = async (request: APIRequestContext, path: string) => {
  for (const [agent, ua] of Object.entries(AGENTS)) {
    const response = await request.get(`${BASE}${path}`, { headers: { 'user-agent': ua } })
    expect(response.status(), `${path} ${agent}`).toBe(404)
    const html = await response.text()
    expect(html.match(/<title>[^<]*<\/title>/g), `${path} ${agent}`).toEqual([
      `<title>${NOT_FOUND_TITLE}</title>`,
    ])
    const robots = html.match(/<meta name="robots" content="[^"]*"/g) ?? []
    expect(robots.length, `${path} ${agent}`).toBeGreaterThan(0)
    for (const tag of robots) expect(tag, `${path} ${agent}`).toContain('noindex')
  }
}

const login = async (page: Page) => {
  const response = await page.request.post(`${BASE}/api/users/login`, {
    data: { email: e2eEditor.email, password: e2eEditor.password },
  })
  expect(response.ok()).toBe(true)
}

/** JSON-LD blocks of the page by type. */
const jsonLd = async (page: Page) => {
  const blocks = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((nodes) => nodes.map((n) => JSON.parse(n.textContent ?? '{}')))
  return Object.fromEntries(blocks.map((block) => [block['@type'], block]))
}

const fontSize = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize))

test.describe('legal documents', () => {
  test.skip(EMPTY_DB, 'needs tests/helpers/seedHome.ts data')

  for (const width of [390, 834, 1440] as const) {
    test(`${width}: privacy — title, text, links; no violations, errors or shifts`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: HEIGHTS[width] })
      const errors = watchConsole(page)
      const response = await page.goto(`${BASE}${PRIVACY.path}`)
      expect(response?.status()).toBe(200)
      await hydrated(page)
      await settle(page)
      const article = page.locator('main article')

      await expect(page.locator('h1')).toHaveCount(1)
      await expect(article.locator('h1')).toHaveText(PRIVACY.title)
      await expect(article.locator('h2')).toHaveText([LEGAL_TEXT.h2])
      await expect(article.locator('h3')).toHaveText([LEGAL_TEXT.h3])
      // H3 is a step below H2 at every width
      expect(await fontSize(page, 'main article h3')).toBeLessThan(
        await fontSize(page, 'main article h2'),
      )
      await expect(article.locator('ul > li')).toHaveText([...LEGAL_TEXT.bullets])
      await expect(article.locator('ol > li')).toHaveText(
        LEGAL_TEXT.numbers.map((text, i) => `${i + 1}.${text}`),
      )
      await expect(article.locator('p').first()).toHaveText(LEGAL_TEXT.intro)

      // Links: another site in a new tab, a published news in the same tab, a draft — text only
      const external = article.getByRole('link', { name: LEGAL_TEXT.external })
      await expect(external).toHaveAttribute('href', LEGAL_EXTERNAL_URL)
      await expect(external).toHaveAttribute('target', '_blank')
      await expect(external).toHaveAttribute('rel', 'noopener noreferrer')
      const internal = article.getByRole('link', { name: LEGAL_TEXT.internal })
      await expect(internal).toHaveAttribute('href', `/news/${linked.slug}`)
      expect(await internal.getAttribute('target')).toBeNull()
      await expect(article.getByRole('link', { name: LEGAL_TEXT.hidden })).toHaveCount(0)
      await expect(article.getByText(LEGAL_TEXT.hidden)).toBeVisible()

      // A long word of the title («конфиденциальности» at 390) is hyphenated: no horizontal scroll
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
      ).toBeLessThanOrEqual(0)

      // The text column: 760 at most, inside the page container
      const column = await article.locator('p').first().boundingBox()
      expect(column!.width).toBeLessThanOrEqual(760)

      expect(await axe(page)).toEqual([])
      expect(await layoutShifts(page)).toEqual([])
      expect(errors).toEqual([])
    })
  }

  test('the offer: its own page', async ({ page }) => {
    const response = await page.goto(`${BASE}${E2E_LEGAL.offer.path}`)
    expect(response?.status()).toBe(200)
    await expect(page.locator('h1')).toHaveText(E2E_LEGAL.offer.title)
    await expect(page).toHaveTitle(`${E2E_LEGAL.offer.title} — MGS MEBEL`)
  })

  test('metadata: title, description from the text, canonical, BreadcrumbList', async ({
    page,
  }) => {
    await page.goto(`${BASE}${PRIVACY.path}`)
    await expect(page).toHaveTitle(`${PRIVACY.title} — MGS MEBEL`)
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toMatch(new RegExp(`^https?://[^/]+${PRIVACY.path}$`))
    const description = await page.locator('meta[name="description"]').getAttribute('content')
    expect(description!.length).toBeLessThanOrEqual(160)
    expect(description!.startsWith(LEGAL_TEXT.intro)).toBe(true)
    const robots = await page
      .locator('meta[name="robots"]')
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('content') ?? ''))
    for (const content of robots) expect(content).not.toContain('noindex')

    const data = await jsonLd(page)
    const origin = new URL(canonical!).origin
    expect(data.BreadcrumbList.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Главная', item: origin },
      { '@type': 'ListItem', position: 2, name: PRIVACY.title, item: canonical },
    ])
  })

  test('header «←» leads home; no section of the menu is active', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${BASE}${PRIVACY.path}`)
    const back = page.locator('header').getByRole('link', { name: 'На главную', exact: true })
    await expect(back).toBeVisible()
    await expect(back).toHaveAttribute('href', '/')
    await expect(page.locator('header [aria-current="page"]')).toHaveCount(0)
  })

  test('an empty document (cookies): the site 404', async ({ page, request }) => {
    const errors = watchConsole(page)
    await expectSite404(page, '/cookies')
    await expectServed404(request, '/cookies')
    expect(errors).toEqual([])
  })

  test('draft mode: an editor sees the draft, a visitor — the published document', async ({
    page,
  }) => {
    await login(page)
    const url = `${BASE}/api/globals/legalPrivacy`
    const published = await (await page.request.get(`${url}?draft=false&depth=0`)).json()
    const save = async (data: Record<string, unknown>, draft: boolean) => {
      const response = await page.request.post(`${url}${draft ? '?draft=true' : ''}`, { data })
      expect(response.ok(), await response.text()).toBe(true)
    }
    try {
      await save({ title: LEGAL_TEXT.draft }, true)
      await page.goto(`${BASE}/preview?path=${encodeURIComponent(PRIVACY.path)}`)
      await expect(page).toHaveURL(`${BASE}${PRIVACY.path}`)
      await expect(page.locator('h1')).toHaveText(LEGAL_TEXT.draft)
      await expect(page.getByText('Предпросмотр черновика')).toBeVisible()

      // A visitor (no session, no draft mode): the published version
      await page.context().clearCookies()
      await page.goto(`${BASE}${PRIVACY.path}`)
      await expect(page.locator('h1')).toHaveText(PRIVACY.title)
    } finally {
      await login(page)
      await save({ title: published.title, body: published.body, _status: 'published' }, false)
      await page.context().clearCookies()
    }
  })
})

test.describe('legal documents on an empty database @empty', () => {
  test.skip(!EMPTY_DB, 'runs against a fresh database (E2E_EMPTY_DB=1)')

  test('every document: the site 404 without errors', async ({ page, request }) => {
    const errors = watchConsole(page)
    for (const path of ['/privacy', '/cookies', '/offer']) {
      await expectSite404(page, path)
      await expectServed404(request, path)
    }
    expect(errors).toEqual([])
  })
})
