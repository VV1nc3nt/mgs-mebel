import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { cls, settle, wheel } from '../helpers/scroll'

// The smart header (a deviation from README §5.2): in place at the top, hidden while scrolling
// down, fixed on glass while scrolling up. /about puts it over the hero, /ui-kit in the flow and
// has the sticky segment bar. Both are long enough with the seedHome data.
const BASE = 'http://localhost:3000'
const PAGES = [
  { path: '/about', variant: 'hero', position: 'absolute' },
  { path: '/ui-kit', variant: 'flow', position: 'relative' },
] as const
const EMPTY_DB = !!process.env.E2E_EMPTY_DB

const header = (page: Page) => page.locator('header')
const bar = (page: Page) => page.locator('header > .header-bar')
const burger = (page: Page) => page.getByRole('button', { name: 'Открыть меню' })
const sections = (page: Page) => page.getByRole('navigation', { name: 'Разделы сайта' })

/** Fails the test on hydration mismatches and other console errors. */
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

const style = (page: Page, property: 'transform' | 'opacity' | 'position') =>
  bar(page).evaluate((el, p) => getComputedStyle(el)[p], property)

/** The bar's box in whole pixels: the end of a transform transition leaves float dust. */
const box = async (page: Page) => {
  const { x, y, width, height } = (await bar(page).boundingBox())!
  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  }
}

/**
 * The header's effects have run: its measured height is on <html>. Before that a jump down is
 * seen as a page opened mid-way, and the header pins itself (as it should after a reload).
 */
const hydrated = (page: Page) =>
  page.waitForFunction(() => document.documentElement.style.getPropertyValue('--header-h') !== '')

/** An instant jump down to `y`: a scroll down, so the header goes away (out of view). */
async function jumpTo(page: Page, y: number) {
  await hydrated(page)
  await settle(page)
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y)
  await expect(header(page)).toHaveAttribute('data-state', 'away')
  await settle(page)
}

/** Away, then a wheel up: pinned, the slide-in finished. */
async function pin(page: Page, y = 1500) {
  await jumpTo(page, y)
  await wheel(page, -300)
  await expect(header(page)).toHaveAttribute('data-state', 'pinned')
  await expect.poll(() => style(page, 'transform')).toBe('none')
  await expect.poll(() => style(page, 'opacity')).toBe('1')
}

/** The element at the centre of `locator` is the locator's element or inside it: not covered. */
const reachable = (page: Page, name: string) =>
  page.evaluate((label) => {
    const target = [...document.querySelectorAll('header a, header button')].find(
      (el) => el.getAttribute('aria-label') === label || el.textContent?.trim() === label,
    )
    if (!target) return false
    const r = target.getBoundingClientRect()
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    return !!hit && target.contains(hit)
  }, name)

