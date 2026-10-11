import { act, fireEvent, render, renderHook, screen, within } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SalonPanel } from '@/components/salons/SalonPanel'
import { SalonsEmpty } from '@/components/salons/SalonsEmpty'
import { SalonsExplorer } from '@/components/salons/SalonsExplorer'
import { useHoverCapable } from '@/hooks/useHoverCapable'
import { openingHoursSchema, salonJsonLd } from '@/lib/jsonld'
import { toSalonView, type SalonView } from '@/lib/salons'
import type { SalonCardData } from '@/lib/queries'
import { nearestSlide, snapTargets } from '@/lib/slider'
import { photo, video } from './fixtures'
import { env, intersect } from './setup'

const SITE = 'http://localhost:3000'

const card = (id: number, name: string, extra: Partial<SalonCardData> = {}): SalonCardData => ({
  id,
  name,
  address: `${name}, адрес`,
  phone: '8-495-777-35-75',
  hours: null,
  location: { lat: null, lng: null },
  poster: photo,
  reviewVideo: null,
  order: id,
  ...extra,
})

const CARDS = [
  card(1, 'Пражская', { reviewVideo: video }),
  card(2, 'Авиамоторная'),
  card(3, 'Химки', { reviewVideo: video }),
  card(4, 'Румянцево', { phone: null }),
]
const VIEWS: SalonView[] = CARDS.map(toSalonView)
const whatsapp = { kind: 'whatsapp' as const, href: 'https://wa.me/79270963555' }

describe('openingHoursSchema', () => {
  it.each([
    ['Пн–Вс 10:00–21:00', ['Mo-Su 10:00-21:00']],
    ['пн-пт 9:00-21:00; сб – вс 11:00 — 20:00', ['Mo-Fr 09:00-21:00', 'Sa-Su 11:00-20:00']],
    ['Пн, Ср, Пт 10:00-19:00', ['Mo,We,Fr 10:00-19:00']],
    ['Пн.–Пт. 10:00–24:00;', ['Mo-Fr 10:00-24:00']],
    ['10:00–21:00', ['Mo-Su 10:00-21:00']],
  ])('%s', (text, expected) => {
    expect(openingHoursSchema(text)).toEqual(expected)
  })

  it('is empty without text and null for anything it cannot read', () => {
    expect(openingHoursSchema(null)).toEqual([])
    expect(openingHoursSchema('  ')).toEqual([])
    for (const text of [
      'Mo-Su 10:00-21:00',
      'ежедневно',
      'Пн–Вс 25:00–21:00',
      'Пн–Хх 10:00–21:00',
      'Пн–Вс 10:60–21:00',
      'Пн–Вс',
    ]) {
      expect(openingHoursSchema(text), text).toBeNull()
    }
  })
})

describe('salonJsonLd', () => {
  it('a FurnitureStore with the page anchor as @id, the brand in the name, the card photo', () => {
    expect(salonJsonLd(CARDS[0])).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FurnitureStore',
      '@id': `${SITE}/salons#1`,
      name: 'MGS MEBEL — Пражская',
      url: `${SITE}/salons`,
      address: { '@type': 'PostalAddress', streetAddress: 'Пражская, адрес' },
      telephone: '8-495-777-35-75',
      image: `${SITE}/api/media/file/kitchen-960x640.jpg`,
    })
  })

  it('geo only with both coordinates, openingHours only when readable, no phone or photo', () => {
    const full = salonJsonLd(
      card(5, 'Химки', { location: { lat: 55.9, lng: 37.4 }, hours: 'Пн–Вс 10:00–22:00' }),
    )
    expect(full.geo).toEqual({ '@type': 'GeoCoordinates', latitude: 55.9, longitude: 37.4 })
    expect(full.openingHours).toEqual(['Mo-Su 10:00-22:00'])

    const bare = salonJsonLd(
      card(6, 'Химки', {
        location: { lat: 55.9, lng: null },
        hours: 'круглосуточно',
        phone: ' ',
        poster: null,
      }),
    )
    for (const key of ['geo', 'openingHours', 'telephone', 'image'])
      expect(bare).not.toHaveProperty(key)
  })
})

/** A salons track: page gutter, `share` of the content width per card, gap 12. */
const track = (viewport: number, gutter: number, share: number, count: number) => {
  const content = viewport - 2 * gutter
  const width = content * share
  const slides = Array.from({ length: count }, (_, i) => ({
    left: gutter + i * (width + 12),
    width,
  }))
  const scrollWidth = 2 * gutter + count * width + (count - 1) * 12
  return { slides, maxScroll: scrollWidth - viewport }
}

