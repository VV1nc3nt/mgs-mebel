import AxeBuilder from '@axe-core/playwright'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

import { globals } from '../../src/seed/data/globals'
import { e2eEditor, e2eManager } from '../helpers/e2eEditor'
import { E2E_WORKS } from '../helpers/e2eWorks'
import { layoutShifts } from '../helpers/scroll'
import { fingerSwipe } from '../helpers/swipe'
import { PLAYBACK_ATTR, stubMedia } from '../helpers/video'

// Project viewer, PR c (README §6.4): «Поделиться» in the right rail, the CTA «Хочу такой же
// проект» with the messenger choice opened in place over the frame, the home previews to the
// project page, the ItemList of /works.
const BASE = 'http://localhost:3000'
const EMPTY_DB = !!process.env.E2E_EMPTY_DB
const CTA = globals(() => 0).worksPage.viewer!.ctaLabel!
const COPIED = 'Ссылка скопирована'
const HEIGHTS = { 390: 844, 834: 1194, 1440: 900 } as const
const work = (i: number) => E2E_WORKS[i]!
const href = (i: number) => `/works/${work(i).slug}`
const MULTI = E2E_WORKS.findIndex((w) => w.frames > 1)
const VIDEO = E2E_WORKS.findIndex((w) => w.video)
const LONGEST = E2E_WORKS.reduce(
  (longest, w, i) => (w.slug.length > work(longest).slug.length ? i : longest),
  0,
)

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
const shown = async (page: Page) => {
  await expect(dialog(page)).toHaveAttribute('data-state', 'open')
  await expect(dialog(page)).not.toHaveAttribute('data-animating', '')
}
/** A direct visit to the project page `i`, the viewer shown. */
const visit = async (page: Page, i: number) => {
  const response = await page.goto(`${BASE}${href(i)}`)
  expect(response?.status()).toBe(200)
  await hydrated(page)
  await shown(page)
}
const shareButton = (page: Page) => dialog(page).getByRole('button', { name: 'Поделиться' })
// Hidden statuses too (getByRole leaves them out)
const status = (page: Page) => dialog(page).locator('[role=status]')
const ctaButton = (page: Page) =>
  dialog(page).getByRole('button', { name: `${CTA} — выбрать мессенджер` })
const choice = (page: Page) => dialog(page).getByRole('group', { name: 'Выбрать мессенджер' })
const choiceOpen = (page: Page) =>
  expect(dialog(page).getByRole('button', { name: 'Закрыть выбор мессенджера' })).toBeVisible()
const choiceClosed = (page: Page) =>
  expect(ctaButton(page)).toHaveAttribute('aria-expanded', 'false')
/** The open animation of the choice has ended (clicks on a moving cell retry and scroll). */
// Polled: a transition replaced mid-way rejects its `finished` (AbortError), a slow CPU does that
const settled = (page: Page) =>
  expect
    .poll(() =>
      choice(page).evaluate(
        (el) =>
          [el, ...el.querySelectorAll('*')].filter((node) =>
            node.getAnimations().some((a) => a.playState === 'running'),
          ).length,
      ),
    )
    .toBe(0)

/** Opens the choice of the CTA with the mouse, at the centre of the button. */
const openChoice = async (page: Page) => {
  const box = (await ctaButton(page).boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await choiceOpen(page)
  await settled(page)
}

/** Every messenger cell is inside the viewer's window and the viewport, and takes the clicks. */
const cellsReachable = (page: Page) =>
  dialog(page).evaluate((d) => {
    const win = d.querySelector('.viewer-window')!.getBoundingClientRect()
    const cells = [...d.querySelectorAll<HTMLElement>('[role=group] a')]
    return cells.map((a) => {
      const b = a.getBoundingClientRect()
      const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)
      return {
        inWindow:
          b.top >= win.top - 0.5 &&
          b.bottom <= win.bottom + 0.5 &&
          b.left >= win.left - 0.5 &&
          b.right <= win.right + 0.5,
        inViewport: b.top >= 0 && b.bottom <= innerHeight && b.left >= 0 && b.right <= innerWidth,
        hit: a.contains(hit),
      }
    })
  })

type Box = {
  top: number
  right: number
  bottom: number
  left: number
  width: number
  height: number
}

/**
 * Boxes of elements of the dialog by selector (the first match each). No named functions inside
 * the evaluate: the e2e runner would wrap them in `__name`, unknown in the page.
 */
