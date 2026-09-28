import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { globals } from '../../src/seed/data/globals'

const BASE = 'http://localhost:3000'
const { layout } = globals(() => 0)
const LABELS = Object.values(layout.nav).map((item) => item.label)

test.skip(!!process.env.E2E_EMPTY_DB, 'needs tests/helpers/seedChrome.ts data')

const burger = (page: Page) => page.getByRole('button', { name: 'Открыть меню' })
const dialog = (page: Page) => page.getByRole('dialog', { name: 'Меню' })

/** Opens the menu and waits for the whole opening animation (items and bottom block). */
async function openMenu(page: Page) {
  await burger(page).click()
  await expect(dialog(page)).toBeVisible()
  await page.waitForTimeout(1500)
}

/** The menu button (top 20, 40 tall) stays fully visible. */
const Y = 20

const scrollY = (page: Page) => page.evaluate(() => window.scrollY)

/**
 * Scrolls the page to `y`. The header is not sticky, so the offset must keep the menu button on
 * screen: otherwise Playwright scrolls back to it before clicking, as a user would have to.
 */
async function scrollTo(page: Page, y: number) {
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y)
  await expect.poll(() => scrollY(page)).toBe(y)
}

const watchConsole = (page: Page) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.location().url.endsWith('/favicon.ico')) return
    if (message.type() === 'error' || /hydrat/i.test(message.text())) errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))
  return errors
}

