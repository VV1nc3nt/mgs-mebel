import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { globals } from '../../src/seed/data/globals'
import { news } from '../../src/seed/data/news'

const BASE = 'http://localhost:3000'
const WIDTHS = [390, 834, 1440] as const
// Texts written by tests/helpers/seedChrome.ts (the same seed module).
const { layout, settings } = globals(() => 0)
const EMPTY_DB = !!process.env.E2E_EMPTY_DB
// A nested page: published news of tests/helpers/seedHome.ts (an unknown slug is a 404).
const NEWS_PATH = `/news/${news(() => 0)[0]!.slug}`

/** Fails the test on hydration mismatches and other console errors. */
const watchConsole = (page: Page) => {
  const errors: string[] = []
  page.on('console', (message) => {
    // The site has no favicon yet (branding comes later): its 404 is not a page error.
    if (message.location().url.endsWith('/favicon.ico')) return
    if (message.type() === 'error' || /hydrat/i.test(message.text())) errors.push(message.text())
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

test.describe('layout: header and footer', () => {
  test.skip(EMPTY_DB, 'needs tests/helpers/seedChrome.ts data')

  for (const width of WIDTHS) {
    test.describe(`${width}`, () => {
      test.use({ viewport: { width, height: 900 } })

      test('header over the hero on /, in the flow on /salons', async ({ page }) => {
        const errors = watchConsole(page)
        await page.goto(`${BASE}/`)
        const header = page.locator('header')
        await expect(header).toHaveAttribute('data-variant', 'hero')
        await expect(header).toHaveCSS('position', 'absolute')
        await page.screenshot({ path: `test-results/layout/home-${width}.png` })

        await page.goto(`${BASE}/salons`)
        await expect(header).toHaveAttribute('data-variant', 'flow')
        await expect(header).toHaveCSS('position', 'relative')
        await expect(header).toHaveAttribute('data-state', 'top')
        await page.screenshot({ path: `test-results/layout/salons-${width}.png` })
        await page.locator('footer').screenshot({ path: `test-results/layout/footer-${width}.png` })
        expect(errors).toEqual([])
      })

      test('footer: slogan, hotline, socials, copyright', async ({ page }) => {
        await page.goto(`${BASE}/salons`)
        const footer = page.locator('footer')
        await expect(footer.getByText(layout.footer!.sloganAccent!)).toHaveCSS(
          'color',
          'rgb(201, 215, 48)',
        )
        await expect(
          footer.getByRole('link', { name: settings.contacts.hotlinePhone }),
        ).toHaveAttribute('href', 'tel:88001001658')
        for (const [name, href] of [
          ['MAX', settings.messengers!.max],
          ['Telegram', settings.messengers!.telegram],
          ['WhatsApp', settings.messengers!.whatsapp],
        ] as const) {
          const link = footer.getByRole('link', { name, exact: true })
          await expect(link).toHaveAttribute('href', href!)
          await expect(link).toHaveAttribute('target', '_blank')
          await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
        }
        const year = new Date().getFullYear()
        await expect(footer).toContainText(`© ${year} ${layout.footer!.copyright}`)
      })

      test('has no axe violations', async ({ page }) => {
        for (const path of ['/', '/salons', NEWS_PATH]) {
          await page.goto(`${BASE}${path}`)
          expect(await axe(page), path).toEqual([])
        }
      })
    })
  }

  test.describe('mobile', () => {
    test.use({ viewport: { width: 390, height: 900 } })

    test('«←» leads to the parent section; none on the home page', async ({ page }) => {
      await page.goto(`${BASE}/`)
      await expect(page.getByRole('link', { name: 'На главную', exact: true })).toHaveCount(0)
      await page.goto(`${BASE}${NEWS_PATH}`)
      await page.getByRole('link', { name: 'Назад к новостям' }).click()
      await expect(page).toHaveURL(`${BASE}/news`)
      await page.getByRole('link', { name: 'На главную', exact: true }).click()
      await expect(page).toHaveURL(`${BASE}/`)
    })

    test('desktop row is hidden', async ({ page }) => {
      await page.goto(`${BASE}/salons`)
      await expect(page.getByRole('navigation', { name: 'Разделы сайта' })).toBeHidden()
    })
  })

  test.describe('desktop', () => {
    test.use({ viewport: { width: 1440, height: 900 } })

    test('marks the current section, also on nested pages', async ({ page }) => {
      await page.goto(`${BASE}${NEWS_PATH}`)
      const nav = page.getByRole('navigation', { name: 'Разделы сайта' })
      const current = nav.locator('[aria-current="page"]')
      await expect(current).toHaveText(layout.nav.news.shortLabel!)
      await expect(current).toHaveCSS('color', 'rgb(201, 215, 48)')
      await expect(nav.getByRole('link')).toHaveText(
        Object.values(layout.nav).map((item) => item.shortLabel ?? item.label),
      )
      await expect(page.getByRole('link', { name: /Назад|На главную$/ })).toBeHidden()
    })

    test('keyboard: skip link → logo → sections → phone → CTA', async ({ page }) => {
      await page.goto(`${BASE}/salons`)
      await page.keyboard.press('Tab')
      const skip = page.getByRole('link', { name: 'Перейти к содержимому' })
      await expect(skip).toBeFocused()
      await expect(skip).toBeInViewport()

      const stops: string[] = []
      for (let i = 0; i < 9; i++) {
        await page.keyboard.press('Tab')
        stops.push(
          await page.evaluate(
            () =>
              document.activeElement?.getAttribute('aria-label') ??
              document.activeElement?.textContent ??
              '',
          ),
        )
      }
      expect(stops).toEqual([
        'MGS MEBEL — на главную',
        ...Object.values(layout.nav).map((item) => item.shortLabel ?? item.label),
        settings.contacts.hotlinePhone,
        `${layout.header!.ctaLabel} в MAX`,
      ])
    })

    test('skip link moves focus to main', async ({ page }) => {
      await page.goto(`${BASE}/salons`)
      await page.keyboard.press('Tab')
      await page.keyboard.press('Enter')
      await expect(page.locator('main#content')).toBeFocused()
    })

    test('CTA opens the first messenger in order (MAX) in a new tab', async ({ page }) => {
      await page.goto(`${BASE}/salons`)
      const cta = page.getByRole('link', { name: `${layout.header!.ctaLabel} в MAX` })
      await expect(cta).toHaveAttribute('href', settings.messengers!.max!)
      await expect(cta).toHaveAttribute('target', '_blank')
    })
  })
})

test.describe('layout on an empty database @empty', () => {
  test.skip(!EMPTY_DB, 'runs against a fresh database (E2E_EMPTY_DB=1)')

  for (const width of WIDTHS) {
    test(`${width}: header and footer render without empty controls`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      const errors = watchConsole(page)
      for (const path of ['/', '/salons', '/news']) {
        const response = await page.goto(`${BASE}${path}`)
        expect(response?.status(), path).toBe(200)
        await expect(page.locator('header')).toHaveCount(1)
        await expect(page.locator('footer')).toHaveCount(1)
        // Every visible control has an accessible name; no CTA, phone or socials without data.
        const unnamed = await page
          .locator('header a:visible, header button:visible, footer a, footer button')
          .evaluateAll(
            (els) =>
              els.filter((el) => !(el.getAttribute('aria-label') || el.textContent?.trim())).length,
          )
        expect(unnamed, path).toBe(0)
        await expect(page.locator('footer a')).toHaveCount(0)
        // No sections: no menu to open, the slot stays empty
        await expect(page.getByRole('button', { name: 'Открыть меню' })).toHaveCount(0)
        await expect(page.locator('header a[href^="tel:"], header a[target="_blank"]')).toHaveCount(
          0,
        )
        expect(await axe(page), path).toEqual([])
      }
      expect(errors).toEqual([])
    })
  }
})
