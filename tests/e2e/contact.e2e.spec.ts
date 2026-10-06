import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

import { globals } from '../../src/seed/data/globals'
import { cls, settle, wheel } from '../helpers/scroll'

// Contact buttons with the choice of messengers (README of the buttons, variant «Сегменты») on
// the home page: header CTA (≥1280), hero CTA, salon card CTA. The seed has all three messengers.
const URL = 'http://localhost:3000/'
const UI_KIT = 'http://localhost:3000/ui-kit'
const EMPTY_DB = !!process.env.E2E_EMPTY_DB
const { layout, home, salonsPage, settings } = globals(() => 0)
const CTA = home.hero!.ctaLabel!
const SALON_CTA = salonsPage.map!.cardCtaLabel!
const NAMES = ['MAX', 'Telegram', 'WhatsApp']
const HREFS = (['max', 'telegram', 'whatsapp'] as const).map((kind) => settings.messengers![kind])

type Box = { x: number; y: number; width: number; height: number }

const watchConsole = (page: Page) => {
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.location().url.endsWith('/favicon.ico')) return
    if (m.type() === 'error' || /hydrat/i.test(m.text())) errors.push(m.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))
  return errors
}

const expectNoAxeViolations = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([])
}

const box = async (locator: Locator): Promise<Box> => {
  const b = await locator.boundingBox()
  if (!b) throw new Error('no box')
  return b
}

/** The contact button inside `scope` (one per scope: header, hero, salon card). */
const chooser = (scope: Locator) => {
  const root = scope.locator('.chooser')
  return {
    root,
    button: root.locator('button[aria-expanded]'),
    capsule: root.locator('.chooser-capsule'),
    links: root.getByRole('group', { name: 'Выбрать мессенджер' }).getByRole('link'),
  }
}

/** Closed: named with the caption. */
const expectClosed = async (c: ReturnType<typeof chooser>, caption: string) => {
  await expect(c.root).not.toHaveAttribute('data-open')
  await expect(c.button).toHaveAccessibleName(`${caption} — выбрать мессенджер`)
}

/** The capsule has appeared once the place of the button is measured. */
async function ready(c: ReturnType<typeof chooser>) {
  await expect(c.capsule).toHaveCount(1)
}

/** The open choice: three cells in order, every control ≥ 44, the capsule 54 high, centred. */
async function expectOpen(c: ReturnType<typeof chooser>, closed: Box) {
  await expect(c.root).toHaveAttribute('data-open', '')
  await expect(c.button).toHaveAttribute('aria-expanded', 'true')
  await expect(c.button).toHaveAccessibleName('Закрыть выбор мессенджера')
  const links = await c.links.evaluateAll((els) =>
    els.map((a) => [
      a.getAttribute('aria-label'),
      a.getAttribute('href'),
      a.getAttribute('target'),
    ]),
  )
  expect(links).toEqual(NAMES.map((name, i) => [name, HREFS[i], '_blank']))
  // End of the animation (stagger included)
  await c.root.evaluate((el) =>
    // A transition replaced mid-way rejects its promise: that one is over too
    Promise.all(
      el.getAnimations({ subtree: true }).map((animation) => animation.finished.catch(() => null)),
    ),
  )
  expect((await box(c.capsule)).height).toBe(54)
  const capsule = await box(c.capsule)
  expect(capsule.width).toBe(Math.max(closed.width, 198))
  // Grows evenly up and down: the centre line stays
  expect(capsule.y + capsule.height / 2).toBeCloseTo(closed.y + closed.height / 2, 0)
  for (const control of [...(await c.links.all()), c.button]) {
    const b = await box(control)
    expect(b.width).toBeGreaterThanOrEqual(44)
    expect(b.height).toBeGreaterThanOrEqual(44)
  }
}

/** Opens by a pointer click at the centre of the button (no scroll by Playwright first). */
async function clickOpen(page: Page, c: ReturnType<typeof chooser>) {
  await ready(c)
  const b = await box(c.button)
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
}

/** The salon card's button in the middle of the viewport, the page settled. */
async function toSalonCard(page: Page) {
  await page
    .locator('.max-w-salon-card .chooser')
    .first()
    .evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
  await settle(page)
}

