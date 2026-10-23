import AxeBuilder from '@axe-core/playwright'
import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test'

import { plural } from '../../src/lib/plural'
import { e2eEditor } from '../helpers/e2eEditor'
import { E2E_NEWS } from '../helpers/e2eNews'
import { e2eProject, type E2EProject } from '../helpers/e2eWorks'
import { layoutShifts, settle } from '../helpers/scroll'

// The page of a project of «Наши работы» (works v2 §3): heading, zones, gallery, «О проекте»,
// CTA, the view of the whole project, the answers of its address.
const BASE = 'http://localhost:3000'
const EMPTY_DB = !!process.env.E2E_EMPTY_DB
const HEIGHTS = { 390: 844, 834: 1194, 1440: 900 } as const
const WARM = e2eProject('kvartira-v-teplykh-tonakh')
const REELS = e2eProject('kvartira-s-rolikami')
const PLAIN = e2eProject('prikhozhaya-na-arbate')
const HIDDEN = e2eProject('skrytaya-kvartira')
const EMPTY = e2eProject('pustoy-kompleks')
const TYPE_LABELS: Record<string, string> = {
  kitchens: 'Кухня',
  livingrooms: 'Гостиная',
  bathrooms: 'Санузел',
  hallways: 'Прихожая',
  wardrobes: 'Гардеробная',
  bedrooms: 'Спальня',
  kids: 'Детская',
}

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

const hydrated = (page: Page) =>
  page.waitForFunction(() => document.documentElement.style.getPropertyValue('--header-h') !== '')

/** Visible items of a project of the fixture: their zone titles and frame counts, in order. */
const zonesOf = (project: E2EProject) =>
  project.items
    .filter((item) => !item.hidden)
    .map((item) => ({
      title: item.title ?? TYPE_LABELS[item.type]!,
      count: item.photos.length + (item.videos ?? 0),
    }))

/** Id of a project of the fixture (public read). */
const projectId = async (request: APIRequestContext, slug: string) => {
  const projects = await (
    await request.get(`${BASE}/api/projects?where[slug][equals]=${slug}&depth=0&limit=1`)
  ).json()
  return (projects.docs[0] as { id: number }).id
}

/** Ids of the visible items of a project, in the editor's order (public read). */
const itemIds = async (request: APIRequestContext, slug: string) => {
  const id = await projectId(request, slug)
  const items = await (
    await request.get(
      `${BASE}/api/items?where[project][equals]=${id}&where[hidden][equals]=false&sort=_order&depth=0&limit=50`,
    )
  ).json()
  return (items.docs as { id: number }[]).map((doc) => doc.id)
}

const dialog = (page: Page) => page.getByRole('dialog')
const grid = (page: Page) => page.locator('main ul[data-works-grid]')
const tile = (page: Page, n: number) => grid(page).locator(':scope > li').nth(n)
const zoneChips = (page: Page) =>
  page.locator('main ul:has(> li > a[href*="item="]):not([data-works-grid])')
const about = (page: Page) => page.getByRole('region', { name: 'О проекте' })
const cta = (page: Page) => page.getByRole('region', { name: 'Хотите так же?' })
const counter = (page: Page) => dialog(page).locator('[data-view-counter]:visible')
const panelTitle = (page: Page) => dialog(page).locator('[data-view-panel] h2')
/** «← Все работы» over the H1 (the header «←» of mobile has the same name). */
const backLink = (page: Page) =>
  page.locator('main').getByRole('link', { name: 'Все работы', exact: true })
const box = async (locator: Locator) => (await locator.boundingBox())!

