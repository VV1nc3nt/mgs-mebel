import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { globals } from '../../src/seed/data/globals'
import { motionEnded } from '../helpers/motion'
import { settle, tallPage, wheel } from '../helpers/scroll'

// «О нас» in its real context: hero on the first screen, long enough to scroll with the
// seedHome data. On an empty database it is short, so the @empty check of the dock's content
// stays on /ui-kit.
const URL = 'http://localhost:3000/about'
const UI_KIT = 'http://localhost:3000/ui-kit'
const { layout, settings } = globals(() => 0)
const EMPTY_DB = !!process.env.E2E_EMPTY_DB

const dock = (page: Page) => page.locator('.dock')
const toTop = (page: Page) => dock(page).getByRole('button', { name: 'Наверх' })
const ask = (page: Page) => dock(page).locator('button[aria-expanded]')
const logos = (page: Page) =>
  dock(page).getByRole('group', { name: 'Спросить в мессенджере' }).getByRole('link')

async function expectNoAxeViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([])
}

/** The dock on screen with the choice open by a pointer click. */
async function openChoice(page: Page) {
  await page.goto(URL)
  await showDock(page)
  await ask(page).click()
  await expect(dock(page)).toHaveAttribute('data-open', '')
  // A click on a logo while it still moves would make Playwright scroll, closing the choice
  await motionEnded(dock(page))
}

/**
 * Jumps to the middle of the page: past the first screen, the footer out of view and room for
 * a 300 wheel either way. The jump itself is a scroll down, so the dock stays hidden here.
 */
async function scrollToMiddle(page: Page) {
  // Room for it whatever the length of the page content
  await tallPage(page)
  await settle(page)
  const top = await page.evaluate(() => {
    const vh = window.innerHeight
    const footer = document.querySelector('footer')!.getBoundingClientRect().top + window.scrollY
    // First screen: 0.7·vh; the footer counts as visible 40 above the viewport bottom
    const min = 0.7 * vh + 300
    const max = footer - vh - 40 - 300
    if (max < min) throw new Error(`page too short for the dock checks: ${min}…${max}`)
    return Math.round((min + max) / 2)
  })
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top)
  await settle(page)
}

/**
 * The middle of the page, then a scroll up: the dock shows. Showing also proves the dock's
 * scroll listener is live (hydrated) before a test goes on wheeling.
 */