test.describe('smart header', () => {
  test.skip(EMPTY_DB, 'needs tests/helpers/seedChrome.ts and seedHome.ts data')

  for (const width of [390, 1440] as const) {
    test.describe(`${width}`, () => {
      test.use({ viewport: { width, height: 900 } })

      for (const { path, variant, position } of PAGES) {
        test(`${path}: in place at the top, hidden down, pinned up, back in place`, async ({
          page,
        }) => {
          const errors = watchConsole(page)
          await page.goto(`${BASE}${path}`)
          await expect(header(page)).toHaveAttribute('data-variant', variant)
          await expect(header(page)).toHaveAttribute('data-state', 'top')
          await expect(header(page)).toHaveCSS('position', position)
          expect(await style(page, 'position')).toBe('relative')
          await settle(page)
          const start = await box(page)

          await jumpTo(page, 1500)
          await wheel(page, 300)
          await expect(header(page)).toHaveAttribute('data-state', 'away')
          expect(await style(page, 'position')).toBe('fixed')
          expect((await box(page)).y + start.height).toBeLessThanOrEqual(0)

          await wheel(page, -300)
          await expect(header(page)).toHaveAttribute('data-state', 'pinned')
          await expect.poll(async () => (await box(page)).y).toBe(0)
          await expect.poll(() => style(page, 'opacity')).toBe('1')
          await expect(bar(page)).toBeInViewport()
          if (width === 390) expect(await reachable(page, 'Открыть меню')).toBe(true)
          else {
            const first = (await sections(page).getByRole('link').first().textContent())!.trim()
            expect(await reachable(page, first)).toBe(true)
          }
          expect(await axe(page)).toEqual([])

          // Pinned → scrolling down slides it out
          await wheel(page, 300)
          await expect(header(page)).toHaveAttribute('data-state', 'hidden')
          await expect.poll(() => style(page, 'opacity')).toBe('0')

          // All the way up: back in its own place, glass off, nothing moved
          await wheel(page, -300)
          await expect(header(page)).toHaveAttribute('data-state', 'pinned')
          await page.mouse.move(100, 300)
          while (await page.evaluate(() => window.scrollY > 0)) await wheel(page, -2000)
          await expect(header(page)).toHaveAttribute('data-state', 'top')
          expect(await style(page, 'position')).toBe('relative')
          // A fast scroll may reach the top during the slide-in: it ends in the same place
          await expect.poll(() => box(page)).toEqual(start)
          await expect
            .poll(() => bar(page).evaluate((el) => getComputedStyle(el, '::before').opacity))
            .toBe('0')
          expect(await cls(page)).toBe(0)
          expect(errors).toEqual([])
        })
      }

      test('Tab into the hidden header shows it', async ({ page }) => {
        await page.goto(`${BASE}/about`)
        await jumpTo(page, 1500)
        await page.keyboard.press('Tab') // skip link
        await page.keyboard.press('Tab')
        const focused = page.locator('header :focus')
        await expect(focused).toHaveCount(1)
        await expect(header(page)).toHaveAttribute('data-state', 'pinned')
        await expect.poll(() => style(page, 'opacity')).toBe('1')
        await expect(focused).toBeInViewport({ ratio: 1 })
      })

      test('/ui-kit: the sticky segment bar sits under the pinned header', async ({ page }) => {
        await page.goto(`${BASE}/ui-kit`)
        const group = page.getByRole('group', { name: 'Категории работ' })
        const sticky = page.locator('.sticky-under-header')
        await settle(page)
        // Just below the start of the bar's section: the bar is stuck, with room to stay so
        // after a small wheel up
        const section = await sticky.evaluate(
          (el) => el.parentElement!.getBoundingClientRect().top + window.scrollY,
        )
        await jumpTo(page, Math.round(section + 200))
        await expect.poll(async () => (await sticky.boundingBox())!.y).toBe(0)

        await wheel(page, -60)
        await expect(header(page)).toHaveAttribute('data-state', 'pinned')
        await expect.poll(() => style(page, 'transform')).toBe('none')
        const headerBottom = await page.evaluate(() =>
          Math.round(
            document.querySelector('header > .header-bar')!.getBoundingClientRect().bottom,
          ),
        )
        await expect
          .poll(async () => Math.round((await sticky.boundingBox())!.y))
          .toBe(headerBottom)
        const covered = await group.evaluate((el) => {
          const first = el.querySelector('button')!
          const r = first.getBoundingClientRect()
          return !first.contains(
            document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2),
          )
        })
        expect(covered).toBe(false)
        await page.screenshot({ path: `test-results/header/ui-kit-filter-${width}.png` })

        await wheel(page, 60)
        await expect(header(page)).toHaveAttribute('data-state', 'hidden')
        await expect.poll(async () => (await sticky.boundingBox())!.y).toBe(0)
      })

      test('reduced motion: fades without sliding', async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.goto(`${BASE}/about`)
        await jumpTo(page, 1500)
        expect(await style(page, 'transform')).toBe('none')
        expect(await style(page, 'opacity')).toBe('0')
        await wheel(page, -300)
        await expect(header(page)).toHaveAttribute('data-state', 'pinned')
        await expect.poll(() => style(page, 'opacity')).toBe('1')
        expect(await style(page, 'transform')).toBe('none')
        await wheel(page, 300)
        await expect(header(page)).toHaveAttribute('data-state', 'hidden')
        expect(await style(page, 'transform')).toBe('none')
      })
    })
  }

  test.describe('mobile menu from the pinned header', () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test('opens, keeps the header pinned, Esc returns focus to ☰', async ({ page }) => {
      await page.goto(`${BASE}/about`)
      await pin(page)
      const y = await page.evaluate(() => window.scrollY)
      await burger(page).click()
      const dialog = page.getByRole('dialog', { name: 'Меню' })
      await expect(dialog).toBeVisible()
      await expect(header(page)).toHaveAttribute('data-state', 'pinned')
      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
      await expect(burger(page)).toBeFocused()
      await expect(header(page)).toHaveAttribute('data-state', 'pinned')
      expect(await page.evaluate(() => window.scrollY)).toBe(y)
    })

    test('closed with the mouse: focus back on ☰ does not hold the header', async ({ page }) => {
      await page.goto(`${BASE}/about`)
      await pin(page)
      // Pointer clicks at the centre (a Playwright click would scroll the page first)
      const click = async (name: string) => {
        const b = (await page.getByRole('button', { name }).boundingBox())!
        await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
      }
      await click('Открыть меню')
      const dialog = page.getByRole('dialog', { name: 'Меню' })
      await expect(dialog).toBeVisible()
      await click('Закрыть меню')
      await expect(dialog).toHaveCount(0)
      await expect(page.locator('html')).not.toHaveAttribute('data-scroll-locked')
      await expect(burger(page)).toBeFocused()
      await wheel(page, 300)
      await expect(header(page)).toHaveAttribute('data-state', 'hidden')
      // Not pinned again by the re-evaluation a frame later
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      )
      await expect(header(page)).toHaveAttribute('data-state', 'hidden')
    })
  })

  test.describe('desktop sections from the pinned header', () => {
    test.use({ viewport: { width: 1440, height: 900 } })

    test('a section link navigates; the new page starts with the header in place', async ({
      page,
    }) => {
      await page.goto(`${BASE}/about`)
      await pin(page)
      const link = sections(page).getByRole('link').nth(1)
      const href = (await link.getAttribute('href'))!
      await link.click()
      await expect(page).toHaveURL(`${BASE}${href}`)
      await expect(header(page)).toHaveAttribute('data-state', 'top')
    })
  })

  for (const width of [390, 834, 1440] as const) {
    test(`${width}: screenshot of the pinned header`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(`${BASE}/about`)
      await pin(page)
      await page.screenshot({ path: `test-results/header/header-pinned-${width}.png` })
    })
  }
})
