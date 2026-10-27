import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, newConsentContext } from '../helpers/test'

import { globals } from '../../src/seed/data/globals'
import {
  E2E_COMPLEX,
  E2E_SEPARATE_ITEMS,
  E2E_WORK_COUNTS,
  E2E_WORK_PROJECTS,
  e2eFeedTitles,
} from '../helpers/e2eWorks'
import { countActions, failActions, recordWave, waveStates } from '../helpers/feeds'
import { layoutShifts, settle } from '../helpers/scroll'

// «Наши работы» v2 (works package §2): heading with the counter, feed chips, masonry of tiles.
const BASE = 'http://localhost:3000'
const URL = `${BASE}/works`
const EMPTY_DB = !!process.env.E2E_EMPTY_DB
const { worksPage, layout } = globals(() => 0)
const HERO = worksPage.hero!
const HEIGHTS = { 390: 844, 834: 1194, 1440: 900 } as const
const COLUMNS = { 390: 2, 834: 3, 1440: 4 } as const
// Chips in the design's order: label, feed, number
const CHIPS = [
  ['REELS', 'reels'],
  ['Комплекс', 'complex'],
  ['Кухни', 'kitchens'],
  ['Спальни', 'bedrooms'],
  ['Гардеробные', 'wardrobes'],
  ['Прихожие', 'hallways'],
  ['Санузлы', 'bathrooms'],
  ['Детские', 'kids'],
  ['Гостиные', 'livingrooms'],
] as const

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

const chipsOf = (page: Page) => page.getByRole('group', { name: 'Категории работ' })
const chip = (page: Page, label: string) =>
  chipsOf(page).getByRole('button', { name: new RegExp(`^${label} \\d+$`) })
const grid = (page: Page) => page.locator('main ul[data-works-grid]')
const tiles = (page: Page) => grid(page).locator('> li')
const counter = (page: Page) => page.locator('main [aria-live="polite"]')
const plural = (n: number, [one, few, many]: [string, string, string]) =>
  n % 10 === 1 && n % 100 !== 11
    ? one
    : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)
      ? few
      : many

