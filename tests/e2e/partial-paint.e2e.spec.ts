import { expect, test, type Page } from '@playwright/test'

import { FIRST_SCREEN_END_ID, HEADER_END_ID } from '../../src/components/app/FirstScreenEnd'
import { E2E_ARTICLE } from '../helpers/e2eArticle'
import { layoutShifts } from '../helpers/scroll'
import { slowHtmlProxy } from '../helpers/slowHtml'

// First screens painted from a partly received page (slow network): nothing grows or moves when
// the rest arrives. Chromium waits for the markers (FirstScreenEnd): after the header on every
// page, after the first screen on these; blocks centred in their row keep heights reserved from
// the type scale.
const BASE = 'http://localhost:3000'
const EMPTY_DB = !!process.env.E2E_EMPTY_DB
// A news article with its body: the cover ends the first screen
const ARTICLE = `/news/${E2E_ARTICLE.slug}`
const PAGES = [
  '/',
  '/salons',
  '/about',
  '/catalogs',
  '/designers',
  '/works',
  '/works?category=kitchens',
  '/news',
  ARTICLE,
] as const
const VIEWPORTS = [
  [390, 844],
  [834, 1194],
  [1440, 900],
] as const
// A 1×1 PNG: media boxes keep their ratio without the picture, and the page loads fast
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

const hydrated = (page: Page) =>
  page.waitForFunction(() => document.documentElement.style.getPropertyValue('--header-h') !== '')

const stubMedia = async (page: Page) => {
  await page.route(/\.(mp4|webm)(\?|$)/, (route) => route.abort())
  await page.route(/\/_next\/image\?|\/api\/media\/file\//, (route) =>
    route.fulfill({ contentType: 'image/png', body: PIXEL }),
  )
}