describe('snapTargets + nearestSlide', () => {
  it('390: 82 % cards snap by the start — four cards, four targets, each its own card', () => {
    const { slides, maxScroll } = track(390, 20, 0.82, 4)
    const targets = snapTargets(
      slides,
      { width: 390, paddingStart: 20, paddingEnd: 0, maxScroll },
      'start',
    )
    expect(targets.map((t) => Math.round(t))).toEqual([0, 299, 598, 834])
    targets.forEach((target, i) => expect(nearestSlide(targets, target)).toBe(i))
    expect(nearestSlide(targets, 140)).toBe(0)
    expect(nearestSlide(targets, 160)).toBe(1)
  })

  it('834: 44 % cards snap by the center — four different targets, the third one reachable', () => {
    const { slides, maxScroll } = track(834, 32, 0.44, 4)
    const geometry = { width: 834, paddingStart: 32, paddingEnd: 32, maxScroll }
    const targets = snapTargets(slides, geometry, 'center')
    ;[0, 135.2, 486, 621.2].forEach((expected, i) => expect(targets[i]).toBeCloseTo(expected, 1))
    targets.forEach((target, i) => expect(nearestSlide(targets, target)).toBe(i))
    // By the start the last two cards would share the end of the track (#42)
    const byStart = snapTargets(slides, geometry, 'start')
    expect(byStart[2]).toBeCloseTo(maxScroll, 5)
    expect(byStart[3]).toBeCloseTo(maxScroll, 5)
  })

  it('handles two and one card without scrolling, and no cards', () => {
    for (const count of [2, 1]) {
      const { slides, maxScroll } = track(834, 32, 0.44, count)
      expect(maxScroll).toBeLessThan(0)
      const targets = snapTargets(
        slides,
        { width: 834, paddingStart: 32, paddingEnd: 32, maxScroll },
        'center',
      )
      expect(targets).toEqual(Array(count).fill(0))
      expect(nearestSlide(targets, 0)).toBe(0)
    }
    expect(nearestSlide([], 0)).toBe(0)
  })
})

describe('useHoverCapable', () => {
  it('reads (hover: hover) and (pointer: fine); null on the server', () => {
    env.hover = true
    expect(renderHook(() => useHoverCapable()).result.current).toBe(true)
    env.hover = false
    expect(renderHook(() => useHoverCapable()).result.current).toBe(false)
    const Probe = () => <span>{String(useHoverCapable())}</span>
    expect(renderToString(<Probe />)).toContain('null')
  })
})

describe('toSalonView', () => {
  it('keeps only what the island needs', () => {
    const view = toSalonView({ ...CARDS[0], hours: 'Пн–Вс 10:00–21:00' })
    expect(Object.keys(view).sort()).toEqual(
      ['address', 'id', 'location', 'name', 'phone', 'poster', 'video'].sort(),
    )
    expect(view.poster).toMatchObject({ src: photo.sizes!.card!.url, position: '30% 70%' })
    expect(view.video).toEqual({ src: video.url, type: 'video/mp4' })
    expect(toSalonView(card(9, 'Без фото', { poster: null, phone: ' ' }))).toMatchObject({
      poster: null,
      video: null,
      phone: null,
    })
  })
})

const renderExplorer = (salons = VIEWS) =>
  render(
    <SalonsExplorer
      salons={salons}
      ctaLabel="Заказать персональный дизайн"
      messengers={[whatsapp]}
      listCaption="в Москве и области"
    />,
  )

const cards = () => screen.getByRole('region', { name: 'Салоны' })
const mapRegion = () => screen.getByRole('region', { name: 'Салоны на карте' })
const cardButton = (name: string) => within(cards()).getByRole('button', { name })
const mapTitle = () => within(mapRegion()).queryByRole('heading', { level: 3 })

const expectSelected = (index: number) => {
  VIEWS.forEach((salon, i) => {
    expect(cardButton(salon.name).getAttribute('aria-pressed')).toBe(String(i === index))
    expect(
      screen
        .getByRole('button', { name: `Показать салон ${salon.name}` })
        .getAttribute('aria-current'),
    ).toBe(i === index ? 'true' : null)
  })
  expect(mapTitle()?.textContent).toBe(VIEWS[index].name)
}