test.describe('works', () => {
  test.skip(EMPTY_DB, 'needs the works fixture')

  for (const width of [390, 834, 1440] as const) {
    test(`${width}: heading, chips, «Комплекс» tiles — no violations, errors or shifts`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: HEIGHTS[width] })
      const errors = watchConsole(page)
      const response = await page.goto(URL)
      expect(response?.status()).toBe(200)
      await hydrated(page)
      await settle(page)

      await expect(page.getByRole('heading', { level: 1 })).toHaveText(HERO.title!)
      const n = E2E_COMPLEX.length
      await expect(counter(page)).toHaveText(`${n} ${plural(n, ['проект', 'проекта', 'проектов'])}`)
      // Every feed with tiles, with its number; «Комплекс» selected
      await expect(chipsOf(page).getByRole('button')).toHaveCount(CHIPS.length)
      for (const [label, feed] of CHIPS) {
        await expect(chip(page, label)).toHaveAccessibleName(`${label} ${E2E_WORK_COUNTS[feed]}`)
      }
      await expect(chip(page, 'Комплекс')).toHaveAttribute('aria-pressed', 'true')

      // Project tiles: links to the project page named by the title, badges, «ЖК →»
      await expect(tiles(page)).toHaveCount(n)
      await expect(page.locator('main h2')).toHaveText(E2E_COMPLEX.map((p) => p.title))
      for (const [i, project] of E2E_COMPLEX.entries()) {
        const link = tiles(page).nth(i).getByRole('link')
        await expect(link).toHaveAttribute('href', `/works/${project.slug}`)
        await expect(link).toHaveAccessibleName(project.title)
        await expect(link).toContainText(project.place)
        const photos = project.items.reduce((m, item) => m + item.photos.length, 0)
        const videos =
          (project.videos ?? 0) + project.items.reduce((m, item) => m + (item.videos ?? 0), 0)
        await expect(link).toContainText(
          videos ? `${photos} фото + ${videos} видео` : `${photos} фото`,
        )
        await expect(link.getByText('REELS', { exact: true })).toHaveCount(videos ? 1 : 0)
      }
      // Hidden projects and complexes without items are not shown
      for (const p of E2E_WORK_PROJECTS.filter((p) => !E2E_COMPLEX.includes(p))) {
        await expect(page.getByText(p.title)).toHaveCount(0)
      }

      // Order by rows: the first tiles start the columns, in order from the left
      const boxes = await tiles(page).evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect()
          return { top: Math.round(r.top), left: Math.round(r.left) }
        }),
      )
      const firstRow = boxes.slice(0, Math.min(COLUMNS[width], boxes.length))
      for (const box of firstRow) expect(box.top).toBe(firstRow[0]!.top)
      expect(firstRow.map((b) => b.left)).toEqual(
        [...firstRow.map((b) => b.left)].sort((a, b) => a - b),
      )
      expect(new Set(boxes.map((b) => b.left)).size).toBe(Math.min(COLUMNS[width], boxes.length))

      expect(await layoutShifts(page)).toEqual([])
      expect(await axe(page)).toEqual([])
      expect(errors).toEqual([])
    })
  }

  test('a chip changes the feed in place: URL replaced, numbers kept, focus on the chip', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    const errors = watchConsole(page)
    await page.goto(URL)
    await hydrated(page)
    const length = await page.evaluate(() => history.length)

    await chip(page, 'Кухни').focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(`${URL}?category=kitchens`)
    const kitchens = e2eFeedTitles('kitchens')
    await expect(page.locator('main h2')).toHaveText(kitchens)
    await expect(counter(page)).toHaveText(
      `${kitchens.length} ${plural(kitchens.length, ['работа', 'работы', 'работ'])}`,
    )
    await expect(chip(page, 'Кухни')).toHaveAttribute('aria-pressed', 'true')
    await expect(chip(page, 'Кухни')).toBeFocused()
    expect(await page.evaluate(() => history.length)).toBe(length)
    for (const [label, feed] of CHIPS) {
      await expect(chip(page, label)).toHaveAccessibleName(`${label} ${E2E_WORK_COUNTS[feed]}`)
    }
    // Item tiles: links to their views named by the title, «N фото» badge, the place
    await expect(grid(page).getByRole('link')).toHaveCount(kitchens.length)
    await expect(grid(page).getByRole('link').first()).toHaveAccessibleName(kitchens[0]!)
    await expect(grid(page).getByRole('link').first()).toHaveAttribute(
      'href',
      /^\/works\?category=kitchens&item=\d+$/,
    )
    await expect(tiles(page).first()).toContainText('ЖК Уно')
    await expect(tiles(page).first()).toContainText('3 фото')
    // Hidden items and the items of a hidden project are not shown
    await expect(page.getByText('Скрытая кухня')).toHaveCount(0)
    await expect(page.getByText('Кухня скрытого проекта')).toHaveCount(0)

    // REELS: a tile per video, with the badge and the zone of its item
    await chip(page, 'REELS').click()
    await expect(page).toHaveURL(`${URL}?category=reels`)
    await expect(tiles(page)).toHaveCount(E2E_WORK_COUNTS.reels)
    await expect(tiles(page).getByText('REELS', { exact: true })).toHaveCount(E2E_WORK_COUNTS.reels)
    await expect(tiles(page).nth(1)).toContainText('Гардеробная')
    await expect(counter(page)).toHaveText(`${E2E_WORK_COUNTS.reels} видео`)

    // Back to «Комплекс»: no parameter
    await chip(page, 'Комплекс').click()
    await expect(page).toHaveURL(URL)
    await expect(page.locator('main h2')).toHaveText(E2E_COMPLEX.map((p) => p.title))
    expect(errors).toEqual([])
  })

  test('the feed in the URL is rendered on the server; unknown → «Комплекс»; canonical', async ({
    request,
    page,
  }) => {
    const html = await (await request.get(`${URL}?category=kitchens`)).text()
    for (const title of e2eFeedTitles('kitchens')) expect(html).toContain(title)
    for (const project of E2E_COMPLEX) expect(html).not.toContain(`>${project.title}</h2>`)
    expect(html).toContain(`<link rel="canonical" href="${BASE}/works"/>`)

    const unknown = await (await request.get(`${URL}?category=nesushchestvuet`)).text()
    for (const project of E2E_COMPLEX) expect(unknown).toContain(project.title)

    // Without JS the feed is the same
    const context = await newConsentContext(page.context().browser()!, { javaScriptEnabled: false })
    const noJs = await context.newPage()
    await noJs.goto(`${URL}?category=bathrooms`)
    await expect(noJs.locator('main h2')).toHaveText(e2eFeedTitles('bathrooms'))
    await context.close()
  })

  test('separate works without a project: their own title, no place', async ({ page }) => {
    await page.goto(`${URL}?category=bathrooms`)
    const separate = E2E_SEPARATE_ITEMS.find((i) => i.type === 'bathrooms')!
    const tile = tiles(page).filter({ hasText: separate.title! })
    await expect(tile).toContainText(`${separate.photos.length} фото`)
    await expect(tile.locator('p')).toHaveCount(0)
  })

  test('reduced motion: the new tiles show at once, no wave', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(URL)
    await hydrated(page)
    await chip(page, 'Кухни').click()
    await expect(page.locator('main h2').first()).toHaveText(e2eFeedTitles('kitchens')[0]!)
    // Never hidden for the wave
    expect(await grid(page).locator('[data-wave]').count()).toBe(0)
    const opacities = await tiles(page).evaluateAll((els) =>
      els.map((el) => getComputedStyle(el).opacity),
    )
    expect(new Set(opacities)).toEqual(new Set(['1']))
  })

  test('the wave: new tiles in the viewport rise, all of them end visible', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(URL)
    await hydrated(page)
    // Every state the list and its tiles go through
    await recordWave(page, 'main ul[data-works-grid]')
    await chip(page, 'Кухни').click()
    await expect(page.locator('main h2').first()).toHaveText(e2eFeedTitles('kitchens')[0]!)
    await expect(grid(page).locator('[data-wave="wait"]')).toHaveCount(0)
    const states = await waveStates(page)
    // The old tiles faded out, then the new ones waited and rose
    expect(states).toContain('list:out')
    expect(states).toContain('wait')
    expect(states).toContain('in')
    await expect
      .poll(() =>
        tiles(page).evaluateAll((els) => els.every((el) => getComputedStyle(el).opacity === '1')),
      )
      .toBe(true)
  })

  test('a failed feed change keeps the feed, the chip and the URL; a click retries', async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(URL)
    await hydrated(page)
    const failing = await failActions(page, '**/works**')
    const failed = page.waitForResponse(
      (r) => r.request().method() === 'POST' && r.status() === 500,
    )
    await chip(page, 'Кухни').click()
    await failed
    await expect(chip(page, 'Комплекс')).toHaveAttribute('aria-pressed', 'true')
    await expect(chip(page, 'Кухни')).toHaveAttribute('aria-pressed', 'false')
    await expect(page).toHaveURL(URL)
    await expect(page.locator('main h2')).toHaveText(E2E_COMPLEX.map((p) => p.title))
    await expect(grid(page)).not.toHaveAttribute('data-wave')
    await failing.off()
    await chip(page, 'Кухни').click()
    await expect(page.locator('main h2').first()).toHaveText(e2eFeedTitles('kitchens')[0]!)
    await expect(page).toHaveURL(`${URL}?category=kitchens`)
    expect(errors).toEqual([])
  })

  test('back to a feed: from memory, no request', async ({ page }) => {
    await page.goto(URL)
    await hydrated(page)
    const actions = countActions(page)
    await chip(page, 'Кухни').click()
    await expect(page.locator('main h2').first()).toHaveText(e2eFeedTitles('kitchens')[0]!)
    await chip(page, 'Комплекс').click()
    await expect(page.locator('main h2')).toHaveText(E2E_COMPLEX.map((p) => p.title))
    await chip(page, 'Кухни').click()
    await expect(page.locator('main h2').first()).toHaveText(e2eFeedTitles('kitchens')[0]!)
    expect(actions.count()).toBe(1)
  })

  test('a direct visit to the view of an item: its feed from the server, no change under it', async ({
    page,
    request,
  }) => {
    const { docs } = await (
      await request.get(`${BASE}/api/items?where[type][equals]=kitchens&depth=0&limit=1`)
    ).json()
    const id = (docs[0] as { id: number }).id
    const actions = countActions(page)
    await page.addInitScript(() => {
      const w = window as Window & { __waveSeen?: number }
      w.__waveSeen = 0
      new MutationObserver((records) => {
        for (const r of records) {
          if ((r.target as Element).hasAttribute?.('data-wave')) w.__waveSeen! += 1
        }
      }).observe(document, { attributes: true, subtree: true, attributeFilter: ['data-wave'] })
    })
    await page.goto(`${URL}?item=${id}`)
    await hydrated(page)
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect
      .poll(() => new globalThis.URL(page.url()).searchParams.get('category'))
      .toBe('kitchens')
    await page.waitForTimeout(500)
    // Closed: the same feed, its chip
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(chip(page, 'Кухни')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('main h2').first()).toHaveText(e2eFeedTitles('kitchens')[0]!)
    await page.waitForTimeout(500)
    expect(actions.count()).toBe(0)
    expect(await page.evaluate(() => (window as Window & { __waveSeen?: number }).__waveSeen)).toBe(
      0,
    )
  })

  test('a link to the page itself (header nav) brings the feed of the URL back', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${URL}?category=kitchens`)
    await hydrated(page)
    await page.locator('header nav').getByRole('link', { name: layout.nav!.works!.label }).click()
    await expect(page).toHaveURL(URL)
    await expect(chip(page, 'Комплекс')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('main h2')).toHaveText(E2E_COMPLEX.map((p) => p.title))
  })
})

test('works on an empty database: the heading only @empty', async ({ page }) => {
  test.skip(!EMPTY_DB, 'empty database only')
  const errors = watchConsole(page)
  const response = await page.goto(URL)
  expect(response?.status()).toBe(200)
  await expect(chipsOf(page)).toHaveCount(0)
  await expect(grid(page)).toHaveCount(0)
  expect(await axe(page)).toEqual([])
  expect(errors).toEqual([])
})
