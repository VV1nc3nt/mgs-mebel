import AxeBuilder from '@axe-core/playwright'
import { expect, test, type APIRequestContext, type Page, newConsentContext } from '../helpers/test'

import { e2eEditor } from '../helpers/e2eEditor'
import { E2E_NEWS } from '../helpers/e2eNews'
import { e2eFeedTitles, e2eItem, E2E_WORK_PROJECTS } from '../helpers/e2eWorks'
import { requestGate } from '../helpers/requestGate'
import { layoutShifts, settle } from '../helpers/scroll'
import { PLAYBACK_ATTR, stubPlayback } from '../helpers/video'

// View of an item of «Наши работы» (works v2 §3.4): address, dialog, panel, videos, links to it.
const BASE = 'http://localhost:3000'
const EMPTY_DB = !!process.env.E2E_EMPTY_DB
const HEIGHTS = { 390: 844, 834: 1194, 1440: 900 } as const
const PROJECT = E2E_WORK_PROJECTS[0]!
const KITCHEN = e2eItem('kitchens')
const BATHROOM = e2eItem('bathrooms')
const SEPARATE = e2eItem('kitchens', 'Кухня в загородный дом')
const NO_PRICE = e2eItem('kitchens', 'Угловая кухня под потолок')
const CTA_NOTE = 'Рассчитаем под ваши размеры'

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

/** Id of an item of the fixture by its type and title (public read of the collection). */
const itemId = async (request: APIRequestContext, type: string, title?: string) => {
  const where = title
    ? `where[type][equals]=${type}&where[title][equals]=${encodeURIComponent(title)}`
    : `where[type][equals]=${type}&where[title][exists]=false&where[project][exists]=true`
  const { docs } = await (await request.get(`${BASE}/api/items?${where}&depth=0&limit=1`)).json()
  return (docs[0] as { id: number }).id
}

const dialog = (page: Page) => page.getByRole('dialog')
const grid = (page: Page) => page.locator('main ul[data-works-grid]')
/** The first tile of that title (untitled items of a type share it). */
const tileLink = (page: Page, title: string) =>
  grid(page).getByRole('link', { name: title, exact: true }).first()
/** The counter of the layout shown: the strip's from 1280, the list's below. */
const counter = (page: Page) => dialog(page).locator('[data-view-counter]:visible')
const panel = (page: Page) => dialog(page).locator('[data-view-panel]')
const viewUrl = (type: string, id: number, photo?: number) =>
  `${BASE}/works?category=${type}&item=${id}${photo && photo > 1 ? `&photo=${photo}` : ''}`

const login = async (request: APIRequestContext) => {
  const response = await request.post(`${BASE}/api/users/login`, {
    data: { email: e2eEditor.email, password: e2eEditor.password },
  })
  expect(response.ok()).toBe(true)
}

/** Scrolls the list of the view (below 1280) so that frame `n` (from 1) crosses the focus line. */
const listTo = async (page: Page, n: number) => {
  await dialog(page).evaluate((el, i) => {
    const frame = el.querySelectorAll<HTMLElement>('[data-view-list] > *')[i]!
    el.scrollTo({ top: frame.offsetTop - el.clientHeight * 0.3, behavior: 'instant' })
  }, n - 1)
}

/**
 * A step on the strip (1440) keeps the node of the frame at `at` (a neighbour): it becomes the
 * current one, slides (translate) and lights up (opacity) — or, under reduced motion, no transition.
 */
