import AxeBuilder from '@axe-core/playwright'
import { expect, NOTICE, test, CONSENT_KEY, type Page } from '../helpers/test'

import { globals } from '../../src/seed/data/globals'
import { e2eEditor } from '../helpers/e2eEditor'
import { paragraph, legalText } from '../helpers/e2eLegal'
import { motionEnded } from '../helpers/motion'
import { layoutShifts, settle, tallPage, wheel } from '../helpers/scroll'

// The only spec without the cookie choice made by the fixture (tests/helpers/test.ts)
test.use({ consent: false })

const BASE = 'http://localhost:3000'
const URL = `${BASE}/about`
const EMPTY_DB = !!process.env.E2E_EMPTY_DB
const { layout } = globals(() => 0)
const C = layout.cookies!
const WIDTHS = [390, 768, 834, 1280, 1440] as const

const notice = (page: Page) => page.locator(NOTICE)
const dock = (page: Page) => page.locator('.dock')
const settingsButton = (page: Page) =>
  page.locator('footer').getByRole('button', { name: 'Настройки cookies' })

const stored = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), CONSENT_KEY)

/** The header island has measured itself: the page is hydrated. */
const hydrated = (page: Page) =>
  page.waitForFunction(() => document.documentElement.style.getPropertyValue('--header-h') !== '')

const overlap = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

