import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { WorkViewer } from '@/components/works/WorkViewer'
import { WorkViewPanel } from '@/components/works/WorkViewPanel'
import { createItemLoader, PREFETCH_INTENT_MS } from '@/lib/workItemLoader'
import {
  ctaLabel,
  formatPrice,
  formatTime,
  frameCounter,
  itemFrames,
  itemViewHref,
  parseItemId,
  parsePhoto,
  playRefusal,
  progressShare,
  readItemView,
  rotate,
  slideOffset,
  specRows,
  stripPlaces,
  toViewerItem,
  typeFeedHref,
  type ViewerItem,
  type ViewerItemRow,
} from '@/lib/workView'
import { isOverlay } from '@/lib/overlay'
import type { Media } from '@/payload-types'
import { photo, video } from './fixtures'

const posterVideo: Media = { ...video, id: 7, poster: photo }
const tall: Media = { ...photo, id: 5, width: 1200, height: 1800 }

const row = (extra: Partial<ViewerItemRow> = {}): ViewerItemRow => ({
  id: 4,
  title: null,
  type: 'bathrooms',
  project: null,
  photos: [photo, tall],
  videos: [posterVideo],
  description: 'Первый абзац\nс переносом.\n\nВторой абзац.',
  specs: { korpus: 'ЛДСП Egger 18 мм', fasady: ' ', furn: 'Blum' },
  extraSpecs: [
    { label: 'Столешница', value: 'Кварц' },
    { label: 'Подсветка', value: '' },
  ],
  price: 1250000,
  ctaLabel: null,
  hidden: false,
  ...extra,
})

const viewItem = (extra: Partial<ViewerItemRow> = {}) => toViewerItem(row(extra))!

const MAX = { kind: 'max' as const, href: 'https://max.ru/u/x' }

describe('view address', () => {
  it('builds the feed, the item and the frame; the first frame is not written', () => {
    expect(itemViewHref({ type: 'kitchens', id: 12 })).toBe('/works?category=kitchens&item=12')
    expect(itemViewHref({ type: 'kitchens', id: 12, photo: 1 })).toBe(
      '/works?category=kitchens&item=12',
    )
    expect(itemViewHref({ type: 'kitchens', id: 12, photo: 3 })).toBe(
      '/works?category=kitchens&item=12&photo=3',
    )
    expect(typeFeedHref('bathrooms')).toBe('/works?category=bathrooms')
  })

  it('reads a whole positive id only', () => {
    expect(parseItemId('12')).toBe(12)
    expect(parseItemId(12)).toBe(12)
    for (const bad of ['0', '-1', '1.5', '012', 'abc', '', ' 1', '99999999999999999', null, 1.5, 0])
      expect(parseItemId(bad)).toBeNull()
    expect(readItemView(new URLSearchParams('item=3&photo=2'))).toEqual({ item: 3, photo: '2' })
    expect(readItemView(new URLSearchParams('category=x'))).toEqual({ item: null, photo: null })
  })

  it('takes the frame of ?photo= in range, else the first', () => {
    expect(parsePhoto('2', 3)).toBe(1)
    expect(parsePhoto('3', 3)).toBe(2)
    for (const bad of ['0', '4', 'x', '', null, '1.5']) expect(parsePhoto(bad, 3)).toBe(0)
  })
})

