import AxeBuilder from '@axe-core/playwright'
import { expect, test, newConsentContext, type APIRequestContext, type Page } from '../helpers/test'
import { e2eEditor } from '../helpers/e2eEditor'
import { stubMedia, PLAYBACK_ATTR } from '../helpers/video'

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000'
const PROJECT = '/works/kvartira-v-teplykh-tonakh'
const DIALOG = '[role="dialog"][aria-label="Просмотр REELS"]'
const EMPTY = !!process.env.E2E_EMPTY_DB

type Row = {
  id: number
  videos?: number[]
  project?: number
  hidden?: boolean
  slug?: string
  complex?: boolean
}
const docs = async (request: APIRequestContext, collection: string): Promise<Row[]> =>
  (await (await request.get(`${BASE}/api/${collection}?depth=0&limit=100`)).json()).docs
const project = async (request: APIRequestContext) =>
  (await docs(request, 'projects')).find((p) => p.slug === PROJECT.split('/').at(-1))!
const hydrated = (page: Page) =>
  page.waitForFunction(() => document.documentElement.style.getPropertyValue('--header-h') !== '')
const active = (page: Page) => page.locator(`${DIALOG} [data-reel]:not([aria-hidden]) video`)
const end = (page: Page) =>
  page.evaluate(() => (window as unknown as { __e2eMedia: { end(): void } }).__e2eMedia.end())
const key = async (request: APIRequestContext) => {
  const p = await project(request)
  return `p-${p.id}-${p.videos![0]}`
}