test.describe('works: project page', () => {
  test.skip(EMPTY_DB, 'needs the works fixture')

  for (const width of [390, 834, 1440] as const) {
    test(`${width}: heading, zones, gallery, «О проекте» and the CTA in place`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: HEIGHTS[width] })
      const errors = watchConsole(page)
      const response = await page.goto(`${BASE}/works/${WARM.slug}`)
      expect(response?.status()).toBe(200)
      await hydrated(page)
      await settle(page)

      await expect(page.getByRole('heading', { level: 1 })).toHaveText(WARM.title)
      await expect(backLink(page)).toHaveAttribute('href', '/works')
      const zones = zonesOf(WARM)
      const photos = WARM.items.reduce((n, item) => n + item.photos.length, 0)
      const videos = (WARM.videos ?? 0) + WARM.items.reduce((n, item) => n + (item.videos ?? 0), 0)
      await expect(page.locator('main h1 + ul > li')).toHaveText([
        `${zones.length} ${plural(zones.length, ['зона', 'зоны', 'зон'])}`,
        `${photos} фото + ${videos} видео`,
        `${WARM.place}, ${WARM.city}, ${WARM.year}`,
      ])

      // Chips: the zones in the editor's order with their frame counts
      const chips = zoneChips(page).getByRole('link')
      await expect(chips).toHaveCount(zones.length)
      for (const [i, zone] of zones.entries()) {
        await expect(chips.nth(i)).toHaveAccessibleName(`${zone.title} ${zone.count}`)
      }

      // Gallery: the project video first, then the frames item after item, each with its zone
      const frames = zones.flatMap((zone) => Array.from({ length: zone.count }, () => zone.title))
      await expect(grid(page).locator(':scope > li')).toHaveCount(frames.length + 1)
      await expect(tile(page, 0)).toContainText('REELS')
      await expect(tile(page, 0).getByRole('link')).toHaveCount(0)
      for (const [i, zone] of frames.entries()) await expect(tile(page, i + 1)).toContainText(zone)
      // A frame tile is named by its photo's alt (the badges are hidden from it)
      await expect(tile(page, 1).getByRole('link')).toHaveAccessibleName('Тестовое изображение')

      // «О проекте»: over the gallery from 768, under it below; the CTA under both, no overlap
      await expect(about(page)).toContainText('Стоимость проекта')
      await expect(about(page)).toContainText('Цена актуальна на')
      await expect(about(page)).toContainText(WARM.designer!)
      const [a, g, c] = [await box(about(page)), await box(grid(page)), await box(cta(page))]
      if (width < 768) expect(a.y).toBeGreaterThanOrEqual(g.y + g.height)
      else expect(a.y + a.height).toBeLessThanOrEqual(g.y)
      expect(c.y).toBeGreaterThanOrEqual(Math.max(a.y + a.height, g.y + g.height))
      await expect(cta(page).getByRole('heading', { level: 2 })).toHaveText('Хотите так же?')
      await expect(cta(page)).toContainText('Рассчитаем под ваши размеры и пришлём смету.')
      await expect(cta(page).getByRole('button', { name: /Оставить заявку/ })).toBeVisible()

      expect(await layoutShifts(page)).toEqual([])
      expect(await axe(page)).toEqual([])
      expect(errors).toEqual([])
    })
  }

  test('the project videos stand at 0, 6, 12 of the frames, the rest at the end; no «О проекте»', async ({
    page,
  }) => {
    await page.goto(`${BASE}/works/${REELS.slug}`)
    const frames = zonesOf(REELS).reduce((n, zone) => n + zone.count, 0)
    const items = grid(page).locator(':scope > li')
    await expect(items).toHaveCount(frames + REELS.videos!)
    const reels = await items.evaluateAll((els) =>
      els.flatMap((el, i) => (el.textContent?.includes('REELS') ? [i] : [])),
    )
    // 0 frames before the first, 6 before the second, 12 before the third, the fourth last
    expect(reels).toEqual([0, 7, 14, frames + REELS.videos! - 1])
    await expect(about(page)).toHaveCount(0)
    await expect(page.locator('main h1 + ul > li').last()).toHaveText(REELS.place)
    await expect(cta(page)).toBeVisible()
  })

  for (const width of [390, 1440] as const) {
    test(`${width}: a tile and a chip open the view at their frame; «Весь проект →» and «Назад» close it`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: HEIGHTS[width] })
      const errors = watchConsole(page)
      const [kitchen, hallway] = await itemIds(page.request, WARM.slug)
      const zones = zonesOf(WARM)
      await page.goto(`${BASE}/works/${WARM.slug}`)
      await hydrated(page)
      await settle(page)
      const length = await page.evaluate(() => history.length)

      // The third frame of the kitchen (tile 3: the video is tile 0)
      const link = tile(page, 3).getByRole('link')
      await link.click()
      await expect(dialog(page)).toBeVisible()
      await expect(page).toHaveURL(`${BASE}/works/${WARM.slug}?item=${kitchen}&photo=3`)
      expect(await page.evaluate(() => history.length)).toBe(length + 1)
      await expect(counter(page)).toHaveText(`3 / ${zones[0]!.count}`)
      await expect(panelTitle(page)).toHaveText(zones[0]!.title)

      // «Весь проект →» is a button here: it closes the view, the focus back on the tile
      const whole = dialog(page).getByRole('button', { name: /Весь проект/ })
      await whole.scrollIntoViewIfNeeded()
      await whole.click()
      await expect(dialog(page)).toHaveCount(0)
      await expect(page).toHaveURL(`${BASE}/works/${WARM.slug}`)
      await expect(link).toBeFocused()

      // A chip: the first frame of its zone; «Назад» of the browser closes
      await zoneChips(page).getByRole('link').nth(1).click()
      await expect(dialog(page)).toBeVisible()
      await expect(page).toHaveURL(`${BASE}/works/${WARM.slug}?item=${hallway}`)
      await expect(counter(page)).toHaveText(`1 / ${zones[1]!.count}`)
      await expect(panelTitle(page)).toHaveText(zones[1]!.title)
      await page.goBack()
      await expect(dialog(page)).toHaveCount(0)
      await expect(page).toHaveURL(`${BASE}/works/${WARM.slug}`)
      expect(errors).toEqual([])
    })
  }

  test('1440: the strip goes through the whole project, the panel changes at the item border', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    const [kitchen, hallway] = await itemIds(page.request, WARM.slug)
    const zones = zonesOf(WARM)
    await page.goto(`${BASE}/works/${WARM.slug}?item=${kitchen}&photo=${zones[0]!.count}`)
    await hydrated(page)
    await expect(counter(page)).toHaveText(`${zones[0]!.count} / ${zones[0]!.count}`)
    await expect(panelTitle(page)).toHaveText(zones[0]!.title)

    await dialog(page).getByRole('button', { name: 'Следующее фото' }).click()
    await expect(counter(page)).toHaveText(`1 / ${zones[1]!.count}`)
    await expect(panelTitle(page)).toHaveText(zones[1]!.title)
    await expect(page).toHaveURL(`${BASE}/works/${WARM.slug}?item=${hallway}`)
    await page.waitForTimeout(700)
    await dialog(page).getByRole('button', { name: 'Предыдущее фото' }).click()
    await expect(panelTitle(page)).toHaveText(zones[0]!.title)
    await expect(page).toHaveURL(
      `${BASE}/works/${WARM.slug}?item=${kitchen}&photo=${zones[0]!.count}`,
    )
    // × of a direct visit: the page itself, without a new entry
    await dialog(page).getByRole('link', { name: 'Закрыть' }).click()
    await expect(dialog(page)).toHaveCount(0)
    await expect(page).toHaveURL(`${BASE}/works/${WARM.slug}`)
  })

  test('a direct link renders the view on the server; canonical is the project page', async ({
    request,
  }) => {
    const [kitchen] = await itemIds(request, WARM.slug)
    const [foreign] = await itemIds(request, REELS.slug)
    const html = await (
      await request.get(`${BASE}/works/${WARM.slug}?item=${kitchen}&photo=2`)
    ).text()
    expect(html).toContain('role="dialog"')
    expect(html).toContain(`2 / ${zonesOf(WARM)[0]!.count}`)
    expect(html).toContain(`<link rel="canonical" href="${BASE}/works/${WARM.slug}"/>`)
    // Without script × leads to the page
    const close = html.match(/<a[^>]*aria-label="Закрыть"[^>]*>/)?.[0]
    expect(close).toContain(`href="/works/${WARM.slug}"`)
    // An item of another project: the page without the view
    const other = await (await request.get(`${BASE}/works/${WARM.slug}?item=${foreign}`)).text()
    expect(other).not.toContain('role="dialog"')
    expect(other).toContain(`<h1`)
  })

  test('JSON-LD: the crumbs of the page, the projects on /works', async ({ request }) => {
    const html = await (await request.get(`${BASE}/works/${WARM.slug}`)).text()
    expect(html).toContain('"@type":"BreadcrumbList"')
    expect(html).toContain(`"name":"${WARM.title}","item":"${BASE}/works/${WARM.slug}"`)
    const works = await (await request.get(`${BASE}/works?category=kitchens`)).text()
    expect(works).toContain('"@type":"ItemList"')
    expect(works).toContain(`"url":"${BASE}/works/${REELS.slug}"`)
    expect(works).not.toContain(`/works/${PLAIN.slug}`)
  })

  test('a project that is not complex answers 308 to its first visible item; hidden, empty, made up — 404', async ({
    request,
  }) => {
    const [first] = await itemIds(request, PLAIN.slug)
    const response = await request.get(`${BASE}/works/${PLAIN.slug}`, { maxRedirects: 0 })
    expect(response.status()).toBe(308)
    expect(response.headers()['location']).toBe(`/works?category=hallways&item=${first}`)
    for (const slug of [HIDDEN.slug, EMPTY.slug, 'nesushchestvuet', 'Bad_Slug']) {
      const answer = await request.get(`${BASE}/works/${slug}`, { maxRedirects: 0 })
      expect(answer.status(), slug).toBe(404)
    }
  })

  test('«← Все работы» from the feed goes back to it and its scroll', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${BASE}/works`)
    await hydrated(page)
    await settle(page)
    const link = page.locator(`main a[href="/works/${REELS.slug}"]`)
    await page.evaluate(() => window.scrollTo({ top: 250, behavior: 'instant' }))
    await expect(link).toBeInViewport()
    const y = await page.evaluate(() => window.scrollY)
    expect(y).toBeGreaterThan(0)
    const length = await page.evaluate(() => history.length)
    await link.click()
    await expect(page).toHaveURL(`${BASE}/works/${REELS.slug}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(REELS.title)

    await backLink(page).click()
    await expect(page).toHaveURL(`${BASE}/works`)
    // Back in history, not a new entry; the feed where it was
    expect(await page.evaluate(() => history.length)).toBe(length + 1)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(y - 40)
    await expect(link).toBeVisible()
  })

  test('«← Все работы» after «Весь проект →» of the feed view: that feed, without the view', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    const [kitchen] = await itemIds(page.request, WARM.slug)
    await page.goto(`${BASE}/works?category=kitchens&item=${kitchen}`)
    await hydrated(page)
    await dialog(page)
      .getByRole('link', { name: /Весь проект/ })
      .click()
    await expect(page).toHaveURL(`${BASE}/works/${WARM.slug}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(WARM.title)
    await backLink(page).click()
    await expect(page).toHaveURL(`${BASE}/works?category=kitchens`)
    await expect(dialog(page)).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Кухни/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})

test.describe('works: links to a project', () => {
  test.skip(EMPTY_DB, 'needs the works fixture')

  test('news: a link to a project leads to its page; not complex — to its first item; hidden — text', async ({
    page,
  }) => {
    const login = await page.request.post(`${BASE}/api/users/login`, {
      data: { email: e2eEditor.email, password: e2eEditor.password },
    })
    expect(login.ok()).toBe(true)
    const news = E2E_NEWS[1]!
    const { docs } = await (
      await page.request.get(`${BASE}/api/news?where[slug][equals]=${news.slug}&depth=0`)
    ).json()
    const doc = docs[0] as { id: number; body: unknown[] }
    const id = await projectId(page.request, REELS.slug)
    const [first] = await itemIds(page.request, REELS.slug)
    const label = 'квартира с роликами'
    const text = (value: string) => ({
      type: 'text',
      text: value,
      format: 0,
      detail: 0,
      mode: 'normal',
      style: '',
      version: 1,
    })
    const node = { format: '', indent: 0, direction: 'ltr', version: 1 }
    const body = [
      {
        blockType: 'paragraph',
        text: {
          root: {
            ...node,
            type: 'root',
            children: [
              {
                ...node,
                type: 'paragraph',
                textFormat: 0,
                textStyle: '',
                children: [
                  {
                    ...node,
                    type: 'link',
                    version: 3,
                    fields: { linkType: 'internal', doc: { relationTo: 'projects', value: id } },
                    children: [text(label)],
                  },
                ],
              },
            ],
          },
        },
      },
    ]
    const patch = async (path: string, data: Record<string, unknown>) => {
      // Writes when the page is quiet: a background prefetch reading the works feeds across a
      // write would store the old ones after their tag expired (a race of the data cache)
      await page.waitForLoadState('networkidle')
      const response = await page.request.patch(`${BASE}/api/${path}?depth=0`, { data })
      expect(response.ok(), await response.text()).toBe(true)
    }
    const article = `${BASE}/news/${news.slug}`
    const link = page.locator('article').getByRole('link', { name: label })
    try {
      await patch(`news/${doc.id}`, { body, _status: 'published' })
      await page.goto(article)
      await expect(link).toHaveAttribute('href', `/works/${REELS.slug}`)
      await link.click()
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(REELS.title)

      // «Комплекс» unchecked: straight to the view of its first item, without the 308
      await patch(`projects/${id}`, { complex: false })
      await page.goto(article)
      await expect(link).toHaveAttribute('href', `/works?category=kitchens&item=${first}`)

      // Hidden: the text without the link
      await patch(`projects/${id}`, { complex: true, hidden: true })
      await page.goto(article)
      await expect(page.locator('article').getByText(label)).toBeVisible()
      await expect(link).toHaveCount(0)
    } finally {
      await patch(`projects/${id}`, { complex: true, hidden: false })
      await patch(`news/${doc.id}`, { body: doc.body, _status: 'published' })
    }
  })
})

test('a project page on an empty database: 404 @empty', async ({ request }) => {
  test.skip(!EMPTY_DB, 'empty database only')
  const response = await request.get(`${BASE}/works/${WARM.slug}`, { maxRedirects: 0 })
  expect(response.status()).toBe(404)
})
