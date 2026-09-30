import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { globals } from '../../src/seed/data/globals'

// The page stubs are shorter than the first screen (0.7·vh); /ui-kit is long enough to scroll.
const URL = 'http://localhost:3000/ui-kit'
const { layout, settings } = globals(() => 0)
const EMPTY_DB = !!process.env.E2E_EMPTY_DB

const dock = (page: Page) => page.locator('.dock')
const toTop = (page: Page) => dock(page).getByRole('button', { name: 'Наверх' })

/** Real wheel input: scroll events with a direction, as a user makes them. */
async function wheel(page: Page, dy: number) {
  await page.mouse.move(100, 300)
  await page.mouse.wheel(0, dy)
}

/** Deep in the page, then a scroll up: the dock shows. */
async function showDock(page: Page) {
  await page.evaluate(() => window.scrollTo({ top: 2500, behavior: 'instant' }))
  await wheel(page, -300)
  await expect(dock(page)).not.toHaveAttribute('data-hidden')
}

test.describe('dock', () => {
  test.skip(EMPTY_DB, 'needs tests/helpers/seedChrome.ts data')

  for (const width of [390, 834, 1440] as const) {
    test(`${width}: shows on scrolling up, axe, screenshot`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      page.on('console', (m) => {
        if (m.location().url.endsWith('/favicon.ico')) return
        if (m.type() === 'error' || /hydrat/i.test(m.text())) errors.push(m.text())
      })
      await page.setViewportSize({ width, height: 900 })
      await page.goto(URL)
      await showDock(page)
      // End of the slide-in
      await expect
        .poll(() => dock(page).evaluate((el) => getComputedStyle(el).transform))
        .toBe('none')
      await expect.poll(() => dock(page).evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
      const box = await dock(page).boundingBox()
      // bottom 16, right 16 (README §5.4)
      expect(Math.round(width - box!.x - box!.width)).toBe(16)
      expect(Math.round(900 - box!.y - box!.height)).toBe(16)
      await page.screenshot({ path: `test-results/dock/dock-${width}.png` })
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
      expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual(
        [],
      )
      expect(errors).toEqual([])
    })
  }

  test.describe('behaviour', () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test('hidden on the first screen and out of the Tab order', async ({ page }) => {
      await page.goto(URL)
      await expect(dock(page)).toHaveAttribute('data-hidden', '')
      await expect(dock(page)).toHaveAttribute('inert', '')
      await toTop(page).evaluate((el) => (el as HTMLElement).focus())
      await expect(toTop(page)).not.toBeFocused()
      // A small scroll up within the first screen does not show it either
      await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'instant' }))
      await wheel(page, -100)
      await expect(dock(page)).toHaveAttribute('data-hidden', '')
    })

    test('hides on scrolling down, shows on scrolling up', async ({ page }) => {
      await page.goto(URL)
      await page.evaluate(() => window.scrollTo({ top: 1500, behavior: 'instant' }))
      await wheel(page, 300)
      await expect(dock(page)).toHaveAttribute('data-hidden', '')
      await wheel(page, -300)
      await expect(dock(page)).not.toHaveAttribute('data-hidden')
      await wheel(page, 300)
      await expect(dock(page)).toHaveAttribute('data-hidden', '')
    })

    test('hidden next to the footer', async ({ page }) => {
      await page.goto(URL)
      await page.evaluate(() =>
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }),
      )
      await wheel(page, -40)
      await expect(page.locator('footer')).toBeInViewport()
      await expect(dock(page)).toHaveAttribute('data-hidden', '')
    })

    test('stays while focused, even when scrolling down', async ({ page }) => {
      await page.goto(URL)
      await showDock(page)
      await toTop(page).focus()
      await wheel(page, 300)
      await page.waitForTimeout(100)
      await expect(dock(page)).not.toHaveAttribute('data-hidden')
    })

    test('«Наверх» scrolls to the top and moves focus to the start of the page', async ({
      page,
    }) => {
      await page.goto(URL)
      await showDock(page)
      await toTop(page).click()
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
      await expect(page.locator('main#content')).toBeFocused()
      await expect(dock(page)).toHaveAttribute('data-hidden', '')
    })

    test('«Спросить» opens WhatsApp in a new tab', async ({ page }) => {
      await page.goto(URL)
      await showDock(page)
      const ask = dock(page).getByRole('link', { name: `${layout.dock.askLabel} в WhatsApp` })
      await expect(ask).toHaveAttribute('href', settings.messengers!.whatsapp!)
      await expect(ask).toHaveAttribute('target', '_blank')
      await expect(ask).toHaveAttribute('rel', 'noopener noreferrer')
      await expect(ask).toHaveText(layout.dock.askLabel)
    })

    test('reduced motion: fades without sliding', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto(URL)
      const style = await dock(page).evaluate((el) => {
        const s = getComputedStyle(el)
        return { transform: s.transform, property: s.transitionProperty }
      })
      expect(style).toEqual({ transform: 'none', property: 'opacity' })
    })
  })
})

test.describe('dock on an empty database @empty', () => {
  test.skip(!EMPTY_DB, 'runs against a fresh database (E2E_EMPTY_DB=1)')

  test('without messengers the dock has only «Наверх»', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(URL)
    await showDock(page)
    await expect(dock(page).getByRole('button', { name: 'Наверх' })).toBeVisible()
    await expect(dock(page).getByRole('link')).toHaveCount(0)
  })
})