describe('view of an item', () => {
  it('frames: photos at their own ratio, then videos with a poster', () => {
    const frames = itemFrames(row({ videos: [posterVideo, video] }))
    expect(frames.map((f) => [f.key, f.kind, f.owner])).toEqual([
      ['p-4-0', 'photo', 4],
      ['p-4-1', 'photo', 4],
      ['v-4-0', 'video', 4],
    ])
    expect(frames[0]!.ratio).toBeCloseTo(1.5)
    expect(frames[1]!.ratio).toBeCloseTo(2 / 3)
    expect(frames[2]).toMatchObject({ image: photo, video: { src: video.url, type: 'video/mp4' } })
  })

  it('panel data: title by type, paragraphs, specs without empty rows, price, CTA', () => {
    expect(viewItem()).toMatchObject({
      id: 4,
      type: 'bathrooms',
      title: 'Санузел',
      text: ['Первый абзац с переносом.', 'Второй абзац.'],
      specs: [
        { label: 'Корпус', value: 'ЛДСП Egger 18 мм' },
        { label: 'Фурнитура', value: 'Blum' },
        { label: 'Столешница', value: 'Кварц' },
      ],
      price: '1 250 000 ₽',
      cta: 'Хочу такой же',
      project: null,
    })
  })

  it('specs, price and CTA', () => {
    expect(specRows({ specs: undefined, extraSpecs: null })).toEqual([])
    expect(formatPrice(950000)).toBe('950 000 ₽')
    expect(formatPrice(0)).toBe('0 ₽')
    expect(formatPrice(null)).toBeNull()
    expect(ctaLabel({ ctaLabel: '  ', type: 'kitchens' })).toBe('Хочу такую же')
    expect(ctaLabel({ ctaLabel: null, type: 'bathrooms' })).toBe('Хочу такой же')
    expect(ctaLabel({ ctaLabel: 'Рассчитать', type: 'kitchens' })).toBe('Рассчитать')
  })

  it('nothing for a hidden item, an item of a hidden project or without frames', () => {
    const project = { id: 2, title: 'Квартира', slug: 'kvartira', complex: true, hidden: false }
    expect(viewItem({ project: project as never }).project).toEqual({
      slug: 'kvartira',
      title: 'Квартира',
    })
    // Not complex: no «Весь проект»
    expect(viewItem({ project: { ...project, complex: false } as never }).project).toBeNull()
    expect(toViewerItem(row({ hidden: true }))).toBeNull()
    expect(toViewerItem(row({ project: { ...project, hidden: true } as never }))).toBeNull()
    expect(toViewerItem(row({ photos: [], videos: [] }))).toBeNull()
    expect(toViewerItem(null)).toBeNull()
  })
})

describe('strip and counter', () => {
  it('goes round: rotated order, places kept around the current frame', () => {
    expect(rotate([0, 1, 2, 3], 2)).toEqual([2, 3, 0, 1])
    expect(rotate([], 2)).toEqual([])
    expect(stripPlaces(1)).toEqual([0])
    expect(stripPlaces(2)).toEqual([-1, 0, 1])
    expect(stripPlaces(5)).toEqual([-2, -1, 0, 1, 2])
  })

  it('places a frame by the widths in between, no px', () => {
    const ratio = (d: number) => [0.5, 0.75, 1.5, 2, 1][d + 2]!
    expect(slideOffset(ratio, 0)).toBe('calc(min(100cqh * 1.5, var(--viewer-slide-max)) / -2)')
    expect(slideOffset(ratio, 2)).toBe(
      'calc(min(100cqh * 1.5, var(--viewer-slide-max)) / 2 + var(--viewer-gap) + ' +
        'min(100cqh * 2, var(--viewer-slide-max)) + var(--viewer-gap))',
    )
    expect(slideOffset(ratio, -1)).toBe(
      'calc(-1 * (min(100cqh * 1.5, var(--viewer-slide-max)) / 2 + var(--viewer-gap) + ' +
        'min(100cqh * 0.75, var(--viewer-slide-max))))',
    )
  })

  it('counts the frames of the current item', () => {
    const frames = [...itemFrames(row()), ...itemFrames({ id: 9, photos: [photo], videos: [] })]
    expect(frameCounter(frames, 0)).toBe('1 / 3')
    expect(frameCounter(frames, 2)).toBe('3 / 3')
    expect(frameCounter(frames, 3)).toBe('1 / 1')
  })

  it('video helpers', () => {
    expect(progressShare(5, 20)).toBe(0.25)
    expect(progressShare(30, 20)).toBe(1)
    expect(progressShare(5, NaN)).toBe(0)
    expect(formatTime(65.4)).toBe('1:05')
    expect(formatTime(NaN)).toBe('0:00')
    expect(playRefusal({ name: 'AbortError' }, true)).toBe('ignore')
    expect(playRefusal({ name: 'NotAllowedError' }, false)).toBe('retry-muted')
    expect(playRefusal({ name: 'NotAllowedError' }, true)).toBe('fallback')
  })
})

