import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, type Route } from '@playwright/test'

import { globals } from '../../src/seed/data/globals'
import { e2eEditor } from '../helpers/e2eEditor'
import { E2E_WORKS } from '../helpers/e2eWorks'
import { layoutShifts } from '../helpers/scroll'
import { fingerSwipe } from '../helpers/swipe'

// Project viewer and the project page /works/<slug> (README §6.4 «Просмотр проекта»).
const BASE = 'http://localhost:3000'
const EMPTY_DB = !!process.env.E2E_EMPTY_DB
const HERO = globals(() => 0).worksPage.hero!
const LIST_TITLE = `${HERO.title} — MGS MEBEL`
const HEIGHTS = { 390: 844, 834: 1194, 1440: 900 } as const
const ALL = E2E_WORKS.length
const work = (i: number) => E2E_WORKS[i]!
const href = (i: number) => `/works/${work(i).slug}`
const KITCHENS = E2E_WORKS.filter((w) => w.category === 'kitchens')

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

const dialog = (page: Page) => page.getByRole('dialog')
const cardLink = (page: Page, i: number) => page.locator(`[data-works-feed] a[href="${href(i)}"]`)
/** The viewer has appeared (its fade has ended). */
const shown = async (page: Page) => {
  await expect(dialog(page)).toHaveAttribute('data-state', 'open')
  await expect(dialog(page)).not.toHaveAttribute('data-animating', '')
}
const closed = (page: Page) => expect(dialog(page)).toHaveCount(0)
const showing = async (page: Page, i: number, frame = 0) => {
  await expect(page).toHaveURL(`${BASE}${href(i)}`)
  await expect(dialog(page)).toHaveAttribute('aria-label', work(i).title)
  await expect(dialog(page)).toHaveAttribute('data-frame', String(frame))
}

/** Documents and RSC requests to /works… (no prefetches): the router stays out of it. */
const watchRouter = (page: Page) => {
  const seen: string[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (!url.pathname.startsWith('/works')) return
    const headers = request.headers()
    if (headers['next-router-prefetch']) return
    if (request.resourceType() === 'document' || headers['rsc']) {
      seen.push(`${request.resourceType()} ${url.pathname}${url.search}`)
    }
  })
  return seen
}

/** Holds the feed pages (`loadProjects`); project frames (`loadProject`) pass. */
const pageGate = async (page: Page) => {
  const held: { route: Route; body: string }[] = []
  const bodies: string[] = []
  await page.route('**/works**', async (route) => {
    const request = route.request()
    const body = request.postData() ?? ''
    if (
      request.method() !== 'POST' ||
      !request.headers()['next-action'] ||
      !body.includes('"page"')
    )
      return route.fallback()
    bodies.push(body)
    held.push({ route, body })
  })
  return {
    bodies,
    held: () => held.map(({ body }) => body),
    release: async (match: string) => {
      const out = held.filter(({ body }) => body.includes(match))
      for (const item of out) held.splice(held.indexOf(item), 1)
      await Promise.all(out.map(({ route }) => route.fallback()))
    },
    fail: async () => {
      await Promise.all(held.splice(0).map(({ route }) => route.abort()))
    },
  }
}

/** Opens the viewer from the card `i` of the feed at `url`, scrolled to `y`. */
const openFromFeed = async (page: Page, i: number, url = '/works', y = 0) => {
  await page.goto(`${BASE}${url}`)
  await hydrated(page)
  if (y) await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y)
  await cardLink(page, i).click()
  await shown(page)
}

/** Click in the tap zone at this share of the window's width, in the middle of its height. */
const tap = async (page: Page, share: number) => {
  const box = (await page.locator('.viewer-window').boundingBox())!
  await page.mouse.click(box.x + box.width * share, box.y + box.height * 0.4)
}

/** One trackpad gesture: deltas fading with inertia, 16 ms apart. */
const trackpad = async (page: Page, dir: 1 | -1, events = 30) => {
  await page.mouse.move(200, 300)
  for (let i = 0; i < events; i++) {
    await page.mouse.wheel(0, dir * Math.max(2, 60 - i * 2))
    await page.waitForTimeout(16)
  }
}

/** Expands the description: «ещё», then the text box that scrolls inside. */
const expand = async (page: Page) => {
  await dialog(page).getByRole('button', { name: 'ещё' }).click()
  const text = dialog(page).locator('[data-viewer-scroll]')
  await expect(text).toBeVisible()
  return text
}

/**
 * Runs `body` with a description of project `i` far longer than the bottom block (saved by the
 * editor, put back after).
 */