const stepKeepsNode = async (
  page: Page,
  at: '1' | '-1',
  go: () => Promise<unknown>,
  moving = true,
) => {
  const handle = (await dialog(page).locator(`[data-slide="${at}"]`).elementHandle())!
  await handle.evaluate((el) => {
    const node = el as HTMLElement & { e2eRuns?: string[] }
    node.e2eRuns = []
    node.addEventListener('transitionrun', (e) => {
      if (e.target === node) node.e2eRuns!.push((e as TransitionEvent).propertyName)
    })
  })
  await go()
  expect(await handle.evaluate((el) => el.isConnected)).toBe(true)
  await expect.poll(() => handle.getAttribute('data-slide')).toBe('current')
  await expect.poll(() => handle.evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
  const runs = await handle.evaluate((el) => (el as HTMLElement & { e2eRuns?: string[] }).e2eRuns)
  if (moving) expect(runs).toEqual(expect.arrayContaining(['translate', 'opacity']))
  else expect(runs).toEqual([])
  // The transition over and the wheel's lock off before the next step
  await page.waitForTimeout(700)
}

test.describe('works: view of an item', () => {
  test.skip(EMPTY_DB, 'needs the works fixture')

  for (const width of [390, 834, 1440] as const) {
    test(`${width}: a tile opens the view in place; steps, counter, round, «Назад»`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: HEIGHTS[width] })
      const errors = watchConsole(page)
      const id = await itemId(page.request, 'kitchens')
      await page.goto(`${BASE}/works?category=kitchens`)
      await hydrated(page)
      await settle(page)
      // The feed a little scrolled: it stays where it was
      await page.evaluate(() => window.scrollTo({ top: 120, behavior: 'instant' }))
      const before = await page.evaluate(() => ({ y: window.scrollY, length: history.length }))
      await grid(page).evaluate((el) => ((el as HTMLElement & { e2e?: number }).e2e = 1))
      const rsc: string[] = []
      // Navigation requests of the router (background prefetches of the header links aside)
      page.on('request', (r) => {
        const headers = r.headers()
        if (headers['rsc'] && !headers['next-router-prefetch']) rsc.push(r.url())
      })

      await tileLink(page, 'Кухня').click()
      await expect(dialog(page)).toBeVisible()
      await expect(page).toHaveURL(viewUrl('kitchens', id))
      expect(await page.evaluate(() => history.length)).toBe(before.length + 1)
      await expect(dialog(page)).toHaveAttribute('aria-modal', 'true')
      await expect(dialog(page)).toHaveAccessibleName('Кухня')
      await expect(dialog(page).getByRole('link', { name: 'Закрыть' })).toBeFocused()
      await expect(counter(page)).toHaveText(`1 / ${KITCHEN.photos.length}`)

      // The page under it: inert, frozen
      expect(
        await page.evaluate(() =>
          [...document.querySelectorAll('[inert]')].some((el) =>
            el.contains(document.querySelector('header')),
          ),
        ),
      ).toBe(true)
      expect(await grid(page).evaluate((el) => el.closest('[inert]') !== null)).toBe(true)
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe(
        'hidden',
      )

      // The panel: title, text, specs, price with its date, the project, the CTA
      await expect(panel(page).getByRole('heading', { level: 2 })).toHaveText('Кухня')
      await expect(panel(page).locator('p').first()).toHaveText(
        KITCHEN.description!.split('\n\n')[0]!,
      )
      await expect(panel(page).locator('dt')).toHaveText([
        'Корпус',
        'Фасады',
        'Фурнитура',
        'Столешница',
      ])
      await expect(panel(page).locator('dd')).toHaveText([
        'ЛДСП Egger 18 мм',
        KITCHEN.fasady!,
        'Blum',
        'Кварц',
      ])
      await expect(panel(page).getByText('950 000 ₽', { exact: true })).toBeVisible()
      await expect(panel(page).getByText('Цена актуальна на октябрь 2026')).toBeVisible()
      await expect(panel(page).getByRole('link', { name: /Весь проект/ })).toHaveAttribute(
        'href',
        `/works/${PROJECT.slug}`,
      )
      await expect(
        panel(page).getByRole('button', { name: 'Хочу такую же — выбрать мессенджер' }),
      ).toBeVisible()
      await expect(panel(page).getByText(CTA_NOTE)).toBeVisible()

      await settle(page)
      expect(await axe(page)).toEqual([])

      if (width === 1440) {
        // Keys, arrows and the wheel step one frame; going round has no end
        await page.keyboard.press('ArrowRight')
        await expect(page).toHaveURL(viewUrl('kitchens', id, 2))
        await expect(counter(page)).toHaveText('2 / 3')
        await dialog(page).getByRole('button', { name: 'Следующее фото' }).click()
        await expect(counter(page)).toHaveText('3 / 3')
        await dialog(page).getByRole('button', { name: 'Следующее фото' }).click()
        await expect(counter(page)).toHaveText('1 / 3')
        await expect(page).toHaveURL(viewUrl('kitchens', id))
        await page.keyboard.press('ArrowLeft')
        await expect(counter(page)).toHaveText('3 / 3')
        await page.waitForTimeout(700)
        const strip = dialog(page).locator('[data-view-strip]')
        const box = (await strip.boundingBox())!
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
        await page.mouse.wheel(0, 120)
        await expect(counter(page)).toHaveText('1 / 3')
        // A neighbour at the side: a click steps to it
        await page.waitForTimeout(700)
        await strip.locator('[data-slide="1"]').click({ force: true })
        await expect(counter(page)).toHaveText('2 / 3')
        expect(await historyLength(page)).toBe(before.length + 1)
      } else {
        // The list: the frame at the focus line is the current one
        await listTo(page, 2)
        await expect(counter(page)).toHaveText('2 / 3')
        await expect(page).toHaveURL(viewUrl('kitchens', id, 2))
        await listTo(page, 3)
        await expect(counter(page)).toHaveText('3 / 3')
        expect(await historyLength(page)).toBe(before.length + 1)
      }
      // The page did not scroll under the view
      expect(await page.evaluate(() => window.scrollY)).toBe(before.y)

      // «Назад» closes: the feed where it was, the focus on the tile, nothing reloaded
      await page.goBack()
      await expect(dialog(page)).toHaveCount(0)
      await expect(page).toHaveURL(`${BASE}/works?category=kitchens`)
      await expect(tileLink(page, 'Кухня')).toBeFocused()
      expect(await page.evaluate(() => window.scrollY)).toBe(before.y)
      expect(await grid(page).evaluate((el) => (el as HTMLElement & { e2e?: number }).e2e)).toBe(1)
      expect(rsc).toEqual([])
      expect(await layoutShifts(page)).toEqual([])
      expect(errors).toEqual([])
    })
  }

  test('Esc and × close; a direct visit closes to the feed in place', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    const id = await itemId(page.request, 'kitchens')
    await page.goto(`${BASE}/works?category=kitchens`)
    await hydrated(page)
    const length = await page.evaluate(() => history.length)

    await tileLink(page, 'Кухня').click()
    await expect(dialog(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog(page)).toHaveCount(0)
    await expect(page).toHaveURL(`${BASE}/works?category=kitchens`)
    await expect(tileLink(page, 'Кухня')).toBeFocused()

    await tileLink(page, 'Кухня').click()
    await expect(dialog(page)).toBeVisible()
    await dialog(page).getByRole('link', { name: 'Закрыть' }).click()
    await expect(dialog(page)).toHaveCount(0)
    expect(await page.evaluate(() => history.length)).toBe(length + 1)

    // Opened by its address: × replaces it with the feed, no new entry
    await page.goto(viewUrl('kitchens', id, 2))
    await hydrated(page)
    await expect(counter(page)).toHaveText('2 / 3')
    const direct = await page.evaluate(() => history.length)
    await dialog(page).getByRole('link', { name: 'Закрыть' }).click()
    await expect(dialog(page)).toHaveCount(0)
    await expect(page).toHaveURL(`${BASE}/works?category=kitchens`)
    expect(await page.evaluate(() => history.length)).toBe(direct)
    await expect(tileLink(page, 'Кухня')).toBeFocused()
  })

  test('direct address: the view in the HTML, without script too; hidden — the feed', async ({
    page,
    browser,
  }) => {
    const id = await itemId(page.request, 'kitchens')
    const html = await (await page.request.get(viewUrl('kitchens', id, 2))).text()
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-label="Кухня"')
    expect(html).toContain('<link rel="canonical" href="http://localhost:3000/works"/>')
    // Open Graph: the first photo of the item
    const og = /<meta property="og:image" content="([^"]+)"/.exec(html)?.[1]
    const { docs } = await (
      await page.request.get(`${BASE}/api/items?where[id][equals]=${id}&depth=1`)
    ).json()
    expect(og).toContain(docs[0].photos[0].filename.replace(/\.[a-z]+$/, ''))

    const context = await newConsentContext(browser, {
      javaScriptEnabled: false,
      viewport: { width: 1440, height: 900 },
    })
    const noJs = await context.newPage()
    await noJs.goto(viewUrl('kitchens', id, 2))
    await expect(noJs.getByRole('dialog', { name: 'Кухня' })).toBeVisible()
    await expect(noJs.locator('[data-view-counter]:visible')).toHaveText('2 / 3')
    await expect(noJs.getByRole('dialog').getByRole('link', { name: 'Закрыть' })).toHaveAttribute(
      'href',
      '/works?category=kitchens',
    )
    await context.close()

    // The feed of the address is the item's: another category is corrected in place
    await page.goto(viewUrl('bathrooms', id))
    await hydrated(page)
    await expect(dialog(page)).toHaveAccessibleName('Кухня')
    await expect(page).toHaveURL(viewUrl('kitchens', id))

    // Hidden item, item of a hidden project, no such item, photo out of range
    for (const hidden of [
      await itemId(page.request, 'kitchens', 'Скрытая кухня'),
      await itemId(page.request, 'kitchens', 'Кухня скрытого проекта'),
      999_999,
    ]) {
      const response = await page.goto(viewUrl('kitchens', hidden))
      expect(response?.status()).toBe(200)
      await hydrated(page)
      await expect(dialog(page)).toHaveCount(0)
      await expect(grid(page).locator('h2')).toHaveText(e2eFeedTitles('kitchens'))
      await expect(page).toHaveURL(`${BASE}/works?category=kitchens`)
    }
    await page.goto(`${viewUrl('kitchens', id)}&photo=99`)
    await expect(counter(page)).toHaveText('1 / 3')
  })

  test('panel: no project, own CTA label; no price; a «такой же» type', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    const open = async (type: string, title?: string) => {
      await page.goto(viewUrl(type, await itemId(page.request, type, title)))
      await hydrated(page)
      await expect(dialog(page)).toBeVisible()
    }

    await open('kitchens', SEPARATE.title)
    await expect(panel(page).getByText('1 250 000 ₽', { exact: true })).toBeVisible()
    await expect(panel(page).getByRole('link', { name: /Весь проект/ })).toHaveCount(0)
    await expect(
      panel(page).getByRole('button', { name: `${SEPARATE.ctaLabel} — выбрать мессенджер` }),
    ).toBeVisible()

    await open('kitchens', NO_PRICE.title)
    await expect(panel(page).getByText('Стоимость')).toHaveCount(0)
    await expect(panel(page).getByText(/Цена актуальна/)).toHaveCount(0)

    await open('bathrooms')
    await expect(panel(page).getByText('320 000 ₽', { exact: true })).toBeVisible()
    await expect(
      panel(page).getByRole('button', { name: 'Хочу такой же — выбрать мессенджер' }),
    ).toBeVisible()
    await expect(counter(page)).toHaveText(`1 / ${BATHROOM.photos.length + BATHROOM.videos!}`)
  })

  test('1440: a video plays on its frame only, muted; the sound button', async ({ page }) => {
    await stubPlayback(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    const id = await itemId(page.request, 'bathrooms')
    const frames = BATHROOM.photos.length + BATHROOM.videos!
    await page.goto(viewUrl('bathrooms', id))
    await hydrated(page)
    const videos = dialog(page).locator('video')
    await expect(videos).toHaveCount(0)
    await page.keyboard.press('ArrowLeft')
    await expect(counter(page)).toHaveText(`${frames} / ${frames}`)
    await expect(videos).toHaveCount(1)
    await expect(videos).toHaveAttribute(PLAYBACK_ATTR, 'playing')
    expect(await videos.evaluate((v: HTMLVideoElement) => v.muted)).toBe(true)
    const sound = dialog(page).getByRole('button', { name: 'Звук выкл' })
    await sound.click()
    await expect(dialog(page).getByRole('button', { name: 'Звук вкл' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(await videos.evaluate((v: HTMLVideoElement) => v.muted)).toBe(false)
    // A tap pauses and plays
    await dialog(page).getByRole('button', { name: 'Пауза' }).click()
    await expect(videos).toHaveAttribute(PLAYBACK_ATTR, 'paused')
    await dialog(page).getByRole('button', { name: 'Воспроизвести' }).click()
    await expect(videos).toHaveAttribute(PLAYBACK_ATTR, 'playing')
    await expect(dialog(page).getByRole('slider', { name: 'Перемотка' })).toBeVisible()
    // Another frame: no video
    await page.keyboard.press('ArrowRight')
    await expect(counter(page)).toHaveText(`1 / ${frames}`)
    await expect(videos).toHaveCount(0)
  })

  test('390: the video in focus plays, the panel pauses it', async ({ page }) => {
    await stubPlayback(page)
    await page.setViewportSize({ width: 390, height: 844 })
    const id = await itemId(page.request, 'bathrooms')
    const frames = BATHROOM.photos.length + BATHROOM.videos!
    await page.goto(viewUrl('bathrooms', id))
    await hydrated(page)
    const video = dialog(page).locator('video')
    await expect(video).toHaveCount(0)
    await listTo(page, frames)
    await expect(counter(page)).toHaveText(`${frames} / ${frames}`)
    await expect(video).toHaveAttribute(PLAYBACK_ATTR, 'playing')
    await dialog(page).evaluate((el) => el.scrollTo({ top: el.scrollHeight, behavior: 'instant' }))
    await expect(video).toHaveAttribute(PLAYBACK_ATTR, 'paused')
    await listTo(page, frames)
    await expect(video).toHaveAttribute(PLAYBACK_ATTR, 'playing')
    await listTo(page, 1)
    await expect(video).toHaveAttribute(PLAYBACK_ATTR, 'paused')
  })

  test.describe('touch', () => {
    test.use({ hasTouch: true })

    test('390: a swipe down from the top of the first frame closes', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto(`${BASE}/works?category=kitchens`)
      await hydrated(page)
      await tileLink(page, 'Кухня').click()
      await expect(dialog(page)).toBeVisible()
      const cdp = await page.context().newCDPSession(page)
      const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', y: number) =>
        cdp.send('Input.dispatchTouchEvent', {
          type,
          touchPoints: type === 'touchEnd' ? [] : [{ x: 195, y }],
        })
      // A short pull is not enough
      await touch('touchStart', 200)
      for (let i = 1; i <= 4; i++) await touch('touchMove', 200 + i * 20)
      await touch('touchEnd', 280)
      await expect(dialog(page)).toBeVisible()
      await touch('touchStart', 200)
      for (let i = 1; i <= 8; i++) await touch('touchMove', 200 + i * 20)
      await touch('touchEnd', 360)
      await expect(dialog(page)).toHaveCount(0)
      await expect(page).toHaveURL(`${BASE}/works?category=kitchens`)
    })
  })

  test('1440: a step slides the same frame nodes — arrows, the wheel, keys', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE}/works?category=kitchens`)
    await hydrated(page)
    await tileLink(page, 'Кухня').click()
    await expect(dialog(page)).toBeVisible()
    await page.waitForTimeout(700)
    const next = dialog(page).getByRole('button', { name: 'Следующее фото' })
    const prev = dialog(page).getByRole('button', { name: 'Предыдущее фото' })
    // The frame entering from the edge mounts at its place beyond it: no transition, out of view
    const strip = dialog(page).locator('[data-view-strip]')
    const edge = await strip.evaluate((el) => el.getBoundingClientRect().right)
    const entering = dialog(page).locator('[data-slide="2"]')
    await entering.evaluate((el) => el.setAttribute('data-e2e', 'old'))
    await stepKeepsNode(page, '1', () => next.click())
    expect(await entering.getAttribute('data-e2e')).toBeNull()
    expect(await entering.evaluate((el) => el.getAnimations().length)).toBe(0)
    expect(await entering.evaluate((el) => el.getBoundingClientRect().left)).toBeGreaterThanOrEqual(
      edge,
    )
    await stepKeepsNode(page, '-1', () => prev.click())
    const box = (await strip.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await stepKeepsNode(page, '1', () => page.mouse.wheel(0, 120))
    await stepKeepsNode(page, '1', () => page.keyboard.press('ArrowRight'))
    // Round the end: the frame entering from the edge stood beyond it — the step is one place
    await expect(counter(page)).toHaveText('3 / 3')
    await stepKeepsNode(page, '1', () => next.click())
    await expect(counter(page)).toHaveText('1 / 3')
  })

  test('reduced motion: no fade, no moving strip', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE}/works?category=kitchens`)
    await hydrated(page)
    await tileLink(page, 'Кухня').click()
    await expect(dialog(page)).toBeVisible()
    expect(await dialog(page).evaluate((el) => getComputedStyle(el).animationName)).toBe('none')
    await stepKeepsNode(page, '1', () => page.keyboard.press('ArrowRight'), false)
    await expect(counter(page)).toHaveText('2 / 3')
    expect(
      await dialog(page)
        .locator('[data-slide="current"]')
        .evaluate((el) => getComputedStyle(el).transitionDuration),
    ).toBe('0s')
  })

  test('a prefetch in flight holds neither a click on another tile nor a feed change', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    const first = await itemId(page.request, 'kitchens')
    await page.goto(`${BASE}/works?category=kitchens`)
    await hydrated(page)
    const gate = await requestGate(page, `**/work-items/${first}`)
    // Over the first tile long enough for its prefetch (held), then quickly over the others
    await tileLink(page, 'Кухня').hover()
    await expect.poll(() => gate.held()).toBe(1)
    await tileLink(page, SEPARATE.title!).hover()
    await tileLink(page, NO_PRICE.title!).hover()
    await tileLink(page, NO_PRICE.title!).click()
    await expect(dialog(page)).toHaveAccessibleName(NO_PRICE.title!)
    await page.keyboard.press('Escape')
    await expect(dialog(page)).toHaveCount(0)
    // A chip changes the feed while the prefetch is still held
    await page.getByRole('button', { name: /^Санузлы \d+$/ }).click()
    await expect(grid(page).locator('h2')).toHaveText(e2eFeedTitles('bathrooms'))
    expect(gate.held()).toBe(1)
    await gate.release()
  })

  test('home: an item tile leads to its view', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(BASE)
    await hydrated(page)
    const link = page.locator('main a[href*="&item="]').first()
    const href = (await link.getAttribute('href'))!
    expect(href).toMatch(/^\/works\?category=[a-z]+&item=\d+$/)
    await page.goto(`${BASE}${href}`)
    await expect(dialog(page)).toBeVisible()
    await dialog(page).getByRole('link', { name: 'Закрыть' }).click()
    await expect(dialog(page)).toHaveCount(0)
  })

  test('news: a link to an item leads to its view; hidden — the text without a link', async ({
    page,
  }) => {
    await login(page.request)
    const news = E2E_NEWS[1]!
    const { docs } = await (
      await page.request.get(`${BASE}/api/news?where[slug][equals]=${news.slug}&depth=0`)
    ).json()
    const doc = docs[0] as { id: number; body: unknown[] }
    const id = await itemId(page.request, 'kitchens', NO_PRICE.title)
    const label = 'угловая кухня'
    const body = [
      {
        blockType: 'paragraph',
        text: {
          root: {
            type: 'root',
            version: 1,
            format: '',
            indent: 0,
            direction: 'ltr',
            children: [
              {
                type: 'paragraph',
                version: 1,
                format: '',
                indent: 0,
                direction: 'ltr',
                textFormat: 0,
                textStyle: '',
                children: [
                  {
                    type: 'link',
                    version: 3,
                    format: '',
                    indent: 0,
                    direction: 'ltr',
                    fields: { linkType: 'internal', doc: { relationTo: 'items', value: id } },
                    children: [
                      {
                        type: 'text',
                        text: label,
                        format: 0,
                        detail: 0,
                        mode: 'normal',
                        style: '',
                        version: 1,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    ]
    const patch = async (path: string, data: Record<string, unknown>) => {
      // The page's background prefetches (header links: «/», /works) read the works feeds; one in
      // flight across the write would store the old feeds after their tag expired (a race of the
      // data cache, not of this page) — the write comes when the page is quiet
      await page.waitForLoadState('networkidle')
      const response = await page.request.patch(`${BASE}/api/${path}?depth=0`, { data })
      expect(response.ok(), await response.text()).toBe(true)
    }
    const article = `${BASE}/news/${news.slug}`
    try {
      await patch(`news/${doc.id}`, { body, _status: 'published' })
      await page.goto(article)
      const link = page.locator('article').getByRole('link', { name: label })
      await expect(link).toHaveAttribute('href', `/works?category=kitchens&item=${id}`)
      await link.click()
      await expect(dialog(page)).toHaveAccessibleName(NO_PRICE.title!)

      // Hidden: the article keeps the text without the link; shown again — the link is back
      await patch(`items/${id}`, { hidden: true })
      await page.goto(article)
      await expect(page.locator('article').getByText(label)).toBeVisible()
      await expect(page.locator('article').getByRole('link', { name: label })).toHaveCount(0)
      await patch(`items/${id}`, { hidden: false })
      await page.goto(article)
      await expect(page.locator('article').getByRole('link', { name: label })).toBeVisible()
    } finally {
      await patch(`items/${id}`, { hidden: false })
      await patch(`news/${doc.id}`, { body: doc.body, _status: 'published' })
    }
  })
})

const historyLength = (page: Page) => page.evaluate(() => window.history.length)