describe('SalonsExplorer', () => {
  it('headings, carousel slides «k из N», the first salon selected', () => {
    renderExplorer()
    expect(cards().getAttribute('aria-roledescription')).toBe('карусель')
    expect(within(cards()).getByRole('heading', { level: 2 }).textContent).toBe('Салоны')
    expect(
      within(cards())
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(VIEWS.map((s) => s.name))
    expect(within(cards()).getByRole('group', { name: '2 из 4' })).toBeTruthy()
    expect(cardButton('Пражская').getAttribute('aria-describedby')).toBeTruthy()
    expectSelected(0)
  })

  it('a pick by card, segment or list row selects the salon everywhere and opens its card', () => {
    renderExplorer()
    fireEvent.click(cardButton('Авиамоторная'))
    expectSelected(1)

    fireEvent.click(within(mapRegion()).getByRole('button', { name: 'Скрыть карточку салона' }))
    expect(mapTitle()).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Показать салон Химки' }))
    expectSelected(2)

    fireEvent.click(within(mapRegion()).getByRole('button', { name: 'Списком' }))
    expect(within(mapRegion()).getByText('4 салона в Москве и области')).toBeTruthy()
    const row = within(mapRegion()).getByRole('button', { name: 'Румянцево' })
    expect(row.getAttribute('aria-current')).toBeNull()
    expect(
      within(mapRegion()).getByRole('button', { name: 'Химки' }).getAttribute('aria-current'),
    ).toBe('true')
    fireEvent.click(row)
    expect(within(mapRegion()).queryByRole('list')).toBeNull()
    expectSelected(3)
    expect(document.activeElement).toBe(mapTitle())
  })

  describe('resize', () => {
    // 390: cards 287 + gap 12; jsdom has no snap styles — start, no scroll-padding, so the targets
    // are the offsets: 0 / 299 / 598 / 834 (the end of the track)
    const LEFTS = [0, 299, 598, 897]
    let frames: FrameRequestCallback[] = []

    /** The track with the 390 geometry; `scrollLeft` is writable (jsdom keeps it at 0). */
    const setUpTrack = () => {
      const track = cards().querySelector<HTMLElement>('.snap-x')!
      Object.defineProperty(track, 'clientWidth', { configurable: true, value: 390 })
      Object.defineProperty(track, 'scrollWidth', { configurable: true, value: 1224 })
      Object.defineProperty(track, 'scrollLeft', { configurable: true, writable: true, value: 0 })
      Array.from(track.children).forEach((child, i) => {
        Object.defineProperty(child, 'offsetLeft', { configurable: true, value: LEFTS[i] })
        Object.defineProperty(child, 'offsetWidth', { configurable: true, value: 287 })
      })
      return track
    }

    const flushFrames = () =>
      act(() => {
        const run = frames
        frames = []
        run.forEach((cb) => cb(0))
      })

    const pressed = () =>
      VIEWS.map((salon) => cardButton(salon.name).getAttribute('aria-pressed') === 'true')

    beforeEach(() => {
      frames = []
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => frames.push(cb))
      vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
        frames[id - 1] = () => {}
      })
      vi.mocked(Element.prototype.scrollTo).mockClear()
    })

    afterEach(() => vi.restoreAllMocks())

    it('keeps the selected salon and the closed card; the track moves to its target at once', () => {
      renderExplorer()
      const track = setUpTrack()
      // The third salon
      fireEvent.click(screen.getByRole('button', { name: 'Показать салон Химки' }))
      fireEvent(track, new Event('scrollend'))
      fireEvent.click(within(mapRegion()).getByRole('button', { name: 'Скрыть карточку салона' }))
      vi.mocked(Element.prototype.scrollTo).mockClear()

      // After the resize the track rests nearer to the next card's target
      track.scrollLeft = 800
      fireEvent(window, new Event('resize'))
      // The browser's own re-snap before the next frame does not pick a card
      fireEvent.scroll(track)
      flushFrames()

      expect(pressed()).toEqual([false, false, true, false])
      expect(mapTitle()).toBeNull()
      expect(Element.prototype.scrollTo).toHaveBeenCalledTimes(1)
      expect(Element.prototype.scrollTo).toHaveBeenCalledWith({ left: 598, behavior: 'auto' })
    })

    it('on its target or without scrolling: no scroll, and swipes pick cards again', () => {
      renderExplorer()
      const track = setUpTrack()
      fireEvent(window, new Event('resize'))
      flushFrames()
      expect(Element.prototype.scrollTo).not.toHaveBeenCalled()

      // xl: a grid, nothing to scroll
      Object.defineProperty(track, 'scrollWidth', { configurable: true, value: 390 })
      track.scrollLeft = 300
      fireEvent(window, new Event('resize'))
      flushFrames()
      expect(Element.prototype.scrollTo).not.toHaveBeenCalled()
      expect(pressed()).toEqual([true, false, false, false])

      // The hold is released: a swipe selects the card it rests on
      Object.defineProperty(track, 'scrollWidth', { configurable: true, value: 1224 })
      track.scrollLeft = 834
      fireEvent.scroll(track)
      flushFrames()
      expect(pressed()).toEqual([false, false, false, true])
      expect(mapTitle()?.textContent).toBe(VIEWS[3].name)
    })
  })

  it('one salon: no segments', () => {
    renderExplorer(VIEWS.slice(0, 1))
    expect(screen.queryByRole('button', { name: /^Показать салон / })).toBeNull()
    expect(cardButton('Пражская').getAttribute('aria-pressed')).toBe('true')
  })

  it('a badge only on cards with a video; no photo — the surface', () => {
    const { container } = renderExplorer([VIEWS[0], { ...VIEWS[1], poster: null }])
    const slides = within(cards()).getAllByRole('group')
    expect(slides[0].querySelector('[aria-hidden="true"].rounded-full')).toBeTruthy()
    expect(slides[1].querySelector('[aria-hidden="true"].rounded-full')).toBeNull()
    expect(slides[1].querySelector('img')).toBeNull()
    expect(slides[1].querySelector('.bg-surface')).toBeTruthy()
    expect(container.querySelectorAll('img')).toHaveLength(1)
  })

  it('without hover: the video of the selected card only', () => {
    const { container } = renderExplorer()
    act(() => intersect(true))
    expect(container.querySelectorAll('video')).toHaveLength(1)
    expect(within(cards()).getAllByRole('group')[0].querySelector('video')).toBeTruthy()

    fireEvent.click(cardButton('Химки'))
    act(() => intersect(true))
    const videos = container.querySelectorAll('video')
    expect(within(cards()).getAllByRole('group')[2].querySelector('video')).toBeTruthy()
    // The first stays mounted, paused
    expect(videos).toHaveLength(2)
  })

  it('with hover: nothing plays until a card is hovered; one card at a time', () => {
    env.hover = true
    const { container } = renderExplorer()
    act(() => intersect(true))
    expect(container.querySelector('video')).toBeNull()

    const slides = within(cards()).getAllByRole('group')
    fireEvent.pointerEnter(slides[2].querySelector('article')!)
    act(() => intersect(true))
    expect(slides[2].querySelector('video')).toBeTruthy()
    expect(slides[0].querySelector('video')).toBeNull()

    fireEvent.pointerEnter(slides[0].querySelector('article')!)
    act(() => intersect(true))
    expect(slides[0].querySelector('video')).toBeTruthy()
    fireEvent.pointerLeave(slides[0].querySelector('article')!)
  })
})

