import { expect, test, type Page } from '@playwright/test'

import { FIRST_SCREEN_END_ID } from '../../src/components/app/FirstScreenEnd'
import { layoutShifts } from '../helpers/scroll'
import { slowHtmlProxy } from '../helpers/slowHtml'

// First screens painted from a partly received page (slow network): nothing grows or moves when
// the rest arrives. Chromium waits for the first-screen marker (FirstScreenEnd); blocks centred
// in their row keep heights reserved from the type scale.
const BASE = 'http://localhost:3000'
const EMPTY_DB = !!process.env.E2E_EMPTY_DB
const PAGES = ['/', '/salons', '/about'] as const
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
  test.skip(EMPTY_DB, 'needs the home, salons and about fixture')

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
  })

  for (const path of PAGES) {
    test(`${path}: one render-blocking link in <head> and its marker in the HTML`, async ({
      request,
    }) => {
      const html = await (await request.get(`${BASE}${path}`)).text()
      const links = html.match(/<link rel="expect"[^>]*>/g) ?? []
      expect(links).toEqual([
        `<link rel="expect" href="#${FIRST_SCREEN_END_ID}" blocking="render"/>`,
      ])
      expect(html.indexOf(links[0])).toBeLessThan(html.indexOf('<body'))
      expect(html.indexOf(`</head>`)).toBeGreaterThan(html.indexOf(links[0]))
      expect(html.match(new RegExp(`id="${FIRST_SCREEN_END_ID}"`, 'g'))).toHaveLength(1)
    })
  }

  test('client navigation keeps one link: / → /salons → /', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE}/`)
    await hydrated(page)
    const links = page.locator('link[rel="expect"]')
    const inHead = page.locator('head > link[rel="expect"]')
    await expect(links).toHaveCount(1)

    await page.getByRole('navigation', { name: 'Разделы сайта' }).locator('a[href="/salons"]').click()
    await page.waitForURL(`${BASE}/salons`)
    await expect(page.locator(`#${FIRST_SCREEN_END_ID}`)).toHaveCount(1)
    await expect(links).toHaveCount(1)
    await expect(inHead).toHaveCount(1)

    await page.getByRole('link', { name: 'MGS MEBEL — на главную' }).click()
    await page.waitForURL(`${BASE}/`)
    await expect(page.locator('section[data-hero]')).toBeVisible()
    await expect(links).toHaveCount(1)
    await expect(inHead).toHaveCount(1)
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
        const logo = await page.getByRole('link', { name: 'MGS MEBEL — на главную' }).evaluate(
          (el) => ({
            reserved: parseFloat(getComputedStyle(el).minHeight),
            parts:
              [...el.children].reduce((sum, c) => sum + c.getBoundingClientRect().height, 0) +
              parseFloat(getComputedStyle(el).rowGap) * (el.children.length - 1),
          }),
        )
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