test.describe('REELS', () => {
  test.skip(EMPTY, 'Needs the isolated works fixture')
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await stubMedia(page)
  })

  test('SSR contains the open dialog; a normal close link works without JavaScript', async ({
    browser,
    request,
  }) => {
    const reel = await key(request)
    const response = await request.get(`${BASE}${PROJECT}?reel=${reel}`)
    const html = await response.text()
    // Only actual markup before the inline RSC scripts; not a string in a streamed payload.
    expect(html).toMatch(/role="dialog"[^>]*aria-modal="true"[^>]*aria-label="Просмотр REELS"/)
    expect(html).toContain(`href="${PROJECT}" aria-label="Закрыть просмотр REELS"`)
    const context = await newConsentContext(browser, { javaScriptEnabled: false })
    const tab = await context.newPage()
    await tab.goto(`${BASE}${PROJECT}?reel=${reel}`)
    await expect(tab.locator(DIALOG)).toBeVisible()
    await tab.getByRole('link', { name: 'Закрыть просмотр REELS' }).click()
    await expect(tab).toHaveURL(`${BASE}${PROJECT}`)
    await expect(tab.locator(DIALOG)).toHaveCount(0)
    await context.close()
  })

  test('normalizes conflicting, malformed, duplicate, hidden and foreign reel parameters on the server', async ({
    request,
  }) => {
    const reel = await key(request)
    const hidden = (await docs(request, 'projects')).find((p) => p.hidden && p.videos?.length)
    const cases = [
      ['reel=bad&item=1&photo=2', 'category=reels&source=test'],
      [`reel=${reel}&item=1&photo=2`, `category=reels&source=test&reel=${reel}`],
      [`reel=${reel}&reel=${reel}`, 'category=reels&source=test'],
      ...(hidden
        ? [[`reel=p-${hidden.id}-${hidden.videos![0]}`, 'category=reels&source=test']]
        : []),
    ]
    for (const [query, expected] of cases) {
      const response = await request.get(`${BASE}/works?category=reels&source=test&${query}`, {
        maxRedirects: 0,
      })
      expect(response.status()).toBe(307)
      expect(response.headers().location).toBe(`/works?${expected}`)
    }
    const other = (await docs(request, 'projects')).find(
      (p) => !p.hidden && p.slug !== PROJECT.split('/').at(-1) && p.videos?.length,
    )!
    const response = await request.get(
      `${BASE}${PROJECT}?source=test&reel=p-${other.id}-${other.videos![0]}`,
      { maxRedirects: 0 },
    )
    expect(response.status()).toBe(307)
    expect(response.headers().location).toBe(`${PROJECT}?source=test`)
  })

  test('pushes once, replaces while stepping without RSC, and restores Back/Forward and focus', async ({
    page,
  }) => {
    await page.goto(`${BASE}/works?category=reels`)
    await hydrated(page)
    const tile = page.locator('[data-works-grid] a[href*="reel="]').first()
    const href = await tile.getAttribute('href')
    await tile.click()
    await expect(page.locator(DIALOG)).toBeVisible()
    await expect(page).toHaveURL(`${BASE}${href}`)
    const requests: string[] = []
    page.on('request', (req) => {
      if (req.url().includes('_rsc=') || req.headers()['rsc'] || req.headers()['next-action'])
        requests.push(req.url())
    })
    const length = await page.evaluate(() => history.length)
    await page.keyboard.press('ArrowRight')
    await expect(page.locator(DIALOG)).toContainText('2 /')
    expect(await page.evaluate(() => history.length)).toBe(length)
    await page.keyboard.press('ArrowLeft')
    await page.getByRole('link', { name: 'Закрыть просмотр REELS' }).click()
    await expect(page).toHaveURL(`${BASE}/works?category=reels`)
    await expect(tile).toBeFocused()
    await page.goForward()
    await expect(page.locator(DIALOG)).toBeVisible()
    await page.goBack()
    await expect(page.locator(DIALOG)).toHaveCount(0)
    expect(requests).toEqual([])
  })

  test('direct visits and reloads close in place, preserve the filter and focus the matching tile', async ({
    page,
    request,
  }) => {
    const reel = await key(request)
    await page.goto(`${BASE}/works?category=reels&reel=${reel}`)
    await page.reload()
    await hydrated(page)
    const length = await page.evaluate(() => history.length)
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(`${BASE}/works?category=reels`)
    expect(await page.evaluate(() => history.length)).toBe(length)
    await expect(page.locator(`[data-works-grid] a[href$="reel=${reel}"]`)).toBeFocused()
  })

  test('direct project links focus the tile; a preserved non-REELS filter falls back to the heading', async ({
    page,
    request,
  }) => {
    const reel = await key(request)
    await page.goto(`${BASE}${PROJECT}?reel=${reel}`)
    await hydrated(page)
    await page.keyboard.press('Escape')
    await expect(page.locator(`[data-works-grid] a[href$="reel=${reel}"]`)).toBeFocused()
    await page.goto(`${BASE}/works?category=kitchens&reel=${reel}`)
    await hydrated(page)
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(`${BASE}/works?category=kitchens`)
    await expect(page.locator('main h1')).toBeFocused()
  })

  test('one list supplies project chip, reel tiles and viewer count; item reels belong to the project', async ({
    page,
    request,
  }) => {
    const p = await project(request)
    const own = (await docs(request, 'items')).filter(
      (item) => !item.hidden && item.project === p.id,
    )
    const count = new Set(p.videos).size + own.reduce((n, item) => n + new Set(item.videos).size, 0)
    await page.goto(`${BASE}${PROJECT}`)
    await hydrated(page)
    await expect(page.getByRole('link', { name: `REELS · ${count}` })).toBeVisible()
    await expect(page.locator('[data-works-grid] a[href*="reel="]')).toHaveCount(count)
    const item = own.find((row) => row.videos?.length)!
    await page.goto(`${BASE}${PROJECT}?reel=i-${item.id}-${item.videos![0]}`)
    await expect(page.locator(DIALOG)).toBeVisible()
    await expect(page.locator(DIALOG)).toContainText(`/ ${count}`)
    await expect(page.getByRole('dialog', { name: 'Просмотр REELS' })).toHaveCount(1)
    await expect(page.getByRole('dialog').filter({ hasText: 'Стоимость' })).toHaveCount(0)
  })

  test('plays only the current reel, resets the old one, preloads without play, auto advances then closes', async ({
    page,
    request,
  }) => {
    await page.goto(`${BASE}${PROJECT}?reel=${await key(request)}`)
    await expect(active(page)).toHaveAttribute(PLAYBACK_ATTR, 'playing')
    await expect(page.locator('[data-reel-preload]')).not.toHaveAttribute(PLAYBACK_ATTR, 'playing')
    await page.evaluate(() => {
      const video = document.querySelector(
        '[data-reel]:not([aria-hidden]) video',
      ) as HTMLVideoElement
      video.currentTime = 12
      ;(window as unknown as { oldVideo: HTMLVideoElement }).oldVideo = video
    })
    await end(page)
    await expect(page.locator(DIALOG)).toContainText('2 / 3')
    expect(
      await page.evaluate(
        () => (window as unknown as { oldVideo: HTMLVideoElement }).oldVideo.currentTime,
      ),
    ).toBe(0)
    await expect(active(page)).toHaveAttribute(PLAYBACK_ATTR, 'playing')
    await end(page)
    await expect(page.locator(DIALOG)).toContainText('3 / 3')
    await expect(page.getByRole('button', { name: 'Следующий ролик' })).toHaveCount(0)
    await end(page)
    await expect(page.locator(DIALOG)).toHaveCount(0)
    await expect(page).toHaveURL(`${BASE}${PROJECT}`)
  })

  test('focus stays in the dialog; seeking owns arrow keys; pause survives hiding a tab', async ({
    page,
    request,
  }) => {
    await page.goto(`${BASE}${PROJECT}?reel=${await key(request)}`)
    await hydrated(page)
    const close = page.getByRole('link', { name: 'Закрыть просмотр REELS' })
    await expect(close).toBeFocused()
    await expect(page.locator('header').locator('..')).toHaveAttribute('inert', '')
    await page.keyboard.press('Shift+Tab')
    await expect(page.getByRole('button', { name: 'Следующий ролик' })).toBeFocused()
    await page.evaluate(() => {
      const video = document.querySelector(
        '[data-reel]:not([aria-hidden]) video',
      ) as HTMLVideoElement
      video.currentTime = 30
      Object.defineProperty(video, 'duration', { configurable: true, value: 100 })
    })
    await page.getByRole('slider', { name: 'Перемотка' }).focus()
    await page.keyboard.press('ArrowRight')
    expect(await active(page).evaluate((el: HTMLVideoElement) => el.currentTime)).toBe(35)
    await expect(page.locator(DIALOG)).toContainText('1 / 3')
    await page.getByRole('button', { name: 'Пауза', exact: true }).click()
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true })
      document.dispatchEvent(new Event('visibilitychange'))
      Object.defineProperty(document, 'hidden', { configurable: true, value: false })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await expect(active(page)).toHaveAttribute(PLAYBACK_ATTR, 'paused')
    await expect(page.getByRole('slider')).toHaveAttribute('aria-valuenow', '35')
    const result = await new AxeBuilder({ page })
      .include(DIALOG)
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    expect(result.violations).toEqual([])
  })

  test('sound autoplay refusal offers explicit launch; errors offer reload', async ({
    page,
    request,
  }) => {
    await page.goto(`${BASE}${PROJECT}?reel=${await key(request)}`)
    await expect(active(page)).toHaveAttribute(PLAYBACK_ATTR, 'playing')
    await page.getByRole('button', { name: 'Звук выкл' }).click()
    await page.evaluate(() => {
      const original = HTMLMediaElement.prototype.play
      HTMLMediaElement.prototype.play = function () {
        if (!this.muted) return Promise.reject(new DOMException('policy', 'NotAllowedError'))
        return original.call(this)
      }
    })
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('status')).toHaveText(/Не удалось запустить видео автоматически/)
    await page.getByRole('link', { name: 'Закрыть просмотр REELS' }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.locator(DIALOG)).toContainText('3 / 3')
    await active(page).dispatchEvent('error')
    await expect(page.getByRole('status')).toContainText('Не удалось загрузить видео.')
    await expect(page.getByRole('button', { name: 'Повторить загрузку' })).toBeEnabled()
  })

  test('reduced motion keeps manual control and does not advance or animate', async ({
    page,
    request,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(`${BASE}${PROJECT}?reel=${await key(request)}`)
    await expect(active(page)).toHaveAttribute(PLAYBACK_ATTR, 'playing')
    await end(page)
    await expect(page.locator(DIALOG)).toContainText('1 / 3')
    expect(
      await page
        .locator(`${DIALOG} [data-reel]`)
        .first()
        .evaluate((el) => getComputedStyle(el).transitionDuration),
    ).toBe('0s')
    await page.keyboard.press('ArrowRight')
    await expect(page.locator(DIALOG)).toContainText('2 / 3')
    await page.keyboard.press('Escape')
    await expect(page.locator(DIALOG)).toHaveCount(0)
  })

  test('single reel has no navigation; zero reels reject a direct link', async ({
    page,
    request,
  }) => {
    const rows = await docs(request, 'projects')
    const items = await docs(request, 'items')
    const available = rows.filter((p) => p.complex !== false && !p.hidden && p.slug)
    const total = (p: Row) =>
      new Set(p.videos).size +
      items
        .filter((i) => !i.hidden && i.project === p.id)
        .reduce((n, i) => n + new Set(i.videos).size, 0)
    const single = available.find((p) => p.slug === 'kvartira-s-rolikami')!
    await request.post(`${BASE}/api/users/login`, { data: e2eEditor })
    await request.patch(`${BASE}/api/projects/${single.id}`, {
      data: { videos: [single.videos![0]] },
    })
    try {
      await page.goto(`${BASE}/works/${single.slug}?reel=p-${single.id}-${single.videos![0]}`)
      await expect(page.locator(DIALOG)).toContainText('1 / 1')
      await expect(
        page.getByRole('button', { name: /Предыдущий ролик|Следующий ролик/ }),
      ).toHaveCount(0)
      const empty = available.find(
        (p) => total(p) === 0 && items.some((i) => i.project === p.id && !i.hidden),
      )!
      await page.goto(`${BASE}/works/${empty.slug}?reel=p-${single.id}-${single.videos![0]}`)
      await expect(page).toHaveURL(`${BASE}/works/${empty.slug}`)
      await expect(page.locator(DIALOG)).toHaveCount(0)
    } finally {
      await request.patch(`${BASE}/api/projects/${single.id}`, { data: { videos: single.videos } })
    }
  })

  test('touch swipes and progress drags do not also toggle pause', async ({ browser, request }) => {
    const context = await newConsentContext(browser, {
      viewport: { width: 390, height: 844 },
      hasTouch: true,
    })
    const page = await context.newPage()
    await stubMedia(page)
    await page.goto(`${BASE}${PROJECT}?reel=${await key(request)}`)
    await expect(active(page)).toHaveAttribute(PLAYBACK_ATTR, 'playing')
    const client = await context.newCDPSession(page)
    const swipe = async (x1: number, y1: number, x2: number, y2: number) => {
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: x1, y: y1 }],
      })
      for (let step = 1; step <= 8; step++)
        await client.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x: x1 + ((x2 - x1) * step) / 8, y: y1 + ((y2 - y1) * step) / 8 }],
        })
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    }
    await swipe(280, 350, 100, 350)
    await expect(page.locator(DIALOG)).toContainText('2 / 3')
    await expect(active(page)).toHaveAttribute(PLAYBACK_ATTR, 'playing')
    await page.evaluate(() => {
      const video = document.querySelector(
        '[data-reel]:not([aria-hidden]) video',
      ) as HTMLVideoElement
      Object.defineProperty(video, 'duration', { configurable: true, value: 100 })
    })
    await page.locator(`${DIALOG} [data-reel]`).evaluateAll(async (elements) => {
      await Promise.all(
        elements
          .flatMap((el) => el.getAnimations())
          .map((animation) => animation.finished.catch(() => {})),
      )
    })
    const rect = (await page.getByRole('slider').boundingBox())!
    await swipe(
      rect.x + rect.width * 0.2,
      rect.y + rect.height / 2,
      rect.x + rect.width * 0.8,
      rect.y + rect.height / 2,
    )
    await expect(page.locator(DIALOG)).toContainText('2 / 3')
    await expect(active(page)).toHaveAttribute(PLAYBACK_ATTR, 'playing')
    expect(
      await active(page).evaluate((video: HTMLVideoElement) => video.currentTime),
    ).toBeGreaterThan(70)
    await swipe(190, 300, 190, 480)
    await expect(page.locator(DIALOG)).toHaveCount(0)
    await context.close()
  })

  for (const width of [390, 834, 1440])
    test(`layout ${width}: full frame, no overflow, screenshot`, async ({
      page,
      request,
    }, info) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 })
      await page.goto(`${BASE}${PROJECT}?reel=${await key(request)}`)
      await expect(active(page)).toHaveAttribute(PLAYBACK_ATTR, 'playing')
      await expect(active(page)).toHaveCSS('object-fit', 'contain')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      await page.screenshot({ path: info.outputPath(`reels-${width}.png`) })
    })
})

