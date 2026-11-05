import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '../helpers/test'

import { globals } from '../../src/seed/data/globals'
import { e2eManager } from '../helpers/e2eEditor'
import { E2E_REQUISITES } from '../helpers/e2eFooter'
import { E2E_SALONS } from '../helpers/e2eHome'
import { motionEnded } from '../helpers/motion'
import { layoutShifts, settle, tallPage, wheel } from '../helpers/scroll'

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000'
// A page with the seedHome data, long enough for the dock
const URL = `${BASE}/about`
const EMPTY_DB = !!process.env.E2E_EMPTY_DB
const { layout, settings } = globals(() => 0)
const F = layout.footer!
const HEIGHTS = { 390: 844, 834: 1194, 1440: 900 } as const
const YEAR = new Date().getFullYear()

const footer = (page: Page) => page.locator('footer')
const contacts = (page: Page) => footer(page).getByRole('region', { name: 'Контакты' })
const contactBlock = (page: Page) => footer(page).locator('[data-footer-contact]')
const column = (page: Page, key: 'menu' | 'buyers' | 'salons') =>
  footer(page).locator(`[data-footer-column="${key}"]`)
const top = async (locator: Locator) => (await locator.boundingBox())!.y

/** Fails the test on hydration mismatches and other console errors. */
const watchConsole = (page: Page) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.location().url.endsWith('/favicon.ico')) return
    if (message.type() === 'error' || /hydrat/i.test(message.text())) errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))
  return errors
}

/** The header island has measured itself: the page is hydrated. */
const hydrated = (page: Page) =>
  page.waitForFunction(() => document.documentElement.style.getPropertyValue('--header-h') !== '')

async function toFooter(page: Page) {
  await hydrated(page)
  await footer(page).scrollIntoViewIfNeeded()
  await settle(page)
}