const rects = async <K extends string>(page: Page, selectors: Record<K, string>) =>
  Object.fromEntries(
    await dialog(page).evaluate(
      (d, entries) =>
        entries.map(([key, selector]) => {
          const b = d.querySelector(selector)!.getBoundingClientRect()
          const box = {
            top: b.top,
            right: b.right,
            bottom: b.bottom,
            left: b.left,
            width: b.width,
            height: b.height,
          }
          return [key, box] as const
        }),
      Object.entries(selectors) as [K, string][],
    ),
  ) as Record<K, Box>

const RAIL = {
  window: '.viewer-window',
  share: '[role=status] + button',
  circle: '[role=status] + button > span',
  status: '[role=status]',
  close: '[aria-label="Закрыть"]',
  zone: '[aria-label="Следующий кадр"]',
}

/** Rectangles of the viewer's parts that must not move when the choice opens. */
const parts = async (page: Page) => {
  const boxes = await rects(page, {
    window: '.viewer-window',
    title: 'h1, h2',
    share: RAIL.share,
    zone: RAIL.zone,
    frame: '[data-viewer-frame]',
  })
  return Object.fromEntries(
    Object.entries(boxes).map(([key, b]) => [
      key,
      [b.left, b.top, b.width, b.height].map((v) => Math.round(v)),
    ]),
  )
}

const login = async (request: APIRequestContext, user: { email: string; password: string }) => {
  const response = await request.post(`${BASE}/api/users/login`, {
    data: { email: user.email, password: user.password },
  })
  expect(response.ok()).toBe(true)
}

/** The published worksPage with another CTA label, back in `finally`. */
const withCtaLabel = async (page: Page, label: string, body: () => Promise<void>) => {
  await login(page.request, e2eEditor)
  const url = `${BASE}/api/globals/worksPage?depth=0`
  const published = await (await page.request.get(`${url}&draft=false`)).json()
  const save = async (ctaLabel: string | null) => {
    const response = await page.request.post(url, {
      data: { ...published, viewer: { ...published.viewer, ctaLabel }, _status: 'published' },
    })
    expect(response.ok(), await response.text()).toBe(true)
  }
  try {
    await save(label)
    await page.context().clearCookies()
    await body()
  } finally {
    await login(page.request, e2eEditor)
    await save(published.viewer?.ctaLabel ?? null)
    await page.context().clearCookies()
  }
}

/** settings without messengers, back in `finally`. */
const withoutMessengers = async (page: Page, body: () => Promise<void>) => {
  await login(page.request, e2eManager)
  const url = `${BASE}/api/globals/settings?depth=0`
  const { messengers } = await (await page.request.get(url)).json()
  const save = async (value: unknown) => {
    const response = await page.request.post(url, { data: { messengers: value } })
    expect(response.ok(), await response.text()).toBe(true)
  }
  try {
    await save({ max: null, telegram: null, whatsapp: null })
    await page.context().clearCookies()
    await body()
  } finally {
    await login(page.request, e2eManager)
    await save(messengers)
    await page.context().clearCookies()
  }
}

/** A project whose description fills the bottom block (the PATCH of viewer.e2e), back after. */
const withLongDescription = async (page: Page, i: number, body: () => Promise<void>) => {
  await login(page.request, e2eEditor)
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
    await page.context().clearCookies()
    await body()
  } finally {
    await login(page.request, e2eEditor)
    await save(project.description)
    await page.context().clearCookies()
  }
}

/** navigator.share replaced: calls recorded, the answer chosen by `mode`. */
const stubShare = (page: Page, mode: 'resolve' | 'abort' | 'none') =>
  page.addInitScript({
    // A string, not a function: the e2e runner would wrap named functions in `__name`
    content: `
      window.__shared = []
      if (${JSON.stringify(mode)} === 'none') {
        delete Navigator.prototype.share
        delete Navigator.prototype.canShare
      } else {
        Object.defineProperty(Navigator.prototype, 'share', {
          configurable: true,
          value(data) {
            window.__shared.push(data)
            return ${JSON.stringify(mode)} === 'abort'
              ? Promise.reject(new DOMException('closed', 'AbortError'))
              : Promise.resolve()
          },
        })
        Object.defineProperty(Navigator.prototype, 'canShare', {
          configurable: true,
          value() {
            return true
          },
        })
      }
    `,
  })
const shared = (page: Page) =>
  page.evaluate(() => (window as unknown as { __shared: unknown[] }).__shared)
const canonical = (page: Page) => page.locator('link[rel="canonical"]').getAttribute('href')

