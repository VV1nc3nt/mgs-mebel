import AxeBuilder from '@axe-core/playwright'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

import { formatDate } from '../../src/lib/date'
import { globals } from '../../src/seed/data/globals'
import { news } from '../../src/seed/data/news'
import { ARTICLE_TEXT, E2E_ARTICLE, EXTERNAL_URL } from '../helpers/e2eArticle'
import { e2eEditor } from '../helpers/e2eEditor'
import { NEWS_DRAFT_SLUG, NEWS_DRAFT_TITLE } from '../helpers/e2eHome'
import { layoutShifts, settle } from '../helpers/scroll'

const BASE = 'http://localhost:3000'
const EMPTY_DB = !!process.env.E2E_EMPTY_DB
const NOT_FOUND = 'Страница не найдена'
const NOT_FOUND_TITLE = `${NOT_FOUND} — MGS MEBEL`

// The newest published news of seedHome (the media ids do not matter here); the article links to
// the second one.
const published = news(() => 1)[0]!
const linked = news(() => 1)[1]!
const ARTICLE = `/news/${E2E_ARTICLE.slug}`
// The crumb and the breadcrumb list name the news section by its nav label
const NEWS_LABEL = globals(() => 0).layout.nav!.news!.label!

// User agents: a browser (metadata streams) and Яндекс — an HTML-limited bot (metadata blocks)
const AGENTS = {
  browser:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  yandex: 'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)',
} as const

// README §6.8: cover heights and radii; the text column
const COVER = {
  390: { height: 300, radius: 24 },
  834: { height: 460, radius: 28 },
  1440: { height: 640, radius: 32 },
} as const
const HEIGHTS = { 390: 844, 834: 1194, 1440: 900 } as const
const COLUMN = 760

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

/** The site 404 inside the site layout: status, landmarks, one h1, noindex. */
const expectSite404 = async (page: Page, path: string) => {
  const response = await page.goto(`${BASE}${path}`)
  expect(response?.status(), path).toBe(404)
  await expect(page).toHaveTitle(NOT_FOUND_TITLE)
  await expect(page.locator('header')).toHaveCount(1)
  await expect(page.locator('main#content')).toHaveCount(1)
  await expect(page.locator('footer')).toHaveCount(1)
  await expect(page.locator('h1')).toHaveCount(1)
  await expect(page.locator('h1')).toHaveText(NOT_FOUND)
  // Next adds its own noindex to a 404 next to the page's robots tag: every one must say noindex.
  const robots = await page
    .locator('meta[name="robots"]')
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('content') ?? ''))
  expect(robots.length).toBeGreaterThan(0)
  for (const content of robots) expect(content).toContain('noindex')
}

/**
 * The 404 document as served (no JS) to a browser and to Яндекс: status, one <title>, every robots
 * tag noindex. Its body is drawn by the client (Next 16 renders a notFound() of a page as the
 * error shell), so the markup is not checked here.
 */
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

/** Draft mode through the preview handler, as Live Preview opens a page. */
const preview = (page: Page, path: string) =>
  page.goto(`${BASE}/preview?path=${encodeURIComponent(path)}`)

/** JSON-LD blocks of the page by type. */
const jsonLd = async (page: Page) => {
  const blocks = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((nodes) => nodes.map((n) => JSON.parse(n.textContent ?? '{}')))
  return Object.fromEntries(blocks.map((block) => [block['@type'], block]))
}