test.describe('footer', () => {
  test.skip(EMPTY_DB, 'needs tests/helpers/seedChrome.ts and seedHome.ts data')

  for (const width of [390, 834, 1440] as const) {
    test(`${width}: blocks in order, columns, contacts, bottom row; axe, console, shifts`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: HEIGHTS[width] })
      const errors = watchConsole(page)
      await page.goto(URL)
      await toFooter(page)

      // Slogan with the accent, hotline, the contact block
      await expect(footer(page).getByText(F.sloganAccent!)).toHaveCSS('color', 'rgb(201, 215, 48)')
      const phone = contacts(page).getByRole('link', { name: settings.contacts.hotlinePhone })
      await expect(phone).toHaveAttribute('href', 'tel:88001001658')
      await expect(contacts(page)).toContainText(`${F.hotlineLabel}`)
      await expect(contacts(page)).toContainText(E2E_REQUISITES.hours)
      await expect(contactBlock(page)).toContainText(F.contact!.title!)

      // Messenger links live in the CTA chooser, with no duplicate row of icons.
      await expect(contacts(page).locator(':scope > ul')).toHaveCount(0)

      // Columns: no buyer links in the data — no column; salons from the collection
      await expect(footer(page).getByRole('heading', { name: F.buyersTitle! })).toHaveCount(0)
      const salonNames = await column(page, 'salons')
        .locator('a > span:first-child')
        .allTextContents()
      expect(salonNames).toEqual([...E2E_SALONS])
      for (const href of await column(page, 'salons')
        .locator('a')
        .evaluateAll((els) => els.map((el) => el.getAttribute('href'))))
        expect(href).toBe('/salons')

      // Bottom: published documents (privacy, offer; cookies is empty), the settings button,
      // requisites of the e2e data instead of the copyright
      const bottomLinks = footer(page).locator('ul').last()
      await expect(bottomLinks.getByRole('link')).toHaveText(['Конфиденциальность', 'Оферта'])
      await expect(footer(page).locator('a[href="/cookies"]')).toHaveCount(0)
      await expect(footer(page).getByRole('button', { name: 'Настройки cookies' })).toBeVisible()
      await expect(footer(page)).toContainText(`© ${YEAR} ${E2E_REQUISITES.company}`)
      await expect(footer(page)).toContainText(`ИНН ${E2E_REQUISITES.inn}`)
      await expect(footer(page)).toContainText(`ОГРН ${E2E_REQUISITES.ogrn}`)
      await expect(footer(page)).toContainText(E2E_REQUISITES.legalAddress)
      await expect(footer(page)).not.toContainText(F.copyright!)

      // One row on desktop, two rows on tablet, brand / accordions / contacts on mobile.
      const brand = await top(footer(page).getByRole('img', { name: 'MGS MEBEL' }))
      const contact = await top(contactBlock(page))
      const phoneTop = await top(phone)
      const menu = await top(column(page, 'menu'))
      const salons = await top(column(page, 'salons'))
      const bottom = await top(bottomLinks)
      if (width < 768) {
        expect(brand).toBeLessThan(menu)
        expect(menu).toBeLessThan(salons)
        expect(salons).toBeLessThan(phoneTop)
        expect(phoneTop).toBeLessThan(contact)
      } else if (width < 1280) {
        expect(brand).toBeLessThan(menu)
        expect(phoneTop).toBeLessThan(menu)
        expect(Math.abs(menu - salons)).toBeLessThanOrEqual(1)
      } else {
        const columns = await Promise.all([
          footer(page).getByRole('img', { name: 'MGS MEBEL' }).boundingBox(),
          column(page, 'menu').boundingBox(),
          column(page, 'salons').boundingBox(),
          contacts(page).boundingBox(),
        ])
        for (let i = 1; i < columns.length; i++) {
          expect(columns[i]!.x).toBeGreaterThan(columns[i - 1]!.x)
          expect(Math.abs(columns[i]!.y - columns[0]!.y)).toBeLessThanOrEqual(1)
        }
      }
      expect(Math.max(menu, salons, phoneTop, contact)).toBeLessThan(bottom)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      )
      for (const href of ['/privacy', '/offer']) {
        const link = footer(page).locator(`a[href="${href}"]`)
        await expect(link).toHaveCount(1)
        expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44)
      }
      // Column titles from 768 — accordion buttons below
      await expect(
        footer(page).getByRole('button', { name: F.menuTitle!, exact: true }),
      ).toBeVisible({
        visible: width < 768,
      })

      await page.screenshot({ path: `test-results/footer/footer-${width}.png`, fullPage: false })
      await footer(page).screenshot({ path: `test-results/footer/footer-${width}-full.png` })
      const { violations } = await new AxeBuilder({ page })
        .include('footer')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
      expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual(
        [],
      )
      expect(await layoutShifts(page)).toEqual([])
      expect(errors).toEqual([])
    })
  }

  test('390: accordions — one open at a time, aria-expanded', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(URL)
    await toFooter(page)
    const menu = footer(page).getByRole('button', { name: F.menuTitle!, exact: true })
    const salons = footer(page).getByRole('button', { name: F.salonsTitle!, exact: true })
    const menuLink = column(page, 'menu').getByRole('link', { name: 'О нас' })
    const salonLink = column(page, 'salons').getByRole('link').first()

    await expect(menu).toHaveAttribute('aria-expanded', 'false')
    await expect(salons).toHaveAttribute('aria-expanded', 'false')
    await expect(menuLink).toBeHidden()
    await menu.focus()
    await page.keyboard.press('Enter')
    await expect(menu).toHaveAttribute('aria-expanded', 'true')
    await expect(menuLink).toBeVisible()
    expect((await menuLink.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    await salons.focus()
    await page.keyboard.press('Space')
    await expect(menu).toHaveAttribute('aria-expanded', 'false')
    await expect(salons).toHaveAttribute('aria-expanded', 'true')
    await expect(menuLink).toBeHidden()
    await expect(salonLink).toBeVisible()
    await page.screenshot({ path: 'test-results/footer/footer-390-accordion.png' })
    await salons.click()
    await expect(salons).toHaveAttribute('aria-expanded', 'false')
    await expect(salonLink).toBeHidden()
  })

  test('the links of the accordions are in the HTML without JS', async ({ request }) => {
    const html = await (await request.get(URL)).text()
    const footerHtml = html.slice(html.indexOf('<footer'), html.indexOf('</footer>'))
    for (const href of ['/about', '/salons', '/works', '/catalogs', '/designers', '/news'])
      expect(footerHtml).toContain(`href="${href}"`)
    for (const name of E2E_SALONS) expect(footerHtml).toContain(name)
  })

  test('390: without JavaScript the accordion lists remain visible and usable', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 390, height: 844 },
    })
    try {
      const page = await context.newPage()
      await page.goto(URL)
      const menu = column(page, 'menu').getByRole('link', { name: 'О нас', exact: true })
      await expect(menu).toBeVisible()
      await expect(column(page, 'salons').getByRole('link').first()).toBeVisible()
      await expect(
        footer(page).getByRole('button', { name: F.menuTitle!, exact: true }),
      ).toBeHidden()
      await menu.focus()
      await expect(menu).toBeFocused()
    } finally {
      await context.close()
    }
  })

  test('the contact block opens the choice of messengers in place', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(URL)
    await toFooter(page)
    const button = contactBlock(page).locator('button[aria-expanded]')
    await expect(button).toHaveAccessibleName(`${F.contact!.buttonLabel} — выбрать мессенджер`)
    await expect(button).toHaveCSS('height', '52px')
    await button.click()
    await expect(button).toHaveAttribute('aria-expanded', 'true')
    const group = contactBlock(page).getByRole('group', { name: 'Выбрать мессенджер' })
    await motionEnded(group)
    await expect(group.getByRole('link')).toHaveCount(3)
  })

  test('without requisites — the copyright', async ({ page }) => {
    const login = await page.request.post(`${BASE}/api/users/login`, {
      data: { email: e2eManager.email, password: e2eManager.password },
    })
    expect(login.ok()).toBe(true)
    const save = async (requisites: Record<string, string | null>) => {
      const response = await page.request.post(`${BASE}/api/globals/settings`, {
        data: { requisites },
      })
      expect(response.ok(), await response.text()).toBe(true)
    }
    try {
      await save({ company: null, inn: null, ogrn: null, legalAddress: null, hours: null })
      await page.context().clearCookies()
      await page.goto(URL)
      await expect(footer(page)).toContainText(`© ${YEAR} ${F.copyright}`)
      await expect(footer(page)).not.toContainText('ИНН')
      await expect(contacts(page)).not.toContainText(E2E_REQUISITES.hours)
    } finally {
      await page.request.post(`${BASE}/api/users/login`, {
        data: { email: e2eManager.email, password: e2eManager.password },
      })
      await save({ ...E2E_REQUISITES })
      await page.context().clearCookies()
    }
  })

  test('1440: Tab from the dock to the footer — the dock hides, «Настройки cookies» is clear', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(URL)
    await hydrated(page)
    await tallPage(page)
    await settle(page)
    await page.evaluate(() => window.scrollTo({ top: 1500, behavior: 'instant' }))
    await settle(page)
    await wheel(page, -300)
    const dock = page.locator('.dock')
    await expect(dock).not.toHaveAttribute('data-hidden')
    // The footer ends with «Настройки cookies», the dock follows it: Tab — keyboard focus in the dock
    const settingsButton = footer(page).getByRole('button', { name: 'Настройки cookies' })
    await settingsButton.focus()
    await page.keyboard.press('Tab')
    await expect(dock.getByRole('button', { name: 'Наверх' })).toBeFocused()
    // At the bottom of the page the focused dock stays over the footer
    await page.evaluate(() =>
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }),
    )
    await settle(page)
    await expect(dock).not.toHaveAttribute('data-hidden')
    // Back into the footer: the dock hides, nothing covers the button
    await page.keyboard.press('Shift+Tab')
    await expect(settingsButton).toBeFocused()
    await expect(dock).toHaveAttribute('data-hidden', '')
    await expect.poll(() => dock.evaluate((el) => getComputedStyle(el).opacity)).toBe('0')
    const covered = await settingsButton.evaluate((el) => {
      const box = el.getBoundingClientRect()
      const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
      return !el.contains(hit)
    })
    expect(covered).toBe(false)
    await page.screenshot({ path: 'test-results/footer/footer-1440-bottom.png' })
  })
})

test.describe('footer on an empty database @empty', () => {
  test.skip(!EMPTY_DB, 'runs against a fresh database (E2E_EMPTY_DB=1)')

  for (const width of [390, 834, 1440] as const) {
    test(`${width}: renders without empty columns, links or buttons`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      const errors = watchConsole(page)
      const response = await page.goto(`${BASE}/`)
      expect(response?.status()).toBe(200)
      await expect(footer(page)).toHaveCount(1)
      await expect(footer(page).locator('h2')).toHaveCount(0)
      await expect(footer(page).locator('a')).toHaveCount(0)
      expect(errors).toEqual([])
    })
  }
})