test.describe('partial paint', () => {
  test.skip(EMPTY_DB, 'needs the page fixtures')

  test.describe('slow HTML', () => {
    let proxy: Awaited<ReturnType<typeof slowHtmlProxy>>
    test.beforeAll(async () => {
      proxy = await slowHtmlProxy(BASE)
    })
    test.afterAll(async () => {
      await proxy.close()
    })

    for (const path of PAGES) {
      for (const [width, height] of VIEWPORTS) {
        test(`${path} ${width}: the first screen does not shift while the page arrives`, async ({
          page,
        }) => {
          await page.setViewportSize({ width, height })
          await stubMedia(page)
          await page.goto(`${proxy.origin}${path}`, { waitUntil: 'domcontentloaded' })
          // Buffered shifts since navigation, until 500 ms after the whole document is parsed
          expect(await layoutShifts(page)).toEqual([])
        })
      }
    }

    // The view of an item rendered open over its feed (`?item=`): the id comes from the fixture
    for (const [width, height] of VIEWPORTS) {
      test(`/works?item= ${width}: the view does not shift while the page arrives`, async ({
        page,
      }) => {
        const { docs } = await (
          await page.request.get(
            `${BASE}/api/items?where[type][equals]=kitchens&where[title][exists]=false&depth=0&limit=1`,
          )
        ).json()
        await page.setViewportSize({ width, height })
        await stubMedia(page)
        await page.goto(`${proxy.origin}/works?category=kitchens&item=${docs[0].id}&photo=2`, {
          waitUntil: 'domcontentloaded',
        })
        await expect(page.getByRole('dialog')).toBeVisible()
        expect(await layoutShifts(page)).toEqual([])
      })
    }

    // «Показать ещё» comes after the grid: on a tall screen it is on the first screen too
    test('/news 1440×1600: «Показать ещё» does not shift while the page arrives', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 1600 })
      await stubMedia(page)
      await page.goto(`${proxy.origin}/news`, { waitUntil: 'domcontentloaded' })
      const button = page.getByRole('button', { name: 'Показать ещё' })
      await expect(button).toBeInViewport()
      expect(await layoutShifts(page)).toEqual([])
    })
  })

  // Every page: the header marker (AppShell); pages with a first screen to guard: their own too.
  // /nesushchestvuet — the global 404 (its own <html>, the same AppShell).
  for (const [path, ids] of [
    ['/', [HEADER_END_ID, FIRST_SCREEN_END_ID]],
    ['/salons', [HEADER_END_ID, FIRST_SCREEN_END_ID]],
    ['/about', [HEADER_END_ID, FIRST_SCREEN_END_ID]],
    ['/catalogs', [HEADER_END_ID, FIRST_SCREEN_END_ID]],
    ['/designers', [HEADER_END_ID, FIRST_SCREEN_END_ID]],
    ['/works', [HEADER_END_ID, FIRST_SCREEN_END_ID]],
    ['/news', [HEADER_END_ID, FIRST_SCREEN_END_ID]],
    [ARTICLE, [HEADER_END_ID, FIRST_SCREEN_END_ID]],
    ['/ui-kit', [HEADER_END_ID]],
    ['/nesushchestvuet', [HEADER_END_ID]],
  ] as const) {
    test(`${path}: a render-blocking link in <head> per marker, each marker once`, async ({
      request,
    }) => {
      const html = await (await request.get(`${BASE}${path}`)).text()
      const links = ids.map((id) => `<link rel="expect" href="#${id}" blocking="render"/>`)
      expect(html.match(/<link rel="expect"[^>]*>/g)).toEqual(links)
      for (const link of links) expect(html.indexOf(link)).toBeLessThan(html.indexOf('</head>'))
      expect(html.indexOf('</head>')).toBeLessThan(html.indexOf('<body'))
      for (const id of ids) expect(html.match(new RegExp(`id="${id}"`, 'g'))).toHaveLength(1)
    })
  }

  test('client navigation keeps one link per marker: / → /salons → /', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE}/`)
    await hydrated(page)
    const expectLinks = async () => {
      await expect(page.locator('link[rel="expect"]')).toHaveCount(2)
      for (const id of [HEADER_END_ID, FIRST_SCREEN_END_ID]) {
        await expect(page.locator(`head > link[rel="expect"][href="#${id}"]`)).toHaveCount(1)
        await expect(page.locator(`#${id}`)).toHaveCount(1)
      }
    }
    await expectLinks()

    await page
      .getByRole('navigation', { name: 'Разделы сайта' })
      .locator('a[href="/salons"]')
      .click()
    await page.waitForURL(`${BASE}/salons`)
    await expect(page.locator('h1')).toBeVisible()
    await expectLinks()

    await page.getByRole('link', { name: 'MGS MEBEL — на главную' }).click()
    await page.waitForURL(`${BASE}/`)
    await expect(page.locator('section[data-hero]')).toBeVisible()
    await expectLinks()
  })

  // Reserved heights (globals.css: min-h-logo, min-h-label, min-h-header-row) mirror the sizes of
  // the parts. If a size changes and the reserve does not, this fails instead of the look.
  test.describe('reserved heights', () => {
    for (const [width, height] of [
      [390, 844],
      [1440, 900],
    ] as const) {
      test(`${width}: logo and section label reserve the height of their parts`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height })
        await page.goto(`${BASE}/salons`)
        const logo = await page
          .getByRole('link', { name: 'MGS MEBEL — на главную' })
          .evaluate((el) => ({
            reserved: parseFloat(getComputedStyle(el).minHeight),
            parts:
              [...el.children].reduce((sum, c) => sum + c.getBoundingClientRect().height, 0) +
              parseFloat(getComputedStyle(el).rowGap) * (el.children.length - 1),
          }))
        expect(logo.parts).toBeGreaterThan(0)
        expect(logo.reserved).toBeCloseTo(logo.parts, 1)

        // The page's section label (SectionLabel): the accent line and the text
        const label = await page
          .locator('main p')
          .filter({ has: page.locator('span.bg-accent') })
          .first()
          .evaluate((el) => ({
            reserved: parseFloat(getComputedStyle(el).minHeight),
            text: el.children[1].getBoundingClientRect().height,
          }))
        expect(label.text).toBeGreaterThan(0)
        expect(label.reserved).toBeCloseTo(label.text, 1)
      })
    }

    test('1440: the header row reserves the height of the CTA', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto(`${BASE}/salons`)
      const row = await page.locator('[data-chooser-shift]').evaluate((el) => {
        const style = getComputedStyle(el)
        const group = el.lastElementChild!.previousElementSibling as HTMLElement
        const cta = group.lastElementChild!
        return {
          reserved: parseFloat(style.minHeight),
          parts:
            cta.getBoundingClientRect().height +
            parseFloat(style.paddingTop) +
            parseFloat(style.paddingBottom),
          group: parseFloat(getComputedStyle(group).minHeight),
          cta: cta.getBoundingClientRect().height,
        }
      })
      expect(row.cta).toBeGreaterThan(0)
      expect(row.reserved).toBeCloseTo(row.parts, 1)
      expect(row.group).toBeCloseTo(row.cta, 1)
    })
  })
})
