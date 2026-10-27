import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page, newConsentContext } from '../helpers/test'

import { globals } from '../../src/seed/data/globals'
import { salons } from '../../src/seed/data/salons'
import { E2E_SALONS } from '../helpers/e2eHome'
import { expectShowSalonAtCorner } from '../helpers/salonMap'
import { layoutShifts, settle } from '../helpers/scroll'
import { armScrollEnd, swiper as swipeTrack } from '../helpers/swipe'
import { PLAYBACK_ATTR, stubPlayback } from '../helpers/video'

// «Фирменные салоны» (design: salons v2): heading, salon cards, the map with the list and the card.
const BASE = 'http://localhost:3000'
const URL = `${BASE}/salons`
const EMPTY_DB = !!process.env.E2E_EMPTY_DB
const { layout, salonsPage } = globals(() => 0)
const HERO = salonsPage.hero!
const MAP_TEXTS = salonsPage.map!
const SALON_CTA = MAP_TEXTS.cardCtaLabel!
const PHONES = new Map(salons(() => 0).map((s) => [s.name, s.phone]))
// Fixture: the last salon has no phone; the 1st and the 3rd have a card video
const WITH_VIDEO = [0, 2]

const HEIGHTS = { 390: 844, 834: 1194, 1440: 900 } as const
const MAP = { 390: 500, 834: 560, 1440: 640 } as const
const HOVER_QUERY = '(hover: hover) and (pointer: fine)'

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

/** The header island has measured itself: the page is hydrated. */
const hydrated = (page: Page) =>
  page.waitForFunction(() => document.documentElement.style.getPropertyValue('--header-h') !== '')

const cardsOf = (page: Page) => page.getByRole('region', { name: 'Салоны', exact: true })
const mapOf = (page: Page) => page.getByRole('region', { name: 'Салоны на карте' })
const cardButton = (page: Page, name: string) =>
  cardsOf(page).getByRole('button', { name, exact: true })
const segment = (page: Page, name: string) =>
  page.getByRole('button', { name: `Показать салон ${name}` })
const slide = (page: Page, index: number) =>
  cardsOf(page).getByRole('group', { name: `${index + 1} из ${E2E_SALONS.length}` })

/** The salon card over the map shows this salon. */
const expectMapCard = async (page: Page, name: string) => {
  await expect(mapOf(page).getByRole('heading', { level: 3 })).toHaveText(name)
}

/** Only this card is pressed, and only its segment is current (when segments are shown). */
const expectSelected = async (page: Page, index: number, segments = true) => {
  for (const [i, name] of E2E_SALONS.entries()) {
    await expect(cardButton(page, name)).toHaveAttribute('aria-pressed', String(i === index))
    if (segments) {
      if (i === index) await expect(segment(page, name)).toHaveAttribute('aria-current', 'true')
      else await expect(segment(page, name)).not.toHaveAttribute('aria-current')
    }
  }
}

const playback = (video: Locator) => video.getAttribute(PLAYBACK_ATTR)

const trackOf = (page: Page) => cardsOf(page).locator('.snap-x')

/** Swipes the salon cards (tests/helpers/swipe.ts). Needs `hasTouch`. */
const swiper = (page: Page) => swipeTrack(page, { track: trackOf(page), slide: slide(page, 0) })

/**
 * The track's distance from the snap target of a card: its start against the snapport start
 * (mobile) or its center against the snapport center (tablet), clamped to the scroll range.
 */
const offsetFromTarget = (track: Locator, index: number) =>
  track.evaluate((el, i) => {
    const style = getComputedStyle(el)
    const card = el.children[i] as HTMLElement
    const max = el.scrollWidth - el.clientWidth
    const padStart = parseFloat(style.scrollPaddingLeft)
    const padEnd = parseFloat(style.scrollPaddingRight)
    const target = getComputedStyle(card).scrollSnapAlign.includes('center')
      ? card.offsetLeft +
        card.offsetWidth / 2 -
        (padStart + (el.clientWidth - padStart - padEnd) / 2)
      : card.offsetLeft - padStart
    return Math.min(Math.max(target, 0), max) - el.scrollLeft
  }, index)