async function showDock(page: Page) {
  await scrollToMiddle(page)
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
      // bottom 16, right 16 (README §5.4) from the area fixed elements are placed in. A probe
      // measures it: a reserved scrollbar gutter (headless Linux hides the bar, keeps the gutter)
      // is not part of it, while clientWidth may still include it.
      const gap = await page.evaluate(() => {
        const probe = document.body.appendChild(document.createElement('div'))
        probe.style.cssText = 'position:fixed;inset:0;visibility:hidden'
        const area = probe.getBoundingClientRect()
        probe.remove()
        const box = document.querySelector('.dock')!.getBoundingClientRect()
        return {
          right: Math.round(area.right - box.right),
          bottom: Math.round(area.bottom - box.bottom),
        }
      })
      expect(gap).toEqual({ right: 16, bottom: 16 })
      await page.screenshot({ path: `test-results/dock/dock-${width}.png` })
      await expectNoAxeViolations(page)

      // The choice open: MAX · Telegram · WhatsApp · ×, every control at least 44 × 44
      await ask(page).click()
      await expect(dock(page)).toHaveAttribute('data-open', '')
      await expect
        .poll(() => dock(page).evaluate((el) => el.getBoundingClientRect().width))
        .toBe(198)
      await page.screenshot({ path: `test-results/dock/dock-${width}-open.png` })
      const sizes = await dock(page)
        .locator('a, button[aria-expanded]')
        .evaluateAll((els) =>
          els.map((el) => {
            const box = el.getBoundingClientRect()
            return [el.getAttribute('aria-label'), box.width >= 44 && box.height >= 44]
          }),
        )
      expect(sizes).toEqual([
        ['MAX', true],
        ['Telegram', true],
        ['WhatsApp', true],
        ['Закрыть выбор мессенджера', true],
      ])
      await expectNoAxeViolations(page)
      expect(errors).toEqual([])
    })
  }

  test.describe('behaviour', () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test('hidden on the first screen and out of the Tab order', async ({ page }) => {
      await page.goto(URL)
      await settle(page)
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
      await showDock(page)
      await wheel(page, 300)
      await expect(dock(page)).toHaveAttribute('data-hidden', '')
      await wheel(page, -300)
      await expect(dock(page)).not.toHaveAttribute('data-hidden')
      await wheel(page, 300)
      await expect(dock(page)).toHaveAttribute('data-hidden', '')
    })

    test('hidden next to the footer', async ({ page }) => {
      await page.goto(URL)
      await settle(page)
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

    test('«Спросить» opens the choice: MAX · Telegram · WhatsApp in new tabs', async ({ page }) => {
      await page.goto(URL)
      await showDock(page)
      await expect(ask(page)).toHaveAccessibleName(`${layout.dock.askLabel} в мессенджере`)
      await expect(ask(page)).toHaveAttribute('aria-expanded', 'false')
      await expect(ask(page)).toHaveText(layout.dock.askLabel)
      await ask(page).click()
      await expect(ask(page)).toHaveAttribute('aria-expanded', 'true')
      await expect(ask(page)).toHaveAccessibleName('Закрыть выбор мессенджера')
      await expect(logos(page)).toHaveText(['', '', ''])
      const links = await logos(page).evaluateAll((els) =>
        els.map((a) => [
          a.getAttribute('aria-label'),
          a.getAttribute('href'),
          a.getAttribute('target'),
          a.getAttribute('rel'),
        ]),
      )
      expect(links).toEqual(
        (['max', 'telegram', 'whatsapp'] as const).map((kind) => [
          { max: 'MAX', telegram: 'Telegram', whatsapp: 'WhatsApp' }[kind],
          settings.messengers![kind],
          '_blank',
          'noopener noreferrer',
        ]),
      )
      // A pointer click leaves focus where it was: nothing in the dock is outlined
      await expect(logos(page).first()).not.toBeFocused()
      // «Наверх» folds away and leaves the Tab order
      const upWidth = () => toTop(page).evaluate((el) => el.parentElement!.offsetWidth)
      await expect.poll(upWidth).toBe(0)
      await expect(toTop(page).locator('xpath=..')).toHaveAttribute('inert', '')
      // «×» closes
      await ask(page).click()
      await expect(dock(page)).not.toHaveAttribute('data-open')
      await expect.poll(upWidth).toBe(44)
    })

    test('a chosen messenger opens in a new tab and the choice closes', async ({ page }) => {
      await openChoice(page)
      const popup = page.context().waitForEvent('page')
      await logos(page).nth(1).click()
      await (await popup).close()
      await expect(dock(page)).not.toHaveAttribute('data-open')
    })

    test('Esc closes the choice, a click outside closes it', async ({ page }) => {
      await openChoice(page)
      await page.keyboard.press('Escape')
      await expect(dock(page)).not.toHaveAttribute('data-open')
      await expect(ask(page)).toBeFocused()
      await ask(page).click()
      await expect(dock(page)).toHaveAttribute('data-open', '')
      await page.mouse.click(20, 400)
      await expect(dock(page)).not.toHaveAttribute('data-open')
    })

    test('from the keyboard: focus on MAX, arrows move, Esc returns to «Спросить»', async ({
      page,
    }) => {
      await page.goto(URL)
      await showDock(page)
      await ask(page).focus()
      await page.keyboard.press('Enter')
      await expect(logos(page).first()).toBeFocused()
      await page.keyboard.press('ArrowRight')
      await expect(logos(page).nth(1)).toBeFocused()
      await page.keyboard.press('End')
      await expect(ask(page)).toBeFocused()
      await page.keyboard.press('ArrowRight')
      await expect(logos(page).first()).toBeFocused()
      await page.keyboard.press('ArrowLeft')
      await expect(ask(page)).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(dock(page)).not.toHaveAttribute('data-open')
      await expect(ask(page)).toBeFocused()
      // Space opens too, Enter on «×» closes and keeps focus
      await page.keyboard.press('Space')
      await expect(logos(page).first()).toBeFocused()
      await page.keyboard.press('End')
      await page.keyboard.press('Enter')
      await expect(dock(page)).not.toHaveAttribute('data-open')
      await expect(ask(page)).toBeFocused()
    })

    test('a scroll closes the choice, then the dock hides as before', async ({ page }) => {
      await openChoice(page)
      await wheel(page, 300)
      await expect(dock(page)).not.toHaveAttribute('data-open')
      await expect(dock(page)).toHaveAttribute('data-hidden', '')
    })

    test('the menu closes the choice', async ({ page }) => {
      await openChoice(page)
      // From the keyboard: a click on ☰ would close the choice as a click outside anyway
      const menuButton = page.getByRole('button', { name: 'Открыть меню' })
      await menuButton.focus()
      await page.keyboard.press('Enter')
      await expect(page.getByRole('dialog', { name: 'Меню' })).toBeVisible()
      await expect(dock(page)).not.toHaveAttribute('data-open')
    })

    test('reduced motion: the choice only fades', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await openChoice(page)
      const style = await logos(page)
        .first()
        .evaluate((el) => {
          const s = getComputedStyle(el)
          return { property: s.transitionProperty, scale: s.scale, delay: s.transitionDelay }
        })
      expect(style).toEqual({
        property: 'opacity, background-color, border-color',
        scale: 'none',
        delay: '0s',
      })
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
    await page.goto(UI_KIT)
    await showDock(page)
    await expect(dock(page).getByRole('button', { name: 'Наверх' })).toBeVisible()
    await expect(dock(page).getByRole('link')).toHaveCount(0)
  })

  test('the short empty page keeps the dock hidden, without errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(URL)
    await page.evaluate(() =>
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }),
    )
    await wheel(page, -40)
    await expect(dock(page)).toHaveAttribute('data-hidden', '')
    expect(errors).toEqual([])
  })
})