const withLongDescription = async (page: Page, i: number, body: () => Promise<void>) => {
  const login = () =>
    page.request.post(`${BASE}/api/users/login`, {
      data: { email: e2eEditor.email, password: e2eEditor.password },
    })
  expect((await login()).ok()).toBe(true)
  const { docs } = await (
    await page.request.get(`${BASE}/api/projects?where[slug][equals]=${work(i).slug}&depth=0`)
  ).json()
  const project = docs[0] as { id: number; description: string }
  const save = async (description: string) => {
    const response = await page.request.patch(`${BASE}/api/projects/${project.id}`, {
      data: { description },
    })
    expect(response.ok(), await response.text()).toBe(true)
  }
  try {
    await save(Array.from({ length: 14 }, () => project.description).join(' '))
    // A visitor sees it
    await page.context().clearCookies()
    await body()
  } finally {
    await login()
    await save(project.description)
    await page.context().clearCookies()
  }
}

test.describe('viewer', () => {
  test.skip(EMPTY_DB, 'needs the projects fixture')

  for (const width of [390, 834, 1440] as const) {
    test(`direct visit ${width}: the project page with the viewer open`, async ({ page }) => {
      await page.setViewportSize({ width, height: HEIGHTS[width] })
      const errors = watchConsole(page)
      const response = await page.goto(`${BASE}${href(1)}`)
      expect(response?.status()).toBe(200)
      await hydrated(page)
      await shown(page)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(work(1).title)
      await expect(page.locator('h2', { hasText: HERO.title! })).toHaveCount(1)
      await expect(dialog(page)).toBeFocused()
      await expect(dialog(page).getByText(`2 / ${ALL}`)).toBeVisible()
      await expect(page).toHaveTitle(new RegExp(`^${work(1).title}`))

      // Over the whole page: scroll locked, the rest inert, the header and the dock covered
      // A string: no named helpers in the page (the test runner would wrap them in __name)
      const state = await page.evaluate(`(() => {
        const html = document.documentElement
        const inside = (x, y) => Boolean(document.elementFromPoint(x, y)?.closest('[role="dialog"]'))
        const header = document.querySelector('.header-bar').getBoundingClientRect()
        // The dock's place: its bar may be moved off the screen while hidden
        const dock = { x: innerWidth / 2, y: innerHeight - 40 }
        let stacking = ''
        for (let el = document.getElementById('content').parentElement; el; el = el.parentElement) {
          const s = getComputedStyle(el)
          if (s.zIndex !== 'auto' || s.transform !== 'none' || s.filter !== 'none' || s.isolation === 'isolate')
            stacking += el.tagName + ' '
        }
        return {
          overflow: html.style.overflow,
          overlay: html.dataset.overlay,
          headerInert: document.querySelector('header').closest('[inert]') !== null,
          feedInert: document.querySelector('[data-works-feed]').closest('[inert]') !== null,
          dialogInert: document.querySelector('[role="dialog"]').closest('[inert]') !== null,
          header: inside(header.left + 20, header.top + header.height / 2),
          dock: inside(dock.x, dock.y),
          stacking,
        }
      })()`)
      expect(state).toEqual({
        overflow: 'hidden',
        overlay: 'viewer',
        headerInert: true,
        feedInert: true,
        dialogInert: false,
        header: true,
        dock: true,
        stacking: '',
      })

      // From tablet: a window of 92 % of the height, 9:16, centred. Fixed boxes are measured
      // against their containing block: headless Linux keeps a scrollbar gutter beside it.
      const box = (await page.locator('.viewer-window').boundingBox())!
      const backdrop = (await dialog(page).boundingBox())!
      expect(backdrop.height).toBe(HEIGHTS[width])
      if (width >= 768) {
        expect(box.height).toBeCloseTo(HEIGHTS[width] * 0.92, 0)
        expect(box.width).toBeCloseTo((box.height * 9) / 16, 0)
        expect(box.x + box.width / 2).toBeCloseTo(backdrop.x + backdrop.width / 2, 0)
      } else {
        expect(box).toEqual(backdrop)
      }

      expect(await axe(page)).toEqual([])
      expect(await layoutShifts(page)).toEqual([])
      expect(errors).toEqual([])
    })
  }

  test('the HTML: H1, texts, facts, canonical, breadcrumbs, the marker', async ({ request }) => {
    const html = await (await request.get(`${BASE}${href(1)}`)).text()
    expect(html.match(/<h1[^>]*>[^<]*<\/h1>/g)).toEqual([
      `<h1 class="text-viewer-title">${work(1).title}</h1>`,
    ])
    expect(html).toContain('Комплексный проект под ключ')
    for (const fact of ['37 м²', '4 недели', '5 фото']) expect(html).toContain(`>${fact}<`)
    expect(html).toContain(`<link rel="canonical" href="${BASE}${href(1)}"/>`)
    expect(html).toContain(
      `{"@type":"ListItem","position":3,"name":"${work(1).title}","item":"${BASE}${href(1)}"}`,
    )
    expect(html.match(/<link rel="expect"[^>]*>/g)).toHaveLength(2)
    // The viewer comes first in <main>, its marker right after it
    const main = html.slice(html.indexOf('<main'))
    expect(main.indexOf('role="dialog"')).toBeLessThan(main.indexOf('id="first-screen-end"'))
    expect(main.indexOf('id="first-screen-end"')).toBeLessThan(main.indexOf('data-works-feed'))
  })

  test('without JS: × to the list, the counter and the hint to the neighbours', async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto(`${BASE}${href(11)}`)
    await expect(page.getByRole('link', { name: 'Закрыть' })).toHaveAttribute('href', '/works')
    await expect(page.getByRole('link', { name: /Свайп вверх/ })).toHaveAttribute('href', href(12))
    await expect(
      page.getByRole('link', { name: `Предыдущий проект: ${work(10).title}` }),
    ).toHaveAttribute('href', href(10))
    await page.getByRole('link', { name: /Свайп вверх/ }).click()
    await expect(page).toHaveURL(`${BASE}${href(12)}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(work(12).title)
    await page.getByRole('link', { name: 'Закрыть' }).click()
    await expect(page).toHaveURL(`${BASE}/works`)
    await context.close()
  })

  test('unknown or malformed project: 404, noindex', async ({ page }) => {
    for (const slug of ['net-takogo-proekta', 'Bad_Slug']) {
      const response = await page.goto(`${BASE}/works/${slug}`)
      expect(response?.status()).toBe(404)
      await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached()
      await closed(page)
    }
  })

  test('from the feed: a history entry; back closes with the list, filter and scroll as they were', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const router = watchRouter(page)
    await openFromFeed(page, 7, '/works?category=complex', 400)
    router.length = 0
    const lengthBefore = await page.evaluate(() => history.length)
    await page.goBack()
    await closed(page)
    await page.goForward()
    await showing(page, 7)
    await shown(page)
    expect(await page.evaluate(() => history.length)).toBe(lengthBefore)
    await expect(dialog(page)).toBeFocused()

    await page.goBack()
    await closed(page)
    await expect(page).toHaveURL(`${BASE}/works?category=complex`)
    expect(await page.evaluate(() => Math.round(window.scrollY))).toBe(400)
    await expect(cardLink(page, 7)).toBeFocused()
    await expect(page).toHaveTitle(LIST_TITLE)
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('')
    expect(await page.evaluate(() => document.documentElement.dataset.overlay)).toBeUndefined()
    // Nothing of the page stays inert (the dock keeps its own while hidden)
    await expect(page.locator('div.contents[inert]')).toHaveCount(0)
    expect(router).toEqual([])
  })

  test('from the feed: the URL and one more history entry; × and Esc go back', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE}/works`)
    await hydrated(page)
    const router = watchRouter(page)
    const before = await page.evaluate(() => history.length)
    for (const how of ['×', 'Esc'] as const) {
      await cardLink(page, 2).click()
      await shown(page)
      await showing(page, 2)
      expect(await page.evaluate(() => history.length)).toBe(before + 1)
      await expect(page).toHaveTitle(new RegExp(`^${work(2).title}`))
      if (how === '×') await dialog(page).getByRole('link', { name: 'Закрыть' }).click()
      else await page.keyboard.press('Escape')
      await closed(page)
      await expect(page).toHaveURL(`${BASE}/works`)
      await expect(cardLink(page, 2)).toBeFocused()
      await expect(page).toHaveTitle(LIST_TITLE)
    }
    expect(router).toEqual([])
  })

  test('direct visit: × leaves /works with the feed under it, focus on the card', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${BASE}${href(14)}`)
    await hydrated(page)
    await shown(page)
    const router = watchRouter(page)
    await dialog(page).getByRole('link', { name: 'Закрыть' }).click()
    await closed(page)
    await expect(page).toHaveURL(`${BASE}/works`)
    await expect(cardLink(page, 14)).toBeFocused()
    await expect(cardLink(page, 14)).toBeInViewport()
    await expect(page).toHaveTitle(LIST_TITLE)
    // Pages 1…2 came with the page: the project's page and the one with its next
    await expect(page.locator('[data-works-feed] > li:not([data-skeleton])')).toHaveCount(24)
    expect(router).toEqual([])
  })

  test('tap zones 35 / 65, ← / → frames; after the last frame the next project', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openFromFeed(page, 1)
    const frames = work(1).frames
    await tap(page, 0.8)
    await showing(page, 1, 1)
    await tap(page, 0.3)
    await showing(page, 1, 0)
    // The edge of the zones: 35 % is still «back»
    await tap(page, 0.8)
    await tap(page, 0.34)
    await showing(page, 1, 0)
    await tap(page, 0.36)
    await showing(page, 1, 1)
    for (let f = 1; f < frames - 1; f++) await page.keyboard.press('ArrowRight')
    await showing(page, 1, frames - 1)
    await expect(dialog(page).locator('[aria-hidden] .w-full')).toHaveCount(frames)
    await page.keyboard.press('ArrowRight')
    await showing(page, 2, 0)
    await page.keyboard.press('ArrowLeft')
    await showing(page, 1, 0)
    await expect(dialog(page).getByText(`2 / ${ALL}`)).toBeVisible()
  })

  test('↑ / ↓ projects; ↑ on the first does nothing', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await openFromFeed(page, 0)
    await page.keyboard.press('ArrowUp')
    await page.waitForTimeout(700)
    await showing(page, 0)
    await page.keyboard.press('ArrowDown')
    await showing(page, 1)
    await page.waitForTimeout(700)
    await page.keyboard.press('ArrowDown')
    await showing(page, 2)
    await page.waitForTimeout(700)
    await page.keyboard.press('ArrowUp')
    await showing(page, 1)
  })

  test('wheel: one tick — one project, a trackpad swipe with inertia — one project', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await openFromFeed(page, 0)
    await page.mouse.move(700, 400)
    await page.mouse.wheel(0, 100)
    await showing(page, 1)
    await page.waitForTimeout(700)
    await trackpad(page, 1)
    await page.waitForTimeout(700)
    await showing(page, 2)
    await trackpad(page, -1)
    await page.waitForTimeout(700)
    await showing(page, 1)
    // The page under the viewer never scrolled
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
  })

  test('the counter is the place in the current filter; the filter stays under the viewer', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const gate = await pageGate(page)
    await openFromFeed(page, E2E_WORKS.indexOf(KITCHENS[1]!), '/works?category=kitchens')
    await expect(dialog(page).getByText(`2 / ${KITCHENS.length}`)).toBeVisible()
    await page.keyboard.press('ArrowDown')
    await expect(dialog(page)).toHaveAttribute('aria-label', KITCHENS[2]!.title)
    await expect(dialog(page).getByText(`3 / ${KITCHENS.length}`)).toBeVisible()
    // No page of «все» while the URL has no filter
    expect(gate.bodies.filter((body) => body.includes('"all"'))).toEqual([])
    const cards = await page
      .locator('[data-works-feed] a')
      .evaluateAll((links) => links.map((a) => a.getAttribute('href')))
    await page.goBack()
    await closed(page)
    await expect(page).toHaveURL(`${BASE}/works?category=kitchens`)
    expect(
      await page
        .locator('[data-works-feed] a')
        .evaluateAll((links) => links.map((a) => a.getAttribute('href'))),
    ).toEqual(cards)
  })

  test('near the end of the loaded feed: the next page; a step past it waits for the page', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    const gate = await pageGate(page)
    await openFromFeed(page, 9)
    // Two projects left after the 10th: the next page is asked for (and held)
    await expect.poll(() => gate.held()).toEqual([expect.stringContaining('"page":2')])
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(700)
    await page.keyboard.press('ArrowDown')
    await showing(page, 11)
    await page.waitForTimeout(700)
    // Past the loaded ones: nothing until the page comes, then the 13th
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(300)
    await showing(page, 11)
    await gate.release('"page":2')
    await showing(page, 12)
  })

  test('a step past the loaded feed after a failed page stays; the next gesture tries again', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    const gate = await pageGate(page)
    await openFromFeed(page, 11)
    await expect.poll(() => gate.held().length).toBe(1)
    await page.keyboard.press('ArrowDown')
    await gate.fail()
    await page.waitForTimeout(700)
    await showing(page, 11)
    await page.keyboard.press('ArrowDown')
    await expect.poll(() => gate.held().length).toBe(1)
    await gate.release('"page":2')
    await showing(page, 12)
  })

  test('the last frame of the last project closes; focus on its card', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const last = ALL - 1
    await page.goto(`${BASE}${href(last)}`)
    await hydrated(page)
    await shown(page)
    await expect(dialog(page).getByText(`${ALL} / ${ALL}`)).toBeVisible()
    await expect(dialog(page).getByRole('link', { name: /Свайп вверх/ })).toHaveCount(0)
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(300)
    await showing(page, last)
    for (let f = 1; f < work(last).frames; f++) await page.keyboard.press('ArrowRight')
    await showing(page, last, work(last).frames - 1)
    await page.keyboard.press('ArrowRight')
    await closed(page)
    await expect(page).toHaveURL(`${BASE}/works`)
    await expect(cardLink(page, last)).toBeFocused()
  })

  test('from tablet a click on the backdrop closes', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await openFromFeed(page, 3)
    await page.mouse.click(100, 450)
    await closed(page)
    await expect(page).toHaveURL(`${BASE}/works`)
  })

  test('reduced motion: fade only, no scale', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    const scales = async () => {
      await page.goto(`${BASE}/works`)
      await hydrated(page)
      // A string: no named helpers in the page (the test runner would wrap them in __name)
      await page.evaluate(`
        window.scales = []
        requestAnimationFrame(function sample() {
          const el = document.querySelector('.viewer-window')
          if (el) window.scales.push(getComputedStyle(el).scale)
          if (window.scales.length < 15) requestAnimationFrame(sample)
        })
      `)
      await cardLink(page, 0).click()
      await shown(page)
      return page.evaluate(() => (window as Window & { scales?: string[] }).scales!)
    }
    expect((await scales()).some((s) => s.startsWith('0.9'))).toBe(true)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect(await scales()).toEqual(expect.arrayContaining(['none']))
    expect((await scales()).every((s) => s === 'none')).toBe(true)
  })

  // The expanded description scrolls inside the bottom block: the wheel there scrolls the text.
  test('a long description: «ещё», the wheel scrolls the text, not the projects', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await withLongDescription(page, 4, async () => {
      await openFromFeed(page, 4)
      const text = await expand(page)
      const box = (await text.boundingBox())!
      await page.mouse.move(box.x + 20, box.y + 20)
      await page.mouse.wheel(0, 200)
      await expect.poll(() => text.evaluate((el) => el.scrollTop)).toBeGreaterThan(0)
      await page.waitForTimeout(700)
      await showing(page, 4)
      // The wheel over the frame changes the project as before
      await page.mouse.move(195, 200)
      await page.mouse.wheel(0, 100)
      await showing(page, 5)
      await page.keyboard.press('ArrowUp')
      await page.waitForTimeout(700)
      // Back on the project: collapsed again
      await expect(dialog(page).getByRole('button', { name: 'ещё' })).toBeVisible()
    })
  })

  test.describe('touch', () => {
    test.use({ hasTouch: true, viewport: { width: 390, height: 844 } })

    test('swipe up — next, down — previous, down on the first — close', async ({ page }) => {
      await openFromFeed(page, 0)
      const swipe = (dy: number) => fingerSwipe(page, { x: 195, y: 420, dy })
      await swipe(-200)
      await showing(page, 1)
      await page.waitForTimeout(400)
      await swipe(200)
      await showing(page, 0)
      // A short or sideways move is not a swipe
      await swipe(-50)
      await page.waitForTimeout(300)
      await showing(page, 0)
      await swipe(200)
      await closed(page)
      await expect(page).toHaveURL(`${BASE}/works`)
    })

    test('a swipe in the expanded description scrolls the text, not the projects', async ({
      page,
    }) => {
      await withLongDescription(page, 4, async () => {
        await openFromFeed(page, 4)
        const text = await expand(page)
        const box = (await text.boundingBox())!
        await fingerSwipe(page, { x: box.x + 40, y: box.y + box.height - 20, dy: -150 })
        await expect.poll(() => text.evaluate((el) => el.scrollTop)).toBeGreaterThan(0)
        await page.waitForTimeout(400)
        await showing(page, 4)
        // Outside the text a swipe still changes the project
        await fingerSwipe(page, { x: 195, y: 300, dy: -200 })
        await showing(page, 5)
      })
    })
  })
})

test('a project page on an empty database: 404 @empty', async ({ page }) => {
  test.skip(!EMPTY_DB, 'empty database only')
  const errors = watchConsole(page)
  const response = await page.goto(`${BASE}/works/pokazhu-za-30-sekund-1`)
  expect(response?.status()).toBe(404)
  await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached()
  expect(errors.filter((e) => !e.includes('404'))).toEqual([])
})