for (const width of [390, 834] as const) {
  test.describe(`menu ${width}`, () => {
    test.use({ viewport: { width, height: width === 390 ? 844 : 1112 } })

    for (const [name, path] of [
      ['home', '/'],
      ['salons', '/salons'],
    ] as const) {
      test(`opens on ${path}: focus, labels, axe, screenshot`, async ({ page }) => {
        const errors = watchConsole(page)
        await page.goto(`${BASE}${path}`)
        await expect(burger(page)).toHaveAttribute('aria-expanded', 'false')
        await openMenu(page)

        await expect(dialog(page).getByRole('link', { name: LABELS[0] })).toBeFocused()
        await expect(dialog(page).getByRole('navigation').getByRole('link')).toHaveText(
          LABELS.map((label, i) => new RegExp(`${String(i + 1).padStart(2, '0')}${label}`)),
        )
        if (path === '/salons') {
          await expect(dialog(page).locator('[aria-current="page"]')).toContainText(
            layout.nav.salons.label,
          )
        }
        await page.screenshot({ path: `test-results/menu/${name}-${width}.png` })

        const { violations } = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze()
        expect(
          violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`),
        ).toEqual([])
        expect(errors).toEqual([])
      })
    }
  })
}

test.describe('menu behaviour', () => {
  test.use({ viewport: { width: 390, height: 600 } })

  test('opens with Enter and with Space', async ({ page }) => {
    await page.goto(`${BASE}/salons`)
    await burger(page).focus()
    await page.keyboard.press('Enter')
    await expect(dialog(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog(page)).toHaveCount(0)
    await expect(burger(page)).toBeFocused()
    await page.keyboard.press('Space')
    await expect(dialog(page)).toBeVisible()
  })

  test('Tab and Shift+Tab stay inside the dialog', async ({ page }) => {
    await page.goto(`${BASE}/salons`)
    await openMenu(page)
    const inside = () => page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press('Tab')
      expect(await inside()).toBe(true)
    }
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press('Shift+Tab')
      expect(await inside()).toBe(true)
    }
  })

  test('Esc: focus on the menu button at once, scroll back after the animation', async ({
    page,
  }) => {
    await page.goto(`${BASE}/salons`)
    await scrollTo(page, Y)
    await openMenu(page)
    await page.keyboard.press('Escape')
    // Right after Esc, before the 450ms closing animation: focus is back, the page is still fixed
    const start = await page.evaluate(() => ({
      focus: document.activeElement?.getAttribute('aria-label'),
      locked: document.documentElement.dataset.scrollLocked ?? null,
    }))
    expect(start).toEqual({ focus: 'Открыть меню', locked: '' })
    // End of the animation: unlocked and scrolled back in one go
    await expect(dialog(page)).toHaveCount(0)
    await expect(page.locator('html')).not.toHaveAttribute('data-scroll-locked')
    expect(await scrollY(page)).toBe(Y)
  })

  test('the page under the menu does not scroll and keeps its width', async ({ page }) => {
    await page.goto(`${BASE}/salons`)
    await scrollTo(page, Y)
    const layoutBox = () =>
      page.evaluate(() => {
        const main = document.querySelector('main')!.getBoundingClientRect()
        return { top: main.top, width: document.body.getBoundingClientRect().width }
      })
    const before = await layoutBox()
    await openMenu(page)
    expect(await layoutBox()).toEqual(before)
    await page.mouse.move(200, 300)
    await page.mouse.wheel(0, 600)
    await page.keyboard.press('PageDown')
    await page.waitForTimeout(300)
    expect(await layoutBox()).toEqual(before)
    await page.getByRole('button', { name: 'Закрыть меню' }).click()
    await expect(page.locator('html')).not.toHaveAttribute('data-scroll-locked')
    expect(await scrollY(page)).toBe(Y)
    expect(await layoutBox()).toEqual(before)
  })

  test('a link to the current page closes the menu and keeps the scroll', async ({ page }) => {
    await page.goto(`${BASE}/salons`)
    await scrollTo(page, Y)
    await openMenu(page)
    await dialog(page).getByRole('link', { name: layout.nav.salons.label }).click()
    await expect(dialog(page)).toHaveCount(0)
    await expect(page.locator('html')).not.toHaveAttribute('data-scroll-locked')
    await expect(page).toHaveURL(`${BASE}/salons`)
    expect(await scrollY(page)).toBe(Y)
  })

  test('a link to another page closes the menu and opens it at the top', async ({ page }) => {
    await page.goto(`${BASE}/salons`)
    await scrollTo(page, Y)
    await openMenu(page)
    await dialog(page).getByRole('link', { name: layout.nav.catalogs.label }).click()
    await expect(page).toHaveURL(`${BASE}/catalogs`)
    await expect(dialog(page)).toHaveCount(0)
    await expect(page.locator('html')).not.toHaveAttribute('data-scroll-locked')
    await expect.poll(() => scrollY(page)).toBe(0)
  })

  test('the logo in the menu leads home and closes the menu', async ({ page }) => {
    await page.goto(`${BASE}/salons`)
    await openMenu(page)
    await dialog(page).getByRole('link', { name: 'MGS MEBEL — на главную' }).click()
    await expect(page).toHaveURL(`${BASE}/`)
    await expect(dialog(page)).toHaveCount(0)
  })

  test('reduced motion: a fade, no clip-path animation', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(`${BASE}/salons`)
    await burger(page).click()
    const overlay = page.locator('[role="dialog"] .menu-overlay')
    const style = await overlay.evaluate((el) => {
      const s = getComputedStyle(el)
      return { property: s.transitionProperty, duration: s.transitionDuration, clip: s.clipPath }
    })
    expect(style).toEqual({ property: 'opacity', duration: '0.2s', clip: 'none' })
    const item = page.locator('[role="dialog"] .menu-item').last()
    expect(await item.evaluate((el) => getComputedStyle(el).transitionDelay)).toBe('0s')
  })

  test('closes and unlocks the page at the desktop width', async ({ page }) => {
    await page.setViewportSize({ width: 834, height: 1112 })
    await page.goto(`${BASE}/salons`)
    await openMenu(page)
    await page.setViewportSize({ width: 1280, height: 900 })
    await expect(dialog(page)).toHaveCount(0)
    const lock = await page.evaluate(() => ({
      overflow: document.documentElement.style.overflow,
      position: document.body.style.position,
      locked: document.documentElement.dataset.scrollLocked ?? null,
    }))
    expect(lock).toEqual({ overflow: '', position: '', locked: null })
  })

  test('the closed menu is not in the DOM', async ({ page }) => {
    await page.goto(`${BASE}/salons`)
    await expect(page.locator('#app-menu')).toHaveCount(0)
    await expect(burger(page)).not.toHaveAttribute('aria-controls')
  })
})