describe('item loader', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const deferred = () => {
    let resolve!: (item: ViewerItem | null) => void
    const promise = new Promise<ViewerItem | null>((r) => (resolve = r))
    return { promise, resolve }
  }

  it('prefetches after the intent time, one at a time, never twice', async () => {
    const calls: number[] = []
    const pending = new Map<number, ReturnType<typeof deferred>>()
    const loader = createItemLoader((id) => {
      calls.push(id)
      const d = deferred()
      pending.set(id, d)
      return d.promise
    })
    loader.intent(1)
    vi.advanceTimersByTime(PREFETCH_INTENT_MS - 1)
    expect(calls).toEqual([])
    vi.advanceTimersByTime(1)
    expect(calls).toEqual([1])
    // Another intent while one is in flight: dropped
    loader.intent(2)
    vi.advanceTimersByTime(PREFETCH_INTENT_MS)
    expect(calls).toEqual([1])
    // A click on it does not wait: its own request at once
    void loader.load(2)
    expect(calls).toEqual([1, 2])
    // A click on the prefetched one takes its request
    const same = loader.load(1)
    expect(calls).toEqual([1, 2])
    pending.get(1)!.resolve(null)
    await expect(same).resolves.toBeNull()
    // Asked already: no new request
    loader.intent(1)
    vi.advanceTimersByTime(PREFETCH_INTENT_MS)
    expect(calls).toEqual([1, 2])
  })

  it('a left tile cancels the intent; a failed request is tried again', async () => {
    let fail = true
    const calls: number[] = []
    const loader = createItemLoader(async (id) => {
      calls.push(id)
      if (fail) throw new Error('offline')
      return null
    })
    loader.intent(3)
    loader.cancelIntent()
    vi.advanceTimersByTime(PREFETCH_INTENT_MS)
    expect(calls).toEqual([])
    await expect(loader.load(3)).rejects.toThrow('offline')
    fail = false
    await expect(loader.load(3)).resolves.toBeNull()
    expect(calls).toEqual([3, 3])
    // Lite network: no prefetch
    const lite = createItemLoader(async () => null, { lite: () => true })
    lite.intent(4)
    vi.advanceTimersByTime(PREFETCH_INTENT_MS)
  })
})

describe('WorkViewPanel', () => {
  it('title, text, specs, price with its date, CTA by gender', () => {
    render(<WorkViewPanel item={viewItem()} priceDate="октябрь 2026" messengers={[MAX]} />)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Санузел')
    expect(screen.getByText('Второй абзац.')).toBeTruthy()
    expect(screen.getAllByRole('term').map((t) => t.textContent)).toEqual([
      'Корпус',
      'Фурнитура',
      'Столешница',
    ])
    expect(screen.getByText('Стоимость')).toBeTruthy()
    expect(screen.getByText('Цена актуальна на октябрь 2026')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Хочу такой же/ })).toBeTruthy()
    expect(screen.getByText('Рассчитаем под ваши размеры')).toBeTruthy()
    expect(screen.queryByText('Весь проект')).toBeNull()
  })

  it('no price, no date, no messengers: those parts are left out; «Весь проект» of a complex', () => {
    const item = viewItem({
      price: null,
      project: {
        id: 2,
        title: 'Квартира',
        slug: 'kvartira',
        complex: true,
        hidden: false,
      } as never,
    })
    render(<WorkViewPanel item={item} priceDate={null} messengers={[]} />)
    expect(screen.queryByText('Стоимость')).toBeNull()
    expect(screen.queryByText(/Цена актуальна/)).toBeNull()
    expect(screen.queryByText('Рассчитаем под ваши размеры')).toBeNull()
    expect(screen.getByRole('link', { name: /Весь проект/ }).getAttribute('href')).toBe(
      '/works/kvartira',
    )
  })
})