/** The dock on screen: the middle of a long page, then a scroll up. */
async function showDock(page: Page) {
  await tallPage(page)
  await settle(page)
  await page.evaluate(() => window.scrollTo({ top: 1500, behavior: 'instant' }))
  await settle(page)
  await wheel(page, -300)
  await expect(dock(page)).not.toHaveAttribute('data-hidden')
  await expect.poll(() => dock(page).evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
}

test.describe('cookie notice', () => {
  test.skip(EMPTY_DB, 'needs tests/helpers/seedChrome.ts data')

  test('first visit: the notice; each choice is saved and hides it; the next visit — none', async ({
    page,
  }) => {
    const choices = [
      [C.rejectLabel, { necessary: false, analytics: false, marketing: false, rejected: true }],
      [C.necessaryLabel, { necessary: true, analytics: false, marketing: false, rejected: false }],
      [C.acceptLabel, { necessary: true, analytics: true, marketing: true, rejected: false }],
    ] as const
    for (const [label, value] of choices) {
      await page.evaluate((key) => localStorage.removeItem(key), CONSENT_KEY).catch(() => {})
      await page.goto(URL)
      await expect(notice(page)).toBeVisible()
      await expect(notice(page)).not.toHaveAttribute('aria-modal')
      // No settings screen: three buttons only; «Подробнее» — the cookie policy is not published
      await expect(notice(page).getByRole('button')).toHaveText([
        C.rejectLabel!,
        C.necessaryLabel!,
        C.acceptLabel!,
      ])
      await expect(notice(page).getByRole('link')).toHaveCount(0)
      await notice(page).getByRole('button', { name: label! }).click()
      await expect(notice(page)).toHaveCount(0)
      const saved = await stored(page)
      expect(saved).toMatchObject({ ...value, version: 1 })
      expect(Number.isNaN(Date.parse(saved.date))).toBe(false)
      await page.reload()
      await hydrated(page)
      await page.waitForTimeout(300)
      await expect(notice(page)).toHaveCount(0)
    }
  })

  test('another version of the choice asks again', async ({ page }) => {
    await page.goto(URL)
    await page.evaluate((key) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          necessary: true,
          analytics: true,
          marketing: true,
          rejected: false,
          date: new Date().toISOString(),
          version: 0,
        }),
      )
    }, CONSENT_KEY)
    await page.reload()
    await expect(notice(page)).toBeVisible()
  })

  test('Esc does not close it; the page stays usable', async ({ page }) => {
    await page.goto(URL)
    await expect(notice(page)).toBeVisible()
    await notice(page).getByRole('button').first().focus()
    await page.keyboard.press('Escape')
    await expect(notice(page)).toBeVisible()
    // Not modal: the focus goes on to the page
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    expect(
      await page.evaluate(
        (sel) => !document.querySelector(sel)!.contains(document.activeElement),
        NOTICE,
      ),
    ).toBe(true)
  })

  test('«Настройки cookies»: opens it again; keyboard — focus in, back after the choice', async ({
    page,
  }) => {
    await page.goto(URL)
    await notice(page).getByRole('button', { name: C.necessaryLabel! }).click()
    await expect(notice(page)).toHaveCount(0)

    // Mouse
    await settingsButton(page).click()
    await expect(notice(page)).toBeVisible()
    await notice(page).getByRole('button', { name: C.necessaryLabel! }).click()
    await expect(notice(page)).toHaveCount(0)

    // Keyboard
    await settingsButton(page).focus()
    await page.keyboard.press('Enter')
    await expect(notice(page).getByRole('button', { name: C.rejectLabel! })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(notice(page).getByRole('button', { name: C.necessaryLabel! })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(notice(page)).toHaveCount(0)
    await expect(settingsButton(page)).toBeFocused()
  })

  test('the open menu makes the notice inert', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(URL)
    await hydrated(page)
    await expect(notice(page)).toBeVisible()
    await page.getByRole('button', { name: 'Открыть меню' }).click()
    await expect(page.getByRole('dialog', { name: 'Меню' })).toBeVisible()
    const button = notice(page).getByRole('button').first()
    await button.evaluate((el: HTMLElement) => el.focus())
    await expect(button).not.toBeFocused()
  })

  test('«Подробнее» leads to /cookies once the policy is published', async ({ page }) => {
    const login = await page.request.post(`${BASE}/api/users/login`, {
      data: { email: e2eEditor.email, password: e2eEditor.password },
    })
    expect(login.ok()).toBe(true)
    const url = `${BASE}/api/globals/legalCookies`
    const save = async (data: Record<string, unknown>) => {
      const response = await page.request.post(url, { data })
      expect(response.ok(), await response.text()).toBe(true)
    }
    try {
      await save({
        title: 'E2E: политика cookies',
        body: legalText(paragraph('Тестовый текст политики cookies.')),
        _status: 'published',
      })
      await page.context().clearCookies()
      await page.goto(URL)
      const more = notice(page).getByRole('link', { name: C.moreLabel! })
      await expect(more).toHaveAttribute('href', '/cookies')
      await more.click()
      await expect(page).toHaveURL(`${BASE}/cookies`)
      await expect(page.locator('h1')).toHaveText('E2E: политика cookies')
    } finally {
      await page.request.post(`${BASE}/api/users/login`, {
        data: { email: e2eEditor.email, password: e2eEditor.password },
      })
      // «Снять с публикации»: `_status: draft` without the draft query — the page is a 404 again
      await save({ _status: 'draft' })
      await page.context().clearCookies()
      expect((await page.request.get(`${BASE}/cookies`)).status()).toBe(404)
    }
  })

  test('390: at the bottom while the dock is hidden, over it while it is shown', async ({ page }) => {
    const height = 844
    await page.setViewportSize({ width: 390, height })
    await page.goto(URL)
    await hydrated(page)
    await expect(notice(page)).toBeVisible()
    const bottom = async () => {
      await motionEnded(notice(page))
      const box = (await notice(page).boundingBox())!
      return Math.round(box.y + box.height)
    }

    // First screen: the dock is hidden, the notice is 12 from the bottom
    await expect(dock(page)).toHaveAttribute('data-hidden', '')
    expect(await bottom()).toBe(height - 12)

    // Down and up: the dock is shown, the notice stands 12 above it
    await showDock(page)
    await expect.poll(bottom).toBeLessThan(height - 12)
    const box = (await notice(page).boundingBox())!
    const shown = (await dock(page).boundingBox())!
    expect(overlap(box, shown)).toBe(false)
    expect(Math.round(shown.y - (box.y + box.height))).toBe(12)

    // Down again: the dock hides, the notice goes back
    await wheel(page, 300)
    await expect(dock(page)).toHaveAttribute('data-hidden', '')
    await expect.poll(bottom).toBe(height - 12)
    expect(await layoutShifts(page)).toEqual([])
  })

  test('390, reduced motion: the notice moves without a transition', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(URL)
    await hydrated(page)
    await expect(notice(page)).toBeVisible()
    expect(await notice(page).evaluate((el) => getComputedStyle(el).transitionDuration)).toBe('0s')
  })

  for (const width of WIDTHS) {
    test(`${width}: no shifts, no violations; the labels stay on one line; clear of the dock`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(URL)
      await hydrated(page)
      await expect(notice(page)).toBeVisible()
      await settle(page)
      expect(await layoutShifts(page)).toEqual([])
      const { violations } = await new AxeBuilder({ page })
        .include(NOTICE)
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
      expect(violations.map((v) => v.id)).toEqual([])

      // Every button: 44 high, its label on one line
      const buttons = await notice(page)
        .getByRole('button')
        .evaluateAll((els) =>
          els.map((el) => {
            const box = el.getBoundingClientRect()
            return [Math.round(box.height), el.scrollWidth <= el.clientWidth]
          }),
        )
      expect(buttons).toEqual([
        [44, true],
        [44, true],
        [44, true],
      ])
      // One row from 1280, a column below
      const row = await notice(page).evaluate((el) => getComputedStyle(el).flexDirection === 'row')
      expect(row).toBe(width >= 1280)

      await showDock(page)
      await motionEnded(notice(page))
      const box = (await notice(page).boundingBox())!
      const closed = (await dock(page).boundingBox())!
      expect(overlap(box, closed), `closed dock ${Math.round(closed.width)}`).toBe(false)
      await page.screenshot({ path: `test-results/cookies/notice-${width}.png` })

      await dock(page).locator('button[aria-expanded]').click()
      await expect(dock(page)).toHaveAttribute('data-open', '')
      await motionEnded(dock(page))
      const open = (await dock(page).boundingBox())!
      expect(overlap(box, open), `open dock ${Math.round(open.width)}`).toBe(false)
      await page.screenshot({ path: `test-results/cookies/notice-${width}-dock-open.png` })
      // The widths of the dock, for the record
      console.log(
        `${width}: dock ${Math.round(closed.width)} / ${Math.round(open.width)}, notice ${Math.round(box.x)}…${Math.round(box.x + box.width)} × ${Math.round(box.y)}…${Math.round(box.y + box.height)}`,
      )
    })
  }
})