// A playable recording exercises native decode/playback as well as the deterministic policy stubs.
// It is generated in Chromium, with no encoder tooling or production media changes.
test('native landscape video plays inline, pauses, and fits the portrait stage at all three widths', async ({
  page,
  request,
}, info) => {
  test.skip(EMPTY, 'Needs the isolated works fixture')
  const bytes = await page.evaluate(async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 360
    const context = canvas.getContext('2d')!
    const stream = canvas.captureStream(20)
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
    const chunks: Blob[] = []
    recorder.ondataavailable = (event) => chunks.push(event.data)
    const done = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve()
    })
    recorder.start()
    let frame = 0
    const paint = () => {
      context.fillStyle = '#c9d730'
      context.fillRect(0, 0, 640, 360)
      context.fillStyle = '#141413'
      context.font = 'bold 38px sans-serif'
      context.fillText('REELS · 16:9', 150, 180)
      context.fillRect(20 + (frame++ % 10) * 3, 20, 40, 40)
      context.fillRect(580, 300, 40, 40)
    }
    paint()
    const timer = setInterval(paint, 50)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    recorder.stop()
    clearInterval(timer)
    await done
    stream.getTracks().forEach((track) => track.stop())
    return [...new Uint8Array(await new Blob(chunks, { type: 'video/webm' }).arrayBuffer())]
  })
  await page.route('**/*.mp4', (route) =>
    route.fulfill({ body: Buffer.from(bytes), contentType: 'video/webm' }),
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const width of [390, 834, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 })
    await page.goto(`${BASE}${PROJECT}?reel=${await key(request)}`)
    await expect
      .poll(() => active(page).evaluate((video: HTMLVideoElement) => video.currentTime))
      .toBeGreaterThan(0.05)
    await page.getByRole('button', { name: 'Пауза', exact: true }).click()
    expect(await active(page).evaluate((video: HTMLVideoElement) => video.paused)).toBe(true)
    await expect(active(page)).toHaveJSProperty('videoWidth', 640)
    await expect(active(page)).toHaveJSProperty('videoHeight', 360)
    await expect(active(page)).toHaveJSProperty('playsInline', true)
    await expect(active(page)).toHaveCSS('object-fit', 'contain')
    await page.screenshot({ path: info.outputPath(`reels-native-${width}.png`) })
  }
})