describe('WorkViewer', () => {
  const props = (item: ViewerItem) => ({
    frames: item.frames,
    owners: { [item.id]: item },
    start: 0,
    onIndex: vi.fn(),
    onClose: vi.fn(),
    closeHref: '/works?category=bathrooms',
    onClosed: vi.fn(),
    priceDate: null,
    messengers: [],
  })

  it('a dialog named by the item, the focus on ×, the page covered; closed — all back', () => {
    const p = props(viewItem())
    const { unmount } = render(<WorkViewer {...p} />)
    const dialog = screen.getByRole('dialog', { name: 'Санузел' })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    const close = within(dialog).getByRole('link', { name: 'Закрыть' })
    expect(document.activeElement).toBe(close)
    expect(close.getAttribute('href')).toBe('/works?category=bathrooms')
    expect(isOverlay('viewer')).toBe(true)
    expect(document.documentElement.style.overflow).toBe('hidden')
    fireEvent.click(close)
    expect(p.onClose).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(p.onClose).toHaveBeenCalledTimes(2)
    unmount()
    expect(isOverlay('viewer')).toBe(false)
    expect(document.documentElement.style.overflow).toBe('')
    expect(p.onClosed).toHaveBeenCalledTimes(1)
  })

  it('≥ 1280: arrows and keys go round, the counter follows; one frame — none of them', () => {
    const base = window.matchMedia
    window.matchMedia = ((query: string) => ({
      ...base(query),
      matches: query.includes('min-width: 1280px') || query.includes('min-width: 768px'),
    })) as typeof window.matchMedia
    try {
      const p = props(viewItem())
      const { container, unmount } = render(<WorkViewer {...p} />)
      const counter = () => container.querySelector('[data-view-strip] ~ p')?.textContent
      expect(counter()).toBe('1 / 3')
      const next = screen.getByRole('button', { name: 'Следующее фото' })
      act(() => next.click())
      act(() => next.click())
      expect(counter()).toBe('3 / 3')
      act(() => next.click())
      expect(counter()).toBe('1 / 3')
      fireEvent.keyDown(window, { key: 'ArrowLeft' })
      expect(counter()).toBe('3 / 3')
      expect(p.onIndex.mock.calls.map(([i]) => i)).toEqual([1, 2, 0, 2])

      // A step keeps the frames' nodes: the neighbour becomes the current one, its image the same
      const slide = (at: string) => container.querySelector<HTMLElement>(`[data-slide="${at}"]`)!
      const right = slide('1')
      const image = right.querySelector('img')
      expect(right.getAttribute('aria-hidden')).toBe('true')
      expect(right.className).toContain('opacity-35')
      act(() => next.click())
      expect(slide('current')).toBe(right)
      expect(right.querySelector('img')).toBe(image)
      expect(right.hasAttribute('aria-hidden')).toBe(false)
      expect(right.className).not.toContain('opacity-35')
      // A neighbour steps on a click of its backing button, out of the tab order
      const left = slide('-1')
      const back = left.querySelector('button')!
      expect(back.tabIndex).toBe(-1)
      act(() => back.click())
      expect(slide('current')).toBe(left)
      unmount()

      render(<WorkViewer {...props(viewItem({ photos: [photo], videos: [] }))} />)
      expect(screen.queryByRole('button', { name: 'Следующее фото' })).toBeNull()
      expect(screen.queryByText('1 / 1')).toBeNull()
    } finally {
      window.matchMedia = base
    }
  })
})
