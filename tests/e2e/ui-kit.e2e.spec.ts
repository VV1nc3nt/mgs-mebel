import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const URL = 'http://localhost:3000/ui-kit'
const WIDTHS = [390, 834, 1440] as const
const HIT = 44

// Interactive elements only: containers (role="group") and disabled controls are not targets.
const INTERACTIVE = [
  'a[href]',
  'button',
  'input',
  'select',
  ...['button', 'tab', 'link', 'checkbox', 'radio', 'switch'].map((role) => `[role="${role}"]`),
]
  .map((selector) => `main ${selector}:not([disabled]):not([aria-disabled="true"])`)
  .join(', ')

/** Loads lazy images so screenshots and checks see the final layout. */
async function scrollThrough(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight / 2) {
      window.scrollTo(0, y)
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    window.scrollTo(0, 0)
  })
  await page.waitForLoadState('networkidle')
}

for (const width of WIDTHS) {
  test.describe(`ui-kit ${width}`, () => {
    test.use({ viewport: { width, height: 900 } })

    test('responds 200 with noindex', async ({ page }) => {
      const response = await page.goto(URL)
      expect(response?.status()).toBe(200)
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        'content',
        'noindex, nofollow',
      )
      await expect(page.locator('h1')).toHaveText('UI-kit')
    })

    test('has no axe violations', async ({ page }) => {
      await page.goto(URL)
      await scrollThrough(page)
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
      expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual(
        [],
      )
    })

    test('shows the accent focus ring on every Tab stop', async ({ page }) => {
      await page.goto(URL)
      const count = await page
        .locator(INTERACTIVE)
        .evaluateAll((els) => els.filter((el) => (el as HTMLElement).tabIndex >= 0).length)
      expect(count).toBeGreaterThan(0)
      const ring = () =>
        page.evaluate(() => {
          const el = document.activeElement as HTMLElement
          const style = getComputedStyle(el)
          return `${el.getAttribute('aria-label') ?? el.textContent?.trim()}: ${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}`
        })
      for (let i = 0; i < count; i++) {
        await page.keyboard.press('Tab')
        // Read right away: the ring must not fade in.
        expect(await ring()).toMatch(/: solid 2px rgb\(201, 215, 48\)$/)
      }
    })

    test(`gives every interactive element a ${HIT}×${HIT} hit area`, async ({ page }) => {
      await page.goto(URL)
      await scrollThrough(page)
      const targets = page.locator(INTERACTIVE)
      const total = await targets.count()
      const failures: string[] = []
      for (let i = 0; i < total; i++) {
        const target = targets.nth(i)
        // WCAG 2.5.8: inline links inside a paragraph are exempt.
        const inline = await target.evaluate((el) => el.closest('p') !== null && el.tagName === 'A')
        if (inline || !(await target.isVisible())) continue
        const missed = await target.evaluate((el, hit) => {
          // Centre it: points near the viewport edge would miss for the wrong reason.
          el.scrollIntoView({ block: 'center', inline: 'center' })
          const box = el.getBoundingClientRect()
          const cx = box.left + box.width / 2
          const cy = box.top + box.height / 2
          const half = hit / 2 - 1
          // Edge midpoints of a 44×44 square around the centre: 44 in both axes, which also holds
          // for round buttons (hit testing respects border-radius, so the corners of a circle miss).
          const points = [
            [cx - half, cy],
            [cx + half, cy],
            [cx, cy - half],
            [cx, cy + half],
          ]
          // The ::before extension belongs to the element itself, so hit testing sees it.
          return points.filter(([x, y]) => {
            const hitEl = document.elementFromPoint(x, y)
            return !hitEl || (hitEl !== el && !el.contains(hitEl))
          }).length
        }, HIT)
        if (missed) {
          const label = (await target.getAttribute('aria-label')) ?? (await target.textContent())
          failures.push(`${label?.trim()} (${missed}/4 points outside)`)
        }
      }
      expect(failures).toEqual([])
    })

    test('saves a full-page screenshot', async ({ page }) => {
      await page.goto(URL)
      await scrollThrough(page)
      await page.screenshot({ path: `test-results/ui-kit/ui-kit-${width}.png`, fullPage: true })
    })
  })
}

const isVideoRequest = (url: string) => /\.(mp4|webm)(\?|$)/i.test(url)

test('reduced motion: poster only, no video element and no video requests', async ({ page }) => {
  const videoRequests: string[] = []
  page.on('request', (request) => {
    if (request.resourceType() === 'media' || isVideoRequest(request.url())) {
      videoRequests.push(request.url())
    }
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const response = await page.goto(URL)
  expect(response?.status()).toBe(200)
  await scrollThrough(page)
  await expect(page.locator('video')).toHaveCount(0)
  expect(videoRequests).toEqual([])
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(violations).toEqual([])
})

test('without reduced motion: background videos mount and play', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto(URL)
  const withVideo = page.locator('[data-bg-video]')
  // CI has no seed media: nothing to play, the posters are covered by the test above.
  test.skip((await withVideo.count()) === 0, 'no background video in the database')
  await scrollThrough(page)
  await expect(page.locator('[data-bg-video] video').first()).toBeAttached()
  const hero = page.locator('[data-bg-video] video').first()
  await expect(hero).toHaveJSProperty('muted', true)
  await expect(hero).not.toHaveAttribute('controls')
})
