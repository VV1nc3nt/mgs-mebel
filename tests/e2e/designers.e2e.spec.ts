import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { globals } from '../../src/seed/data/globals'
import {
  DESIGNERS_DRAFT_TITLE,
  E2E_MANAGER,
  E2E_PROJECTS,
  HIDDEN_PROJECT_TITLE,
} from '../helpers/e2eDesigners'
import { e2eEditor } from '../helpers/e2eEditor'
import { layoutShifts } from '../helpers/scroll'
import { swiper } from '../helpers/swipe'
import { PLAYBACK_ATTR, stubPlayback } from '../helpers/video'

// «Дизайнерам» v2: hero with the audience chips, capabilities, projects (the media slider),
// cooperation with the manager; plus the breadcrumbs and the metadata.
const BASE = 'http://localhost:3000'
const URL = `${BASE}/designers`
const EMPTY_DB = !!process.env.E2E_EMPTY_DB
const { designers, layout } = globals(() => 0)
const VISIBLE = E2E_PROJECTS.filter((project) => !project.hidden)
const CAPABILITIES = designers.capabilities!.items!

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

const HEIGHTS = { 390: 844, 834: 1194, 1440: 900 } as const
// designers v2 §2.1: 680 / 780 / the screen (at least 780)
const HERO = { 390: 680, 834: 780, 1440: 900 } as const

const hydrated = (page: Page) =>
  page.waitForFunction(() => document.documentElement.style.getPropertyValue('--header-h') !== '')
const heroOf = (page: Page) => page.locator('section[aria-labelledby="designers-hero-title"]')
const capabilitiesOf = (page: Page) =>
  page.locator('section[aria-labelledby="designers-capabilities-title"]')
const projectsOf = (page: Page) =>
  page.locator('section[aria-labelledby="designers-projects-title"]')
const cooperationOf = (page: Page) =>
  page.locator('section[aria-labelledby="designers-cooperation-title"]')
const trackOf = (page: Page) => projectsOf(page).locator('.snap-x')
const slideOf = (page: Page, i: number) => trackOf(page).getByRole('group').nth(i)
const counterOf = (page: Page) => projectsOf(page).locator('p.tabular-nums')
const progressOf = (page: Page) => projectsOf(page).locator('span.rounded-xs')
/** Index of the active project card (`data-active`). */
const activeSlide = (page: Page) =>
  trackOf(page).evaluate((el) =>
    [...el.children].findIndex((child) => child.hasAttribute('data-active')),
  )
/** The track's distance from the snap target of a card (snap-start, clamped to the range). */
const offsetFromTarget = (page: Page, index: number) =>
  trackOf(page).evaluate((el, i) => {
    const card = el.children[i] as HTMLElement
    const max = el.scrollWidth - el.clientWidth
    const target = card.offsetLeft - parseFloat(getComputedStyle(el).scrollPaddingLeft)
    return Math.min(Math.max(target, 0), max) - el.scrollLeft
  }, index)