describe('SalonPanel, controlled', () => {
  const salon = { name: 'Пражская', address: 'Кировоградская, 15', phone: null }

  it('follows `open`, reports × / «Показать салон», does not steal focus on a page change', () => {
    const changes: boolean[] = []
    const { rerender } = render(
      <SalonPanel salon={salon} messengers={[]} open onOpenChange={(o) => changes.push(o)} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Скрыть карточку салона' }))
    expect(changes).toEqual([false])
    rerender(
      <SalonPanel
        salon={salon}
        messengers={[]}
        open={false}
        onOpenChange={(o) => changes.push(o)}
      />,
    )
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Показать салон' }))

    // The page opens it (a new pick): focus stays where it was
    const outside = document.createElement('button')
    document.body.append(outside)
    outside.focus()
    rerender(
      <SalonPanel salon={salon} messengers={[]} open onOpenChange={(o) => changes.push(o)} />,
    )
    expect(document.activeElement).toBe(outside)
    outside.remove()
  })
})

describe('SalonsEmpty', () => {
  it('the text and the hotline tel: link; nothing without both', () => {
    const { container, rerender } = render(
      <SalonsEmpty
        text="Скоро откроемся"
        phone={{ display: '8 800 100-16-58', href: 'tel:88001001658' }}
      />,
    )
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Скоро откроемся')
    expect(screen.getByRole('link', { name: '8 800 100-16-58' }).getAttribute('href')).toBe(
      'tel:88001001658',
    )
    rerender(<SalonsEmpty text=" " />)
    expect(container.innerHTML).toBe('')
  })
})