test.describe('viewer: share and CTA', () => {
  test.skip(EMPTY_DB, 'needs the projects fixture')

  for (const width of [390, 834, 1440] as const) {
    test(`${width}: the rail with «Поделиться» and the CTA; axe, console, no shifts`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: HEIGHTS[width] })
      const errors = watchConsole(page)
      await visit(page, 1)
      await expect(shareButton(page)).toBeVisible()
      await expect(ctaButton(page)).toBeVisible()
      expect(Math.round((await ctaButton(page).boundingBox())!.height)).toBe(52)
      const { window: win, share, circle, close, zone } = await rects(page, RAIL)
      const geo = {
        right: win.right - share.right,
        circle: circle.width,
        hit: [share.width, share.height],
        belowHeader: share.top - close.bottom,
        inZone: share.bottom <= zone.bottom && share.top >= zone.top,
      }
      // 12 from the right edge, as × above it; the circle 36, the press area ≥ 44
      expect(geo.right).toBeCloseTo(12, 0)
      expect(geo.circle).toBeCloseTo(36, 0)
      expect(Math.min(...geo.hit)).toBeGreaterThanOrEqual(44)
      expect(geo.belowHeader).toBeGreaterThan(0)
      expect(geo.inZone).toBe(true)
      expect(await axe(page)).toEqual([])
      expect(await layoutShifts(page)).toEqual([])
      expect(errors).toEqual([])
    })
  }

  test('390×664: the tap zones are taller than the rail with its offset, the rail under the header', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 664 })
    await visit(page, 1)
    const { share, zone, close } = await rects(page, RAIL)
    const geo = {
      zone: zone.height,
      rail: share.height,
      gap: zone.bottom - share.bottom,
      top: share.top - close.bottom,
    }
    expect(geo.gap).toBeCloseTo(12, 0)
    expect(geo.zone).toBeGreaterThanOrEqual(geo.rail + geo.gap)
    expect(geo.top).toBeGreaterThan(0)
    await expect(ctaButton(page)).toBeVisible()
    expect(Math.round((await ctaButton(page).boundingBox())!.height)).toBe(52)
  })

  test('share: the title and the absolute project link, no text; the frame stays', async ({
    page,
  }) => {
    await stubShare(page, 'resolve')
    await visit(page, MULTI)
    await shareButton(page).click()
    await expect.poll(() => shared(page)).toHaveLength(1)
    const [data] = (await shared(page)) as Record<string, string>[]
    expect(Object.keys(data!).sort()).toEqual(['title', 'url'])
    expect(data!.title).toBe(work(MULTI).title)
    expect(data!.url).toBe(await canonical(page))
    expect(new URL(data!.url).pathname).toBe(href(MULTI))
    await expect(dialog(page)).toHaveAttribute('data-frame', '0')
    await expect(status(page)).toBeHidden()
  })

  test('share closed by the person: no status, no clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await stubShare(page, 'abort')
    await visit(page, 1)
    await page.evaluate(() => navigator.clipboard.writeText('before'))
    await shareButton(page).click()
    await expect.poll(() => shared(page)).toHaveLength(1)
    await page.waitForTimeout(300)
    await expect(status(page)).toBeHidden()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('before')
  })

  test('no share sheet: the link to the clipboard, «Ссылка скопирована» shows and goes', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await stubShare(page, 'none')
    await visit(page, MULTI)
    await shareButton(page).click()
    await expect(status(page)).toBeVisible()
    await expect(status(page)).toHaveText(COPIED)
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(await canonical(page))
    await expect(dialog(page)).toHaveAttribute('data-frame', '0')
    // --share-status-time: 2 s, then the fade
    await expect(status(page)).toBeHidden({ timeout: 4000 })
    await expect(dialog(page)).toBeVisible()
  })

  test('390, the longest slug: the clipboard refuses — the link itself, inside the window', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await stubShare(page, 'none')
    await page.addInitScript({
      content: `
        Object.defineProperty(Navigator.prototype, 'clipboard', {
          configurable: true,
          get() {
            return {
              writeText() {
                return Promise.reject(new DOMException('no', 'NotAllowedError'))
              },
            }
          },
        })
      `,
    })
    await visit(page, LONGEST)
    await shareButton(page).click()
    await expect(status(page)).toHaveText((await canonical(page))!)
    // Kept: there to be copied by hand
    await page.waitForTimeout(2500)
    await expect(status(page)).toBeVisible()
    const { window: win, status: s, share: b } = await rects(page, RAIL)
    const geo = { left: s.left - win.left, right: b.left - s.right, top: s.top - win.top }
    expect(geo.left).toBeGreaterThanOrEqual(12 - 0.5)
    expect(geo.right).toBeGreaterThanOrEqual(12 - 0.5)
    expect(geo.top).toBeGreaterThan(0)
    expect(await layoutShifts(page)).toEqual([])
  })

  test('CTA: the choice opens over the frame; Esc closes only it, focus back on the CTA', async ({
    page,
  }) => {
    await visit(page, MULTI)
    await expect(ctaButton(page)).toContainText(CTA)
    // From the keyboard: focus on the first messenger
    await ctaButton(page).focus()
    await page.keyboard.press('Enter')
    await choiceOpen(page)
    await expect(choice(page).getByRole('link').first()).toBeFocused()
    await settled(page)
    expect(await cellsReachable(page)).toEqual(
      Array.from({ length: 3 }, () => ({ inWindow: true, inViewport: true, hit: true })),
    )
    // The viewer's keys wait: ↓ does not step to the next project, → moves in the choice
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowRight')
    await expect(page).toHaveURL(`${BASE}${href(MULTI)}`)
    await expect(dialog(page)).toHaveAttribute('data-frame', '0')
    await page.keyboard.press('Escape')
    await choiceClosed(page)
    await expect(dialog(page)).toBeVisible()
    await expect(page).toHaveURL(`${BASE}${href(MULTI)}`)
    await expect(ctaButton(page)).toBeFocused()
    // Closed, the keys are the viewer's again
    await page.keyboard.press('ArrowRight')
    await expect(dialog(page)).toHaveAttribute('data-frame', '1')
  })

  test('CTA: a tap that closes the choice does not step; the next one does', async ({ page }) => {
    await visit(page, MULTI)
    await openChoice(page)
    const box = (await page.locator('.viewer-window').boundingBox())!
    const tap = () => page.mouse.click(box.x + box.width * 0.8, box.y + box.height * 0.3)
    await tap()
    await choiceClosed(page)
    await expect(dialog(page)).toHaveAttribute('data-frame', '0')
    await tap()
    await expect(dialog(page)).toHaveAttribute('data-frame', '1')
  })

  test('CTA: the wheel waits while the choice is open', async ({ page }) => {
    await visit(page, 1)
    await openChoice(page)
    await page.mouse.move(200, 200)
    await page.mouse.wheel(0, 200)
    await page.waitForTimeout(700)
    await expect(page).toHaveURL(`${BASE}${href(1)}`)
  })

  test('CTA: the video pauses while the choice is open and goes on after it', async ({ page }) => {
    await stubMedia(page)
    await visit(page, VIDEO)
    const video = dialog(page).locator('video')
    await expect(video).toHaveAttribute(PLAYBACK_ATTR, 'playing')
    await openChoice(page)
    await expect(video).toHaveAttribute(PLAYBACK_ATTR, 'paused')
    await page.keyboard.press('Escape')
    await choiceClosed(page)
    await expect(video).toHaveAttribute(PLAYBACK_ATTR, 'playing')
    await expect(video).toHaveCount(1)
  })

  test('CTA: «Назад» with the choice open closes the viewer and the choice, inert is gone', async ({
    page,
  }) => {
    await page.goto(`${BASE}/works`)
    await hydrated(page)
    await page.locator(`[data-works-feed] a[href="${href(1)}"]`).click()
    await shown(page)
    await openChoice(page)
    await page.goBack()
    await expect(dialog(page)).toHaveCount(0)
    await expect(page).toHaveURL(`${BASE}/works`)
    // The page is live again: no overlay, the header and the feed out of inert
    expect(
      await page.evaluate(() => ({
        overlay: document.documentElement.dataset.overlay ?? null,
        header: document.querySelector('header')!.closest('[inert]') === null,
        feed: document.querySelector('[data-works-feed]')!.closest('[inert]') === null,
        choice: document.querySelectorAll('[aria-label="Закрыть выбор мессенджера"]').length,
      })),
    ).toEqual({ overlay: null, header: true, feed: true, choice: 0 })
  })

  for (const [width, height] of [
    [390, 664],
    [834, 1194],
  ] as const) {
    test(`${width}×${height}, the description expanded: the open choice is whole, nothing moves`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height })
      await withLongDescription(page, 4, async () => {
        await visit(page, 4)
        await dialog(page).getByRole('button', { name: 'ещё' }).click()
        await expect(dialog(page).locator('[data-viewer-scroll]')).toBeVisible()
        const before = await parts(page)
        await openChoice(page)
        expect(await cellsReachable(page)).toEqual(
          Array.from({ length: 3 }, () => ({ inWindow: true, inViewport: true, hit: true })),
        )
        expect(await parts(page)).toEqual(before)
        expect(await layoutShifts(page)).toEqual([])
      })
    })
  }

  test.describe('touch', () => {
    test.use({ hasTouch: true, viewport: { width: 390, height: 844 } })

    test('a swipe that starts with the choice open only closes it; the next one steps', async ({
      page,
    }) => {
      await visit(page, 1)
      await openChoice(page)
      const swipe = () => fingerSwipe(page, { x: 195, y: 420, dy: -200 })
      await swipe()
      await choiceClosed(page)
      await page.waitForTimeout(400)
      await expect(page).toHaveURL(`${BASE}${href(1)}`)
      await swipe()
      await expect(page).toHaveURL(`${BASE}${href(2)}`)
    })
  })

  test('no CTA label in worksPage: no button, no gap', async ({ page }) => {
    await withCtaLabel(page, '', async () => {
      await visit(page, 1)
      await expect(dialog(page).getByRole('button', { name: /выбрать мессенджер/ })).toHaveCount(0)
      await expect(dialog(page).getByRole('link', { name: new RegExp(CTA) })).toHaveCount(0)
      await expect(shareButton(page)).toBeVisible()
    })
    await visit(page, 1)
    await expect(ctaButton(page)).toBeVisible()
  })

  test('no messengers in settings: no CTA', async ({ page }) => {
    await withoutMessengers(page, async () => {
      await visit(page, 1)
      await expect(dialog(page).getByText(CTA)).toHaveCount(0)
    })
    await visit(page, 1)
    await expect(ctaButton(page)).toBeVisible()
  })

  test('home previews open the project page; × leaves to /works', async ({ page }) => {
    await page.goto(`${BASE}/`)
    await hydrated(page)
    const preview = page
      .locator('#home-works-title')
      .locator('xpath=ancestor::section[1]')
      .locator('a[href^="/works/"]:visible')
      .first()
    const target = (await preview.getAttribute('href'))!
    expect(target).toMatch(/^\/works\/[a-z0-9-]+$/)
    const w = E2E_WORKS.find((item) => `/works/${item.slug}` === target)!
    expect(w).toBeTruthy()
    expect((await page.request.get(`${BASE}${target}`)).status()).toBe(200)
    await preview.scrollIntoViewIfNeeded()
    await preview.click()
    await expect(page).toHaveURL(`${BASE}${target}`)
    await shown(page)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(w.title)
    await dialog(page).getByRole('link', { name: 'Закрыть' }).click()
    await expect(page).toHaveURL(`${BASE}/works`)
    await expect(dialog(page)).toHaveCount(0)
  })

  test('/works: ItemList of every project in the feed order, the same with a filter', async ({
    request,
  }) => {
    const itemList = async (path: string) => {
      const response = await request.get(`${BASE}${path}`)
      expect(response.status()).toBe(200)
      const html = await response.text()
      const lists = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)]
        .map((m) => JSON.parse(m[1]!))
        .filter((data) => data['@type'] === 'ItemList')
      expect(lists).toHaveLength(1)
      return lists[0] as { itemListElement: { position: number; name: string; url: string }[] }
    }
    const all = await itemList('/works')
    expect(all.itemListElement).toHaveLength(E2E_WORKS.length)
    all.itemListElement.forEach((item, i) => {
      expect(item.position).toBe(i + 1)
      expect(item.name).toBe(work(i).title)
      expect(new URL(item.url).pathname).toBe(href(i))
      expect(item.url).toMatch(/^https?:\/\//)
    })
    expect(await itemList('/works?category=kitchens')).toEqual(all)
    // The project page has its breadcrumbs, not the list
    const page = await (await request.get(`${BASE}${href(1)}`)).text()
    expect(page).not.toContain('"ItemList"')
  })

  test('/ui-kit: «Поделиться» on the glass and both statuses', async ({ page }) => {
    await page.goto(`${BASE}/ui-kit`)
    const section = page.locator('section', {
      has: page.getByRole('heading', { name: 'Поделиться' }),
    })
    await expect(section.getByRole('button', { name: 'Поделиться' })).toHaveCount(2)
    await expect(section.getByRole('status')).toHaveCount(2)
    await expect(section.getByRole('status').first()).toHaveText(COPIED)
    await expect(section.getByRole('status').last()).toContainText('/works/')
  })
})

test.describe('viewer share on an empty database @empty', () => {
  test.skip(!EMPTY_DB, 'runs against a fresh database (E2E_EMPTY_DB=1)')

  test('/works without projects: no ItemList', async ({ request }) => {
    const response = await request.get(`${BASE}/works`)
    expect(response.status()).toBe(200)
    expect(await response.text()).not.toContain('"ItemList"')
  })
})