test.describe('news page', () => {
  test.skip(EMPTY_DB, 'needs tests/helpers/seedHome.ts data')
  test.use({ viewport: { width: 390, height: 900 } })

  test('published news: 200, its title as the only h1, canonical', async ({ page }) => {
    const errors = watchConsole(page)
    const path = `/news/${published.slug}`
    const response = await page.goto(`${BASE}${path}`)
    expect(response?.status()).toBe(200)
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('h1')).toHaveText(published.title)
    await expect(page).toHaveTitle(`${published.title} — MGS MEBEL`)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      new RegExp(`^https?://[^/]+${path}$`),
    )
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article')
    await expect(page.locator('header')).toHaveAttribute('data-variant', 'flow')
    await expect(page.getByRole('link', { name: 'Назад к новостям' })).toHaveAttribute(
      'href',
      '/news',
    )
    // The lead under the title
    await expect(page.locator('main article p').first()).toHaveText(published.lead!)
    expect(errors).toEqual([])
  })

  for (const width of [390, 834, 1440] as const) {
    test(`${width}: article — head, cover, blocks; no violations, errors or shifts`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: HEIGHTS[width] })
      const errors = watchConsole(page)
      const response = await page.goto(`${BASE}${ARTICLE}`)
      expect(response?.status()).toBe(200)
      await hydrated(page)
      await settle(page)
      const main = page.locator('main')

      // Crumbs: Главная / news section, no current page; each link takes its own centre
      const crumbs = main.getByRole('navigation', { name: 'Навигационная цепочка' })
      const links = crumbs.getByRole('link')
      await expect(links).toHaveText(['Главная', NEWS_LABEL])
      await expect(links.nth(0)).toHaveAttribute('href', '/')
      await expect(links.nth(1)).toHaveAttribute('href', '/news')
      for (const link of await links.all()) {
        const own = await link.evaluate((el) => {
          const box = el.getBoundingClientRect()
          const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
          return hit === el || el.contains(hit)
        })
        expect(own).toBe(true)
      }

      // Tag, date, reading time; the only h1; no lead
      const chips = main.locator('article ul').first().locator('li')
      await expect(chips).toHaveText(['Новость', formatDate(E2E_ARTICLE.date), '1 мин чтения'])
      await expect(chips.nth(1).locator('time')).toHaveAttribute('datetime', E2E_ARTICLE.date)
      await expect(page.locator('h1')).toHaveCount(1)
      await expect(page.locator('h1')).toHaveText(E2E_ARTICLE.title)
      await expect(page.locator('h1 + p')).toHaveCount(0)

      // The cover: README heights and radii, the LCP image
      const cover = await page.evaluate(() => {
        const block = document.getElementById('first-screen-end')!.previousElementSibling!
          .firstElementChild as HTMLElement
        const img = block.querySelector('img')!
        return {
          height: block.getBoundingClientRect().height,
          radius: getComputedStyle(block).borderTopLeftRadius,
          priority: img.getAttribute('fetchpriority'),
          lazy: img.getAttribute('loading'),
        }
      })
      expect(cover.height).toBeCloseTo(COVER[width].height, 1)
      expect(cover.radius).toBe(`${COVER[width].radius}px`)
      expect(cover.priority).toBe('high')
      expect(cover.lazy).toBeNull()

      // Text blocks in the 760 column (narrower screens: the container)
      const intro = main.locator('p', { hasText: ARTICLE_TEXT.intro })
      const container = await intro.evaluate((el) => {
        const parent = el.parentElement!
        const style = getComputedStyle(parent)
        return parent.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
      })
      const introBox = (await intro.boundingBox())!
      expect(introBox.width).toBeCloseTo(Math.min(COLUMN, container), 1)
      await expect(main.locator('h2')).toHaveText([ARTICLE_TEXT.heading])
      await expect(main.locator('article ul').last().locator('li')).toHaveText([
        ...ARTICLE_TEXT.list,
      ])
      await expect(main.locator('blockquote')).toHaveText([
        ARTICLE_TEXT.quote,
        ARTICLE_TEXT.quoteNoAuthor,
      ])
      await expect(main.locator('figcaption')).toHaveText([
        ARTICLE_TEXT.quoteAuthor,
        ARTICLE_TEXT.caption,
      ])
      await expect(main.getByText(ARTICLE_TEXT.outro)).toBeVisible()
      // The empty paragraph renders nothing: two paragraphs of text in all
      await expect(main.locator('article p')).toHaveCount(2)

      // One photo — the column, 3:2; the wide one — the container, 16:9; both lazy
      const photos = main.locator('figure:has(img)')
      await expect(photos).toHaveCount(2)
      const [single, wide] = await photos.evaluateAll((figures) =>
        figures.map((figure) => {
          const box = figure.querySelector('img')!.parentElement!.getBoundingClientRect()
          return {
            width: box.width,
            ratio: box.width / box.height,
            lazy: figure.querySelector('img')!.getAttribute('loading'),
          }
        }),
      )
      expect(single!.width).toBeCloseTo(Math.min(COLUMN, container), 1)
      expect(single!.ratio).toBeCloseTo(3 / 2, 1)
      expect(wide!.width).toBeCloseTo(container, 1)
      expect(wide!.ratio).toBeCloseTo(16 / 9, 1)
      expect([single!.lazy, wide!.lazy]).toEqual(['lazy', 'lazy'])

      // Links of the text
      const internal = main.getByRole('link', { name: ARTICLE_TEXT.internal })
      await expect(internal).toHaveAttribute('href', `/news/${linked.slug}`)
      expect(await internal.getAttribute('target')).toBeNull()
      const external = main.getByRole('link', { name: ARTICLE_TEXT.external })
      await expect(external).toHaveAttribute('href', EXTERNAL_URL)
      await expect(external).toHaveAttribute('target', '_blank')
      await expect(external).toHaveAttribute('rel', 'noopener noreferrer')

      // The slider of photos and the video come with their own blocks: nothing of them yet
      await expect(main.getByText(ARTICLE_TEXT.galleryCaption)).toHaveCount(0)
      await expect(main.getByText(ARTICLE_TEXT.videoCaption)).toHaveCount(0)
      await expect(main.locator('video, iframe')).toHaveCount(0)

      expect(await axe(page)).toEqual([])
      expect(await layoutShifts(page)).toEqual([])
      expect(errors).toEqual([])
    })
  }

  test('metadata and structured data: NewsArticle, BreadcrumbList, canonical, og', async ({
    page,
  }) => {
    await page.goto(`${BASE}${ARTICLE}`)
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toMatch(new RegExp(`^https?://[^/]+${ARTICLE}$`))
    await expect(page).toHaveTitle(`${E2E_ARTICLE.title} — MGS MEBEL`)
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article')
    await expect(page.locator('meta[property="article:published_time"]')).toHaveAttribute(
      'content',
      E2E_ARTICLE.date,
    )
    await expect(page.locator('meta[property="article:modified_time"]')).toHaveCount(1)

    const data = await jsonLd(page)
    const origin = new URL(canonical!).origin
    expect(data.NewsArticle).toMatchObject({
      headline: E2E_ARTICLE.title,
      datePublished: E2E_ARTICLE.date,
      dateModified: expect.any(String),
      author: { '@type': 'Organization', name: 'MGS MEBEL' },
      publisher: { '@type': 'Organization', name: 'MGS MEBEL' },
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    })
    // No lead — no description; the cover as an absolute URL
    expect(data.NewsArticle).not.toHaveProperty('description')
    expect(data.NewsArticle.image).toEqual([expect.stringMatching(new RegExp(`^${origin}/`))])
    expect(data.BreadcrumbList.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Главная', item: origin },
      { '@type': 'ListItem', position: 2, name: NEWS_LABEL, item: `${origin}/news` },
      { '@type': 'ListItem', position: 3, name: E2E_ARTICLE.title, item: canonical },
    ])
    expect(data.Organization).toBeTruthy()
  })

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false })

    test('the whole article is in the HTML', async ({ page }) => {
      await page.goto(`${BASE}${ARTICLE}`)
      const main = page.locator('main')
      await expect(page.locator('h1')).toHaveText(E2E_ARTICLE.title)
      await expect(main.getByRole('navigation', { name: 'Навигационная цепочка' })).toBeVisible()
      await expect(main.locator('h2')).toHaveText([ARTICLE_TEXT.heading])
      await expect(main.locator('blockquote')).toHaveCount(2)
      await expect(main.locator('figure:has(img)')).toHaveCount(2)
      await expect(main.getByRole('link', { name: ARTICLE_TEXT.internal })).toBeVisible()
      await expect(main.getByText(ARTICLE_TEXT.outro)).toBeVisible()
    })
  })

  test('unknown slug: the site 404', async ({ page }) => {
    const errors = watchConsole(page)
    await expectSite404(page, '/news/nesushchestvuet')
    expect(errors).toEqual([])
  })

  test('unpublished news: 404', async ({ page }) => {
    const errors = watchConsole(page)
    await expectSite404(page, `/news/${NEWS_DRAFT_SLUG}`)
    expect(errors).toEqual([])
  })

  test('unknown project: the site 404', async ({ page }) => {
    const errors = watchConsole(page)
    await expectSite404(page, '/works/nesushchestvuet')
    await expectSite404(page, '/works/Bad_Slug')
    expect(errors).toEqual([])
  })

  test('404 as served to a browser and to Яндекс: status, one title, noindex', async ({
    request,
  }) => {
    for (const path of [
      '/news/nesushchestvuet',
      `/news/${NEWS_DRAFT_SLUG}`,
      '/works/nesushchestvuet',
      '/works/Bad_Slug',
    ]) {
      await expectServed404(request, path)
    }
  })

  test('draft mode: an editor sees a never published news', async ({ page }) => {
    await login(page)
    const path = `/news/${NEWS_DRAFT_SLUG}`
    const response = await preview(page, path)
    await expect(page).toHaveURL(`${BASE}${path}`)
    expect(response?.status()).toBe(200)
    await expect(page.locator('h1')).toHaveText(NEWS_DRAFT_TITLE)
    await expect(page.getByText('Предпросмотр черновика')).toBeVisible()
  })

  test('draft mode: an editor sees the draft of a published news, a visitor — the published', async ({
    page,
  }) => {
    await login(page)
    const { docs } = await (
      await page.request.get(`${BASE}/api/news?where[slug][equals]=${E2E_ARTICLE.slug}&depth=0`)
    ).json()
    const id = (docs[0] as { id: number }).id
    const marker = `${E2E_ARTICLE.title} (черновик)`
    const save = async (data: Record<string, unknown>, draft: boolean) => {
      const response = await page.request.patch(
        `${BASE}/api/news/${id}${draft ? '?draft=true' : ''}`,
        { data },
      )
      expect(response.ok(), await response.text()).toBe(true)
    }
    try {
      await save({ title: marker }, true)
      await preview(page, ARTICLE)
      await expect(page).toHaveURL(`${BASE}${ARTICLE}`)
      await expect(page.locator('h1')).toHaveText(marker)

      // The session ends, the draft mode cookie stays: the published version
      const cookies = (await page.context().cookies()).filter((c) => c.name !== 'payload-token')
      await page.context().clearCookies()
      await page.context().addCookies(cookies)
      expect(cookies.some((c) => c.name === '__prerender_bypass')).toBe(true)
      await page.goto(`${BASE}${ARTICLE}`)
      await expect(page.locator('h1')).toHaveText(E2E_ARTICLE.title)
      const response = await page.goto(`${BASE}/news/${NEWS_DRAFT_SLUG}`)
      expect(response?.status()).toBe(404)
    } finally {
      await login(page)
      await save({ title: E2E_ARTICLE.title, _status: 'published' }, false)
      await page.context().clearCookies()
    }
  })
})

test.describe('news page on an empty database @empty', () => {
  test.skip(!EMPTY_DB, 'runs against a fresh database (E2E_EMPTY_DB=1)')

  test('any slug: the site 404 without errors', async ({ page }) => {
    const errors = watchConsole(page)
    await expectSite404(page, '/news/nesushchestvuet')
    expect(errors).toEqual([])
  })

  test('404 as served to a browser and to Яндекс', async ({ request }) => {
    await expectServed404(request, '/news/nesushchestvuet')
    await expectServed404(request, '/works/nesushchestvuet')
  })
})