test.describe('designers', () => {
  test.skip(EMPTY_DB, 'needs tests/helpers/seedChrome.ts + seedHome.ts data')

  for (const width of [390, 834, 1440] as const) {
    test(`${width}: sections, capabilities, projects, cooperation; axe, CLS, console`, async ({
      page,
    }) => {
      const errors = watchConsole(page)
      await page.setViewportSize({ width, height: HEIGHTS[width] })
      await page.goto(URL)

      // One H1: the line break typed in the CMS is a <br>
      const h1 = page.locator('h1')
      await expect(h1).toHaveCount(1)
      const [first, second] = designers.hero.title.split('\n')
      expect(await h1.innerHTML()).toBe(`${first}<br>${second}`)
      // The title has no line break
      expect(await page.title()).not.toMatch(/\n/)

      // Hero: the heights of §2.1, the header over it, the chips, no CTA
      const hero = heroOf(page)
      expect(Math.round((await hero.boundingBox())!.height)).toBe(HERO[width])
      await expect(page.locator('header')).toHaveAttribute('data-variant', 'hero')
      await expect(hero.locator('li')).toHaveText(designers.hero.audiences!.map((a) => a.label))
      await expect(hero.getByRole('button')).toHaveCount(0)
      await expect(hero.getByRole('link')).toHaveCount(0)
      const poster = hero.locator('img').first()
      await expect(poster).toHaveAttribute('fetchpriority', 'high')
      if (width === 1440) {
        await expect(page.locator('header nav [aria-current="page"]')).toHaveText(
          layout.nav!.designers!.label,
        )
      }

      // Capabilities: the counter, numbers 01–06, H3; a strip / 2 / 3 columns
      const capabilities = capabilitiesOf(page)
      await expect(capabilities.getByText('6 преимуществ', { exact: true })).toBeVisible()
      await expect(capabilities.locator('h3')).toHaveText(CAPABILITIES.map((c) => c.title))
      await expect(capabilities.locator('article p[aria-hidden="true"]')).toHaveText([
        '01',
        '02',
        '03',
        '04',
        '05',
        '06',
      ])
      const list = capabilities.locator('ul')
      if (width === 390) {
        expect(await list.evaluate((el) => getComputedStyle(el).display)).toBe('flex')
        expect(await list.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true)
        expect(Math.round((await capabilities.locator('li').first().boundingBox())!.width)).toBe(
          300,
        )
      } else {
        expect(
          await list.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length),
        ).toBe(width === 834 ? 2 : 3)
      }

      // Projects: the hidden one is neither shown nor counted
      const projects = projectsOf(page)
      await expect(projects.locator('h3')).toHaveText(VISIBLE.map((p) => p.title))
      await expect(projects.getByText(HIDDEN_PROJECT_TITLE)).toHaveCount(0)
      await expect(counterOf(page)).toHaveText('01 / 04')
      await expect(projects.locator('[role="group"] p[aria-hidden="true"]')).toHaveText([
        '01',
        '02',
        '03',
        '04',
      ])
      const arrows = projects.getByRole('button', { name: /проект$/ })
      if (width < 1280) {
        await expect(arrows.first()).toBeHidden()
        await expect(progressOf(page)).toHaveCount(4)
        await expect(progressOf(page).first()).toBeVisible()
      } else {
        await expect(arrows).toHaveCount(2)
        await expect(arrows.first()).toBeVisible()
        await expect(progressOf(page).first()).toBeHidden()
      }

      // Cooperation: tel:, Telegram then WhatsApp in two columns, direct links, the lime ring
      const cooperation = cooperationOf(page)
      await expect(cooperation.getByRole('link', { name: /Телефон/ })).toHaveAttribute(
        'href',
        'tel:89957839428',
      )
      const messengers = cooperation.locator('ul a')
      await expect(messengers).toHaveCount(2)
      expect(
        await messengers.evaluateAll((links) => links.map((a) => a.getAttribute('aria-label'))),
      ).toEqual(['Telegram', 'WhatsApp'])
      for (const [i, href] of [E2E_MANAGER.telegram, E2E_MANAGER.whatsapp].entries()) {
        await expect(messengers.nth(i)).toHaveAttribute('href', href)
        await expect(messengers.nth(i)).toHaveAttribute('target', '_blank')
        await expect(messengers.nth(i)).toHaveAttribute('rel', 'noopener noreferrer')
      }
      expect(
        await cooperation
          .locator('ul')
          .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length),
      ).toBe(2)
      expect(Math.round((await messengers.first().boundingBox())!.height)).toBe(56)
      await expect(cooperation.getByText(E2E_MANAGER.name)).toBeVisible()
      const ring = await cooperation
        .locator('.shadow-avatar-ring')
        .evaluate((el) => getComputedStyle(el).boxShadow)
      expect(ring).toContain('rgb(201, 215, 48) 0px 0px 0px 4px')
      expect(ring).toContain('rgb(29, 29, 28) 0px 0px 0px 3px')

      // Sections in order
      const tops: number[] = []
      for (const locator of [h1, capabilities, projects, cooperation]) {
        tops.push((await locator.boundingBox())!.y)
      }
      expect(tops).toEqual([...tops].sort((a, b) => a - b))
      await expect(page.locator('main h2')).toHaveText([
        designers.capabilities!.title!,
        designers.projects!.title!,
        designers.cooperation!.title!,
      ])

      // Lazy images below the fold: scroll through before the full-page screenshot
      await page.evaluate(async () => {
        for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight / 2) {
          window.scrollTo({ top: y, behavior: 'instant' })
          await new Promise((r) => setTimeout(r, 50))
        }
        const loaded = [...document.images].filter((img) => img.complete && img.naturalWidth)
        await Promise.all(loaded.map((img) => img.decode().catch(() => undefined)))
        window.scrollTo({ top: 0, behavior: 'instant' })
      })
      await page.screenshot({
        path: `test-results/designers/designers-${width}.png`,
        fullPage: true,
      })
      expect(await layoutShifts(page), 'layout shifts: value, start, what moved').toEqual([])
      expect(await axe(page)).toEqual([])
      expect(errors).toEqual([])
    })
  }

  test('390: «Дизайнерам» is the active item of the menu', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(URL)
    await hydrated(page)
    await page.getByRole('button', { name: 'Открыть меню' }).click()
    const menu = page.getByRole('dialog', { name: 'Меню' })
    await expect(menu.locator('[aria-current="page"]')).toContainText(layout.nav!.designers!.label)
  })

  // Projects (designers v2 §2.3): only the active card's video plays (the 1st and 3rd visible have
  // one); desktop arrows by one card, aria-disabled at the ends with the focus kept.
  test('1440: the active project plays; arrows by one card, disabled at the ends', async ({
    page,
  }) => {
    const errors = watchConsole(page)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await stubPlayback(page)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(URL)
    await hydrated(page)
    const section = projectsOf(page)
    await expect(section.locator('video')).toHaveCount(0)

    await section.scrollIntoViewIfNeeded()
    await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'instant' }))
    const first = slideOf(page, 0).locator('video')
    await expect(first).toHaveAttribute(PLAYBACK_ATTR, 'playing')
    await expect(section.locator('video')).toHaveCount(1)
    await first.evaluate((el) => ((el as HTMLElement & { e2eMark?: boolean }).e2eMark = true))

    const prev = section.getByRole('button', { name: 'Предыдущий проект' })
    const next = section.getByRole('button', { name: 'Следующий проект' })
    await expect(prev).toHaveAttribute('aria-disabled', 'true')
    await expect(next).not.toHaveAttribute('aria-disabled')

    // The keyboard: Enter on → to the end; the 2nd card has no video, the 3rd plays
    await next.focus()
    await page.keyboard.press('Enter')
    await expect.poll(() => activeSlide(page)).toBe(1)
    await expect(counterOf(page)).toHaveText('02 / 04')
    await expect(first).toHaveAttribute(PLAYBACK_ATTR, 'paused')
    await expect(slideOf(page, 1).locator('video')).toHaveCount(0)
    await page.keyboard.press('Enter')
    await expect.poll(() => activeSlide(page)).toBe(2)
    await expect(slideOf(page, 2).locator('video')).toHaveAttribute(PLAYBACK_ATTR, 'playing')
    await page.keyboard.press('Enter')
    await expect.poll(() => activeSlide(page)).toBe(3)
    await expect(slideOf(page, 2).locator('video')).toHaveAttribute(PLAYBACK_ATTR, 'paused')
    await expect(next).toHaveAttribute('aria-disabled', 'true')
    await expect(next).toBeFocused()
    await page.keyboard.press('Enter')
    await page.waitForTimeout(400)
    expect(await activeSlide(page)).toBe(3)
    // The smooth scroll to the last card may still be running
    await expect.poll(async () => Math.abs(await offsetFromTarget(page, 3))).toBeLessThan(1)
    await expect(next).toBeFocused()

    // Back with the mouse: the first card resumes, the same element
    for (const i of [2, 1, 0]) {
      await prev.click()
      await expect.poll(() => activeSlide(page)).toBe(i)
    }
    await expect(first).toHaveAttribute(PLAYBACK_ATTR, 'playing')
    expect(await first.evaluate((el) => (el as HTMLElement & { e2eMark?: boolean }).e2eMark)).toBe(
      true,
    )
    await expect(prev).toHaveAttribute('aria-disabled', 'true')
    await prev.focus()
    await page.keyboard.press('Enter')
    await page.waitForTimeout(400)
    expect(await activeSlide(page)).toBe(0)
    await expect(prev).toBeFocused()
    expect(errors).toEqual([])
    await page.unrouteAll({ behavior: 'ignoreErrors' })
  })

  // Swipes pick every card in turn both ways (check in the Linux Chromium of the Playwright image)
  test.describe('touch', () => {
    test.use({ hasTouch: true })
    for (const width of [390, 834] as const) {
      test(`${width}: swipes pick each project in turn`, async ({ page }) => {
        await page.setViewportSize({ width, height: HEIGHTS[width] })
        await page.goto(URL)
        await hydrated(page)
        await trackOf(page).scrollIntoViewIfNeeded()
        const swipe = await swiper(page, { track: trackOf(page), slide: slideOf(page, 0) })
        const count = VISIBLE.length
        for (let i = 1; i < count; i++) {
          await swipe(1)
          await expect.poll(() => activeSlide(page)).toBe(i)
          expect(Math.abs(await offsetFromTarget(page, i))).toBeLessThan(1)
        }
        await expect(progressOf(page).nth(count - 1)).toHaveClass(/bg-accent/)
        for (let i = count - 2; i >= 0; i--) {
          await swipe(-1)
          await expect.poll(() => activeSlide(page)).toBe(i)
          expect(Math.abs(await offsetFromTarget(page, i))).toBeLessThan(1)
        }
      })
    }
  })

  // On a draft in draft mode (the published page stays as is), put back after: the hero title
  // (what Live Preview shows), one visible project — no counter, arrows or progress; none — no
  // section.
  test('draft: the hero title, one visible project, none', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    const login = await page.request.post(`${BASE}/api/users/login`, {
      data: { email: e2eEditor.email, password: e2eEditor.password },
    })
    expect(login.ok()).toBe(true)
    const draft = await (
      await page.request.get(`${BASE}/api/globals/designers?draft=true&depth=0`)
    ).json()
    const save = async (data: Record<string, unknown>) => {
      const response = await page.request.post(`${BASE}/api/globals/designers?draft=true`, {
        data: { ...draft, ...data, _status: 'draft' },
      })
      expect(response.ok(), await response.text()).toBe(true)
    }
    const items = draft.projects.items as { hidden: boolean }[]
    try {
      await save({
        hero: { ...draft.hero, title: DESIGNERS_DRAFT_TITLE },
        projects: {
          ...draft.projects,
          items: items.map((item, i) => ({ ...item, hidden: i > 0 })),
        },
      })
      await page.goto(`${BASE}/preview?path=/designers`)
      await hydrated(page)
      await expect(page.locator('h1')).toHaveText(DESIGNERS_DRAFT_TITLE)
      const section = projectsOf(page)
      await expect(section.getByRole('group')).toHaveCount(1)
      await expect(section.locator('h3')).toHaveText(VISIBLE[0]!.title)
      await expect(counterOf(page)).toHaveCount(0)
      await expect(section.getByRole('button')).toHaveCount(0)
      await expect(progressOf(page)).toHaveCount(0)

      await save({
        projects: { ...draft.projects, items: items.map((item) => ({ ...item, hidden: true })) },
      })
      await page.reload()
      await hydrated(page)
      await expect(page.locator('#designers-capabilities-title')).toBeVisible()
      await expect(projectsOf(page)).toHaveCount(0)
      await expect(page.locator('#designers-cooperation-title')).toBeVisible()
    } finally {
      await save({})
      await page.request.get(`${BASE}/preview/exit?path=/designers`, { maxRedirects: 0 })
    }
    // The published page never showed the draft
    await page.goto(URL)
    await expect(page.locator('h1')).not.toHaveText(DESIGNERS_DRAFT_TITLE)
  })

  test('metadata and breadcrumbs: no line break in the title; Главная → Дизайнерам', async ({
    page,
  }) => {
    await page.goto(URL)
    const title = await page.title()
    expect(title).not.toMatch(/\n/)
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /^[^\n]+$/)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', URL)
    const data = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((nodes) => nodes.map((n) => JSON.parse(n.textContent ?? '{}')))
    const breadcrumbs = data.find((d) => d['@type'] === 'BreadcrumbList')
    expect(breadcrumbs.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Главная', item: BASE },
      { '@type': 'ListItem', position: 2, name: layout.nav!.designers!.label, item: URL },
    ])
  })
})

test('designers on an empty database renders without sections @empty', async ({ page }) => {
  test.skip(!EMPTY_DB, 'empty database only')
  const errors = watchConsole(page)
  const response = await page.goto(URL)
  expect(response?.status()).toBe(200)
  await expect(page.locator('main#content')).toHaveCount(1)
  // No section without its content: neither the hero, capabilities, projects nor cooperation (no
  // manager phone or messengers)
  await expect(page.locator('main section')).toHaveCount(0)
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1)
  expect(await axe(page)).toEqual([])
  expect(errors).toEqual([])
})