test.describe('contact buttons', () => {
  test.skip(EMPTY_DB, 'needs tests/helpers/seedChrome.ts + seedHome.ts data')

  for (const width of [1280, 1440] as const) {
    test(`header ${width}: grows to the left, the phone fades in place, screenshot, axe`, async ({
      page,
    }) => {
      const errors = watchConsole(page)
      await page.setViewportSize({ width, height: 900 })
      await page.goto(URL)
      await settle(page)
      const header = page.locator('header')
      const c = chooser(header)
      await ready(c)
      await expectClosed(c, layout.header!.ctaLabel!)
      const phone = header.locator('a[href^="tel:"]')
      const closed = await box(c.button)
      const phoneBox = await box(phone)
      const logo = await box(header.getByRole('link', { name: 'MGS MEBEL — на главную' }))
      await page.screenshot({
        path: `test-results/contact/header-${width}-closed.png`,
        clip: { x: width - 600, y: 0, width: 600, height: 100 },
      })

      await clickOpen(page, c)
      await expectOpen(c, closed)
      const capsule = await box(c.capsule)
      // Right edges match: the capsule grew to the left
      expect(capsule.x + capsule.width).toBeCloseTo(closed.x + closed.width, 0)
      // The phone is gone from view and from the Tab order, and nothing moved
      await expect(phone).toHaveCSS('opacity', '0')
      await expect(phone).toHaveCSS('visibility', 'hidden')
      expect(await box(phone)).toEqual(phoneBox)
      expect(await box(header.getByRole('link', { name: 'MGS MEBEL — на главную' }))).toEqual(logo)
      await page.screenshot({
        path: `test-results/contact/header-${width}-open.png`,
        clip: { x: width - 600, y: 0, width: 600, height: 100 },
      })
      await expectNoAxeViolations(page)

      await page.keyboard.press('Escape')
      await expect(c.root).not.toHaveAttribute('data-open')
      await expect(phone).toHaveCSS('visibility', 'visible')
      expect(await cls(page)).toBeLessThan(0.1)
      expect(errors).toEqual([])
    })
  }

  for (const width of [390, 1440] as const) {
    test(`hero ${width}: opens in place, nothing moves, stays inside the hero, axe`, async ({
      page,
    }) => {
      const errors = watchConsole(page)
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
      await page.goto(URL)
      await settle(page)
      const hero = page.locator('section').first()
      const c = chooser(hero)
      await ready(c)
      await expectClosed(c, CTA)
      const closed = await box(c.button)
      const title = await box(page.locator('h1'))
      if (width === 390) expect(closed.width).toBe(350)

      await clickOpen(page, c)
      await expectOpen(c, closed)
      const capsule = await box(c.capsule)
      expect(capsule.x).toBeCloseTo(closed.x, 0)
      expect(await box(page.locator('h1'))).toEqual(title)
      // Not clipped by the hero (overflow: hidden)
      const heroBox = await box(hero)
      expect(capsule.y + capsule.height).toBeLessThanOrEqual(heroBox.y + heroBox.height)
      await page.screenshot({ path: `test-results/contact/hero-${width}-open.png` })
      await expectNoAxeViolations(page)
      expect(errors).toEqual([])
    })

    test(`salon card ${width}: full width, stays inside the card and the map, axe`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(URL)
      await toSalonCard(page)
      const card = page.locator('.max-w-salon-card').first()
      const c = chooser(card)
      await ready(c)
      await expectClosed(c, SALON_CTA)
      const closed = await box(c.button)
      const cardBox = await box(card)

      await clickOpen(page, c)
      await expectOpen(c, closed)
      const capsule = await box(c.capsule)
      expect(capsule.width).toBe(closed.width)
      expect(capsule.y).toBeGreaterThanOrEqual(cardBox.y)
      expect(capsule.y + capsule.height).toBeLessThanOrEqual(cardBox.y + cardBox.height)
      expect(await box(card)).toEqual(cardBox)
      await card.screenshot({ path: `test-results/contact/salon-${width}-open.png` })
      await expectNoAxeViolations(page)
    })
  }

  test.describe('behaviour', () => {
    test.use({ viewport: { width: 1440, height: 900 } })

    test('a chosen messenger opens in a new tab and the choice closes', async ({ page }) => {
      await page.goto(URL)
      await settle(page)
      const c = chooser(page.locator('section').first())
      await clickOpen(page, c)
      await expect(c.links.first()).toBeVisible()
      // A pointer click does not move focus to the cells
      await expect(c.links.first()).not.toBeFocused()
      const popup = page.context().waitForEvent('page')
      await c.links.nth(2).click()
      await (await popup).close()
      await expect(c.root).not.toHaveAttribute('data-open')
    })

    test('Esc returns focus to the button; a click outside closes', async ({ page }) => {
      await page.goto(URL)
      await settle(page)
      const c = chooser(page.locator('section').first())
      await clickOpen(page, c)
      await page.keyboard.press('Escape')
      await expect(c.root).not.toHaveAttribute('data-open')
      await expect(c.button).toBeFocused()
      await clickOpen(page, c)
      await expect(c.root).toHaveAttribute('data-open', '')
      await page.mouse.click(700, 300)
      await expect(c.root).not.toHaveAttribute('data-open')
    })

    test('keyboard: focus on MAX, arrows and Home/End go round, Enter on «×» closes', async ({
      page,
    }) => {
      await page.goto(URL)
      await settle(page)
      const c = chooser(page.locator('section').first())
      await ready(c)
      await c.button.focus()
      await page.keyboard.press('Enter')
      await expect(c.links.first()).toBeFocused()
      await page.keyboard.press('ArrowRight')
      await expect(c.links.nth(1)).toBeFocused()
      await page.keyboard.press('End')
      await expect(c.button).toBeFocused()
      await page.keyboard.press('ArrowRight')
      await expect(c.links.first()).toBeFocused()
      await page.keyboard.press('Home')
      await expect(c.links.first()).toBeFocused()
      await page.keyboard.press('ArrowLeft')
      await expect(c.button).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(c.root).not.toHaveAttribute('data-open')
      await expect(c.button).toBeFocused()
    })

    test('one choice at a time: header ↔ hero', async ({ page }) => {
      await page.goto(URL)
      await settle(page)
      const hero = chooser(page.locator('section').first())
      const header = chooser(page.locator('header'))
      await ready(hero)
      await ready(header)
      // From the keyboard: a pointer click elsewhere would close it as a click outside anyway
      await hero.button.focus()
      await page.keyboard.press('Enter')
      await expect(hero.root).toHaveAttribute('data-open', '')
      await header.button.focus()
      await page.keyboard.press('Enter')
      await expect(header.root).toHaveAttribute('data-open', '')
      await expect(hero.root).not.toHaveAttribute('data-open')
    })

    test('one choice at a time: the salon card ↔ the dock', async ({ page }) => {
      await page.goto(URL)
      await toSalonCard(page)
      // A short scroll up shows the dock; the card's button stays in view
      await wheel(page, -100)
      // Images coming into view must not shift the page later: scroll anchoring would move it by
      // more than 6px and close the choice, as any scroll does
      await settle(page)
      const dock = page.locator('.dock')
      await expect(dock).not.toHaveAttribute('data-hidden')
      const ask = dock.locator('button[aria-expanded]')
      const card = chooser(page.locator('.max-w-salon-card').first())
      await ready(card)

      await card.button.focus()
      await page.keyboard.press('Enter')
      await expect(card.root).toHaveAttribute('data-open', '')
      await ask.focus()
      await page.keyboard.press('Enter')
      await expect(dock).toHaveAttribute('data-open', '')
      await expect(card.root).not.toHaveAttribute('data-open')

      await card.button.focus()
      await page.keyboard.press('Enter')
      await expect(card.root).toHaveAttribute('data-open', '')
      await expect(dock).not.toHaveAttribute('data-open')
    })

    test('a scroll closes the header choice before the smart header hides', async ({ page }) => {
      await page.goto(URL)
      await settle(page)
      const c = chooser(page.locator('header'))
      await clickOpen(page, c)
      await expect(c.root).toHaveAttribute('data-open', '')
      await wheel(page, 300)
      await expect(c.root).not.toHaveAttribute('data-open')
      await expect(page.locator('header')).toHaveAttribute('data-state', /away|hidden/)
    })
  })

  test('390: the menu closes the hero choice', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(URL)
    await settle(page)
    const c = chooser(page.locator('section').first())
    await clickOpen(page, c)
    await expect(c.root).toHaveAttribute('data-open', '')
    const menuButton = page.getByRole('button', { name: 'Открыть меню' })
    await menuButton.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog', { name: 'Меню' })).toBeVisible()
    await expect(c.root).not.toHaveAttribute('data-open')
  })

  test('/ui-kit: one messenger is a plain link; outline and full-width variants open', async ({
    page,
  }) => {
    const errors = watchConsole(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(UI_KIT)
    const section = page.locator('section', {
      has: page.getByRole('heading', { name: 'Кнопки связи' }),
    })
    const single = section.getByRole('link', { name: 'Рассчитать проект в MAX' })
    await expect(single).toHaveCount(3)
    for (const link of await single.all()) {
      await expect(link).not.toHaveAttribute('aria-expanded')
      await expect(link).toHaveAttribute('target', '_blank')
    }
    // Two messengers: two cells
    const two = section
      .locator('.chooser')
      .filter({ has: page.getByRole('link', { name: 'Telegram', includeHidden: true }) })
      .filter({ hasNot: page.getByRole('link', { name: 'WhatsApp', includeHidden: true }) })
    await expect(two).toHaveCount(3)
    // Outline on the lime block: dark ring while closed
    const outline = section.locator('.bg-accent .chooser button')
    await outline.focus()
    await expect(outline).toHaveCSS('outline-color', 'rgb(20, 20, 19)')
    await page.keyboard.press('Enter')
    await expect(section.locator('.bg-accent .chooser')).toHaveAttribute('data-open', '')
    await page.screenshot({ path: 'test-results/contact/ui-kit.png', fullPage: false })
    await expectNoAxeViolations(page)
    expect(errors).toEqual([])
  })
})