/** Room for the focus outline (2 + offset 2) between a card and the track's edges. */
const ringRoom = (button: Locator) =>
  button.evaluate((el) => {
    const track = el.closest('.snap-x')!.getBoundingClientRect()
    const card = el.getBoundingClientRect()
    return Math.min(
      card.top - track.top,
      track.bottom - card.bottom,
      card.left - track.left,
      track.right - card.right,
    )
  })

test.describe('salons', () => {
  test.skip(EMPTY_DB, 'needs tests/helpers/seedChrome.ts + seedHome.ts data')

  for (const width of [390, 834, 1440] as const) {
    test(`${width}: heading, cards, map; axe, CLS, console`, async ({ page }) => {
      const errors = watchConsole(page)
      await page.setViewportSize({ width, height: HEIGHTS[width] })
      await page.goto(URL)

      // Heading from the CMS; the header is in the flow (not over a hero), «Салоны» is active
      await expect(page.locator('h1')).toHaveCount(1)
      await expect(page.locator('h1')).toHaveText(HERO.title!)
      await expect(page.getByText(`#${HERO.label}`)).toBeVisible()
      await expect(page.getByText(HERO.lead!)).toBeVisible()
      await expect(page.locator('header')).not.toHaveAttribute('data-variant', 'hero')
      if (width === 1440) {
        await expect(
          page.getByRole('navigation', { name: 'Разделы сайта' }).getByRole('link', {
            name: layout.nav!.salons!.shortLabel ?? layout.nav!.salons!.label,
          }),
        ).toHaveAttribute('aria-current', 'page')
      }

      // H1 → H2 «Салоны» → H3 × 4 → H2 «Салоны на карте» → H3 (the map card)
      const headings = await page
        .locator('main :is(h1, h2, h3)')
        .evaluateAll((nodes) => nodes.map((n) => `${n.tagName} ${n.textContent?.trim()}`))
      expect(headings).toEqual([
        `H1 ${HERO.title}`,
        'H2 Салоны',
        ...E2E_SALONS.map((name) => `H3 ${name}`),
        'H2 Салоны на карте',
        `H3 ${E2E_SALONS[0]}`,
      ])

      // Four cards, the first selected; photos loaded, the first one is the LCP candidate
      const cards = cardsOf(page)
      await expect(cards).toHaveAttribute('aria-roledescription', 'карусель')
      await expectSelected(page, 0, width !== 1440)
      const photos = cards.locator('img')
      await expect(photos).toHaveCount(E2E_SALONS.length)
      await expect(photos.first()).toHaveAttribute('fetchpriority', 'high')
      await expect(photos.first()).not.toHaveAttribute('loading', 'lazy')
      await expect
        .poll(() => photos.first().evaluate((img: HTMLImageElement) => img.naturalWidth))
        .toBeGreaterThan(0)
      // ▶ only on the cards with a video
      for (const [i] of E2E_SALONS.entries()) {
        await expect(slide(page, i).locator('.backdrop-blur-soft')).toHaveCount(
          WITH_VIDEO.includes(i) ? 1 : 0,
        )
      }

      // Slider 82 % / 44 % on a scroll-snap track, a grid of 4 on desktop; segments below 1280
      const track = cards.locator('.snap-x')
      const trackLayout = await track.evaluate((el) => ({
        display: getComputedStyle(el).display,
        columns: getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length,
        scrolls: el.scrollWidth > el.clientWidth,
      }))
      if (width === 1440) {
        expect(trackLayout).toMatchObject({ display: 'grid', columns: 4, scrolls: false })
        await expect(segment(page, E2E_SALONS[0])).toBeHidden()
      } else {
        expect(trackLayout).toMatchObject({ display: 'flex', scrolls: true })
        await expect(segment(page, E2E_SALONS[0])).toBeVisible()
        const share = await track.evaluate((el) => {
          const inner = el.clientWidth - parseFloat(getComputedStyle(el).paddingLeft) * 2
          return (el.children[0] as HTMLElement).offsetWidth / inner
        })
        expect(share).toBeCloseTo(width === 390 ? 0.82 : 0.44, 2)
      }
      const cardBox = (await slide(page, 0).locator('article').boundingBox())!
      expect(cardBox.height / cardBox.width).toBeCloseTo(4 / 3, 1)

      // Map block: the home heights, the card of the first salon with a tel: link and the CTA
      const map = mapOf(page)
      const mapBox = (await map.locator('.bg-map-bg').boundingBox())!
      expect(Math.round(mapBox.height)).toBe(MAP[width])
      await expectMapCard(page, E2E_SALONS[0])
      await expect(map.getByRole('link', { name: PHONES.get(E2E_SALONS[0])! })).toHaveAttribute(
        'href',
        'tel:84957773575',
      )
      await expect(
        map.getByRole('button', { name: `${SALON_CTA} — выбрать мессенджер` }),
      ).toHaveAttribute('aria-expanded', 'false')
      await expect(map.getByRole('button', { name: 'Карта' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )

      await page.screenshot({ path: `test-results/salons/salons-${width}.png`, fullPage: true })
      expect(await layoutShifts(page), 'layout shifts: value, start, what moved').toEqual([])
      expect(await axe(page)).toEqual([])
      expect(errors).toEqual([])
    })
  }

  test('a pick by card, segment or list row selects the salon everywhere', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(URL)
    await hydrated(page)
    const scrollY = await page.evaluate(() => window.scrollY)

    // Card: the partly visible second one — selected, scrolled into place horizontally only
    await cardButton(page, E2E_SALONS[1]).click()
    await expectSelected(page, 1)
    await expectMapCard(page, E2E_SALONS[1])
    const track = cardsOf(page).locator('.snap-x')
    await expect
      .poll(() =>
        track.evaluate((el) => {
          const pad = parseFloat(getComputedStyle(el).paddingLeft)
          return Math.round((el.children[1] as HTMLElement).offsetLeft - pad - el.scrollLeft)
        }),
      )
      .toBe(0)
    expect(await page.evaluate(() => window.scrollY), 'the page does not scroll').toBe(scrollY)

    // Segment
    await segment(page, E2E_SALONS[2]).click()
    await expectSelected(page, 2)
    await expectMapCard(page, E2E_SALONS[2])

    // The card was closed: a new pick opens it again
    await mapOf(page).getByRole('button', { name: 'Скрыть карточку салона' }).click()
    await expect(mapOf(page).getByRole('heading', { level: 3 })).toHaveCount(0)
    await segment(page, E2E_SALONS[3]).click()
    await expectMapCard(page, E2E_SALONS[3])
    // The last salon has no phone
    await expect(mapOf(page).getByText('Телефон')).toHaveCount(0)

    // List row: the count with the CMS caption, the current row; a pick goes back to the map
    // and focuses the name on the salon card
    await mapOf(page).getByRole('button', { name: 'Списком' }).click()
    await expect(
      mapOf(page).getByText(`${E2E_SALONS.length} салона ${MAP_TEXTS.listCaption}`),
    ).toBeVisible()
    const rows = mapOf(page).getByRole('listitem').getByRole('button')
    await expect(rows).toHaveCount(E2E_SALONS.length)
    await expect(rows.nth(3)).toHaveAttribute('aria-current', 'true')
    const row = mapOf(page).getByRole('button', { name: E2E_SALONS[0], exact: true })
    await expect(row).toHaveAccessibleDescription(
      salons(() => 0).find((s) => s.name === E2E_SALONS[0])!.address,
    )
    const listY = await page.evaluate(() => window.scrollY)
    await row.click()
    await expect(mapOf(page).getByRole('list')).toHaveCount(0)
    await expectMapCard(page, E2E_SALONS[0])
    await expect(mapOf(page).getByRole('heading', { level: 3 })).toBeFocused()
    await expectSelected(page, 0)
    expect(await page.evaluate(() => window.scrollY), 'the page does not scroll').toBe(listY)
  })

  test('× and «Показать салон» move focus; the view switch works from the keyboard', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(URL)
    await hydrated(page)
    const map = mapOf(page)

    await map.getByRole('button', { name: 'Скрыть карточку салона' }).click()
    const show = map.getByRole('button', { name: 'Показать салон', exact: true })
    await expect(show).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(map.getByRole('button', { name: 'Скрыть карточку салона' })).toBeFocused()
    await expectMapCard(page, E2E_SALONS[0])

    const asList = map.getByRole('button', { name: 'Списком' })
    await asList.focus()
    await page.keyboard.press('Enter')
    await expect(asList).toHaveAttribute('aria-pressed', 'true')
    await expect(map.getByRole('list')).toBeVisible()
    await page.keyboard.press('Shift+Tab')
    await expect(map.getByRole('button', { name: 'Карта' })).toBeFocused()
    await page.keyboard.press('Space')
    await expect(map.getByRole('button', { name: 'Карта' })).toHaveAttribute('aria-pressed', 'true')
    await expect(map.getByRole('list')).toHaveCount(0)
    await expectMapCard(page, E2E_SALONS[0])

    // Enter and Space on a card select it
    await cardButton(page, E2E_SALONS[2]).focus()
    await page.keyboard.press('Enter')
    await expectSelected(page, 2, false)
    await cardButton(page, E2E_SALONS[1]).focus()
    await page.keyboard.press('Space')
    await expectSelected(page, 1, false)
    await expectMapCard(page, E2E_SALONS[1])
  })

  for (const width of [390, 834, 1440] as const) {
    test(`${width}: «Показать салон» takes the closed card's place at the map's bottom-left`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: HEIGHTS[width] })
      await page.goto(URL)
      await hydrated(page)
      const map = mapOf(page)
      await map.getByRole('button', { name: 'Скрыть карточку салона' }).focus()
      await page.keyboard.press('Enter')
      const show = map.getByRole('button', { name: 'Показать салон', exact: true })
      await expect(show).toBeVisible()
      await map.screenshot({ path: `test-results/salons/show-salon-${width}.png` })
      await expectShowSalonAtCorner(map.locator('.bg-map-bg'), show)
    })
  }

  test('834: the end of the track selects the last salon', async ({ page }) => {
    await page.setViewportSize({ width: 834, height: 1194 })
    await page.goto(URL)
    await hydrated(page)
    await cardsOf(page)
      .locator('.snap-x')
      .evaluate((el) => el.scrollTo({ left: el.scrollWidth, behavior: 'instant' }))
    await expectSelected(page, E2E_SALONS.length - 1)
    await expectMapCard(page, E2E_SALONS[E2E_SALONS.length - 1])
  })

  // Programmatic scrolls: a segment pick lands on the card's snap target
  for (const width of [390, 834] as const) {
    test(`${width}: a segment pick scrolls to its card, which stays selected`, async ({ page }) => {
      await page.setViewportSize({ width, height: HEIGHTS[width] })
      await page.goto(URL)
      await hydrated(page)
      await settle(page)
      const track = trackOf(page)
      for (const index of [1, 2, 3, 0, 2]) {
        const ended = await armScrollEnd(track)
        await segment(page, E2E_SALONS[index]).click()
        await ended()
        await expectSelected(page, index)
        const left = await track.evaluate((el) => el.scrollLeft)
        // Mobile: the card at the start of the snapport; tablet: in its center — or at an end
        expect(
          Math.abs(await offsetFromTarget(track, index)),
          `card ${index} rests at its snap target`,
        ).toBeLessThan(1)
        // Nothing moves after the scroll has ended
        await page.waitForTimeout(300)
        expect(await track.evaluate((el) => el.scrollLeft)).toBe(left)
        await expectSelected(page, index)
        await expectMapCard(page, E2E_SALONS[index])
      }
    })
  }

  // Finger gestures. Linux Chromium (CI) scrolls the track by a synthetic touch only in a context
  // with touch emulation; Chrome on a Mac scrolls without it
  test.describe('touch', () => {
    test.use({ hasTouch: true })

    // #42: on tablet 44 % cards snapped by the start gave four cards three resting places — the
    // third salon could not be reached by a swipe
    for (const width of [390, 834] as const) {
      test(`${width}: swipes select every salon in turn, both ways`, async ({ page }) => {
        await page.setViewportSize({ width, height: HEIGHTS[width] })
        await page.goto(URL)
        await hydrated(page)
        await settle(page)
        const swipe = await swiper(page)
        await expectSelected(page, 0)
        for (const index of [1, 2, 3]) {
          await swipe(1)
          await expectSelected(page, index)
          await expectMapCard(page, E2E_SALONS[index])
          if (width === 834) {
            // The selected card's focus ring fits in the track in every position
            await page.keyboard.press('Shift')
            const button = cardButton(page, E2E_SALONS[index])
            await button.focus()
            expect(await button.evaluate((el) => el.matches(':focus-visible'))).toBe(true)
            expect(await ringRoom(button)).toBeGreaterThanOrEqual(4)
            await cardsOf(page).screenshot({
              path: `test-results/salons/salons-834-${index + 1}.png`,
            })
            await button.blur()
          }
        }
        for (const index of [2, 1, 0]) {
          await swipe(-1)
          await expectSelected(page, index)
          await expectMapCard(page, E2E_SALONS[index])
        }
        if (width === 834) {
          await page.keyboard.press('Shift')
          const button = cardButton(page, E2E_SALONS[0])
          await button.focus()
          expect(await ringRoom(button)).toBeGreaterThanOrEqual(4)
          await cardsOf(page).screenshot({ path: 'test-results/salons/salons-834-1.png' })
        }
      })
    }

    // A turn of the device changes the snap targets (start ↔ center): the selection stays, the closed
    // salon card over the map stays closed, the track moves to the selected card's new target.
    // Chrome re-snaps the track to the same card itself; «without re-snap» stands for a browser that
    // leaves the scroll position as it was (snapping is off during the resize)
    for (const [from, to, resnap] of [
      [390, 834, true],
      [834, 390, true],
      [390, 834, false],
      [834, 390, false],
    ] as const) {
      const how = resnap ? '' : ', without re-snap'
      test(`${from} → ${to}${how}: a resize keeps the selected salon and the closed card`, async ({
        page,
      }) => {
        // The third salon of the fixture
        const index = 2
        expect(E2E_SALONS[index]).toBe('Авиамоторная')
        await page.setViewportSize({ width: from, height: HEIGHTS[from] })
        await page.goto(URL)
        await hydrated(page)
        await settle(page)
        const swipe = await swiper(page)
        await swipe(1)
        await swipe(1)
        await expectSelected(page, index)
        await mapOf(page).getByRole('button', { name: 'Скрыть карточку салона' }).click()
        await expect(mapOf(page).getByRole('heading', { level: 3 })).toHaveCount(0)

        // Any other card pressed during the resize, even for a frame, is a flicker
        const track = trackOf(page)
        await track.evaluate((el) => {
          const w = window as Window & { pressed?: string[] }
          w.pressed = []
          new MutationObserver((records) => {
            for (const r of records) {
              const button = r.target as HTMLElement
              if (button.getAttribute('aria-pressed') === 'true') {
                w.pressed!.push(button.getAttribute('aria-labelledby') ?? '')
              }
            }
          }).observe(el, { attributes: true, attributeFilter: ['aria-pressed'], subtree: true })
        })
        if (!resnap) await track.evaluate((el) => el.style.setProperty('scroll-snap-type', 'none'))
        await page.setViewportSize({ width: to, height: HEIGHTS[to] })
        await expect
          .poll(async () => Math.abs(await offsetFromTarget(track, index)))
          .toBeLessThan(1)
        // Settled: nothing moves afterwards
        const left = await track.evaluate((el) => el.scrollLeft)
        await page.waitForTimeout(300)
        expect(await track.evaluate((el) => el.scrollLeft)).toBe(left)
        expect(
          await page.evaluate(() => (window as Window & { pressed?: string[] }).pressed),
          'no other salon selected on the way',
        ).toEqual([])
        await expectSelected(page, index)
        await expect(mapOf(page).getByRole('heading', { level: 3 })).toHaveCount(0)
        if (!resnap) {
          await track.evaluate((el) => el.style.removeProperty('scroll-snap-type'))
          await page.waitForTimeout(300)
          expect(Math.abs(await offsetFromTarget(track, index))).toBeLessThan(1)
          await expectSelected(page, index)
        }
        await expect(
          mapOf(page).getByRole('button', { name: 'Показать салон', exact: true }),
        ).toBeVisible()
      })
    }
  })

  // iOS Safari resizes the window on a vertical scroll too (its toolbars fold): only the height
  // changes, and the track must stay where the finger left it
  for (const width of [390, 834] as const) {
    test(`${width}: a resize of the height only leaves the track and the selection`, async ({
      page,
    }) => {
      const index = 2
      await page.setViewportSize({ width, height: HEIGHTS[width] })
      await page.goto(URL)
      await hydrated(page)
      await settle(page)
      const ended = await armScrollEnd(trackOf(page))
      await segment(page, E2E_SALONS[index]).click()
      await ended()
      await expectSelected(page, index)

      // Mid-swipe: the track off its target (snapping off, so that it stays there)
      const track = trackOf(page)
      await track.evaluate((el) => {
        el.style.setProperty('scroll-snap-type', 'none')
        el.scrollBy({ left: 40, behavior: 'instant' })
      })
      await page.waitForTimeout(300)
      await expectSelected(page, index)
      const left = await track.evaluate((el) => el.scrollLeft)
      expect(Math.abs(await offsetFromTarget(track, index))).toBeGreaterThan(30)

      await page.setViewportSize({ width, height: HEIGHTS[width] - 120 })
      await page.waitForTimeout(300)
      expect(await track.evaluate((el) => el.scrollLeft)).toBe(left)
      await expectSelected(page, index)
      await track.evaluate((el) => el.style.removeProperty('scroll-snap-type'))
    })
  }

  test('390: the focus ring of a selected card is not clipped (screenshot)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(URL)
    await hydrated(page)
    const button = cardButton(page, E2E_SALONS[0])
    await button.focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    await expect(button).toBeFocused()
    expect(await button.evaluate((el) => el.matches(':focus-visible'))).toBe(true)
    // The outline (2 + offset 2) stays inside the track's box: the track does not clip it
    const room = await button.evaluate((el) => {
      const track = el.closest('.snap-x')!.getBoundingClientRect()
      const card = el.getBoundingClientRect()
      return Math.min(card.top - track.top, track.bottom - card.bottom, card.left - track.left)
    })
    expect(room).toBeGreaterThanOrEqual(4)
    await cardsOf(page).screenshot({ path: 'test-results/salons/salons-focus-390.png' })
  })

  test('JSON-LD: breadcrumbs and a FurnitureStore per salon', async ({ page }) => {
    await page.goto(URL)
    const data = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((nodes) => nodes.map((n) => JSON.parse(n.textContent ?? '{}')))
    const breadcrumbs = data.find((d) => d['@type'] === 'BreadcrumbList')
    expect(breadcrumbs.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Главная', item: BASE },
      { '@type': 'ListItem', position: 2, name: layout.nav!.salons!.label, item: URL },
    ])
    const stores = data.filter((d) => d['@type'] === 'FurnitureStore')
    expect(stores.map((s) => s.name)).toEqual(E2E_SALONS.map((name) => `MGS MEBEL — ${name}`))
    for (const store of stores) {
      expect(store['@id']).toMatch(new RegExp(`^${URL}#\\d+$`))
      expect(store.url).toBe(URL)
      expect(store.address).toMatchObject({ '@type': 'PostalAddress' })
      expect(store.image).toMatch(/^http:\/\/localhost:3000\/api\/media\/file\//)
    }
    expect(new Set(stores.map((s) => s['@id'])).size).toBe(stores.length)
    // The last one has no phone; the fixture has no coordinates and opening hours
    expect(stores.at(-1).telephone).toBeUndefined()
    expect(stores.some((s) => 'geo' in s || 'openingHours' in s)).toBe(false)
  })

  test.describe('card videos without hover: the selected card plays', () => {
    test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

    test('only the selected card; the one left pauses and shows its photo', async ({ page }) => {
      await stubPlayback(page)
      await page.goto(URL)
      expect(await page.evaluate((q) => matchMedia(q).matches, HOVER_QUERY)).toBe(false)
      await hydrated(page)

      const first = slide(page, 0).locator('video')
      await expect(first).toHaveCount(1)
      await expect.poll(() => playback(first)).toBe('playing')
      await expect(first).toHaveClass(/opacity-100/)
      await expect(cardsOf(page).locator('video')).toHaveCount(1)

      await cardButton(page, E2E_SALONS[2]).tap()
      const third = slide(page, 2).locator('video')
      await expect.poll(() => playback(third)).toBe('playing')
      await expect.poll(() => playback(first)).toBe('paused')
      await expect(first).toHaveClass(/opacity-0/)
      // No video on a card without one
      await cardButton(page, E2E_SALONS[1]).tap()
      await expect(slide(page, 1).locator('video')).toHaveCount(0)
      await expect.poll(() => playback(third)).toBe('paused')
    })
  })

  test.describe('card videos with hover: the card under the pointer plays', () => {
    test.use({ viewport: { width: 1440, height: 900 }, hasTouch: false })

    test('plays on hover and keyboard focus, back to the photo on leave', async ({ page }) => {
      await stubPlayback(page)
      await page.goto(URL)
      expect(await page.evaluate((q) => matchMedia(q).matches, HOVER_QUERY)).toBe(true)
      await hydrated(page)
      // Nothing plays until hovered, the selected card included
      await expect(cardsOf(page).locator('video')).toHaveCount(0)

      await slide(page, 2).hover()
      const third = slide(page, 2).locator('video')
      await expect.poll(() => playback(third)).toBe('playing')
      await expect(third).toHaveClass(/opacity-100/)
      await expect(slide(page, 2).locator('.backdrop-blur-soft')).toHaveClass(/opacity-0/)

      await page.mouse.move(5, 5)
      await expect.poll(() => playback(third)).toBe('paused')
      await expect(third).toHaveClass(/opacity-0/)
      await expect(slide(page, 2).locator('.backdrop-blur-soft')).not.toHaveClass(/opacity-0/)

      // At most one: keyboard focus on the first takes over from the hovered third
      await slide(page, 2).hover()
      await expect.poll(() => playback(third)).toBe('playing')
      await cardButton(page, E2E_SALONS[1]).focus()
      await page.keyboard.press('Shift+Tab')
      await expect(cardButton(page, E2E_SALONS[0])).toBeFocused()
      const first = slide(page, 0).locator('video')
      await expect.poll(() => playback(first)).toBe('playing')
      await expect.poll(() => playback(third)).toBe('paused')
    })
  })

  test('reduced motion: photos only, no mp4 requested', async ({ browser }) => {
    const context = await newConsentContext(browser, {
      reducedMotion: 'reduce',
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    })
    const page = await context.newPage()
    const videos: string[] = []
    page.on('request', (r) => r.url().endsWith('.mp4') && videos.push(r.url()))
    await page.goto(URL)
    await hydrated(page)
    await cardButton(page, E2E_SALONS[2]).tap()
    await page.waitForTimeout(500)
    await expect(cardsOf(page).locator('video')).toHaveCount(0)
    expect(videos).toEqual([])
    await context.close()
  })
})

test('salons on an empty database: no cards and no map @empty', async ({ page }) => {
  test.skip(!EMPTY_DB, 'empty database only')
  const errors = watchConsole(page)
  const response = await page.goto(URL)
  expect(response?.status()).toBe(200)
  // A never-saved page global reads as {} for visitors (published only), so `map.emptyText` and
  // the hotline are both missing here: the empty state with them is covered by unit tests
  // (SalonsEmpty) and a fixture check in the PR.
  await expect(page.getByRole('region', { name: 'Салоны', exact: true })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Салоны на карте' })).toHaveCount(0)
  await expect(page.locator('main h2')).toHaveCount(0)
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1)
  expect(await axe(page)).toEqual([])
  expect(errors).toEqual([])
})
