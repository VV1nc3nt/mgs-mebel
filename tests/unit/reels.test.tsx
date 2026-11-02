import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ReelVideo } from '@/components/works/ReelVideo'
import { address, normalizeReel, parseReel, reelHref, searchOf, withoutView } from '@/lib/reelView'
import { buildFeeds, feedCounts, ownerReels } from '@/lib/works'
import { claimSound } from '@/lib/soundPlayer'
import { VIDEO_START_TIMEOUT_MS } from '@/lib/bgVideo'
import { photo, video } from './fixtures'

const source = { src: '/video.mp4', type: 'video/mp4' }
const media = { ...video, poster: photo }
const reels = ownerReels({
  owner: 'p-12',
  projectId: 12,
  title: 'Проект',
  type: null,
  videos: [media, media],
})

describe('REELS addresses and one available list', () => {
  it('addresses owner/media pairs, not positions, and rejects ambiguous or oversized identifiers', () => {
    expect(parseReel('p-12-87')).toBe('p-12-87')
    expect(parseReel('i-34-87')).toBe('i-34-87')
    for (const value of [
      null,
      [],
      'p-0-87',
      'i-01-87',
      'p-12-0',
      'P-12-87',
      'p-12-87-2',
      'p-9007199254740992-87',
    ])
      expect(parseReel(value)).toBeNull()
    expect(reelHref('p-12-87')).toBe('/works?category=reels&reel=p-12-87')
    expect(reelHref('i-34-87', '/works/flat')).toBe('/works/flat?reel=i-34-87')
  })

  it('deduplicates within an owner, preserving first position and separate owners', () => {
    const other = { ...media, id: 87 }
    const own = (videos: (typeof media)[]) =>
      ownerReels({ owner: 'p-12', projectId: 12, title: 'Проект', type: null, videos })
    expect(own([media, other, media]).map((r) => r.reel)).toEqual([`p-12-${media.id}`, 'p-12-87'])
    expect(own([other, media]).map((r) => r.reel)).toEqual(['p-12-87', `p-12-${media.id}`])
    const feeds = buildFeeds(
      [],
      [
        {
          id: 34,
          type: 'kitchens',
          title: null,
          project: null,
          place: null,
          photos: [photo],
          videos: [media, media],
          hidden: false,
          featured: false,
        },
      ],
    )
    expect(feedCounts(feeds).reels).toBe(feeds.reels.length)
    expect(feeds.reels).toHaveLength(1)
  })

  it('reel presence wins over item even when invalid; unrelated parameters survive', () => {
    const valid = normalizeReel(
      new URLSearchParams({
        category: 'reels',
        reel: reels[0]!.reel,
        item: '3',
        photo: '2',
        utm_source: 'test',
      }),
      reels,
    )
    expect(valid.key).toBe(reels[0]!.reel)
    expect(valid.search.toString()).toBe(`category=reels&reel=${reels[0]!.reel}&utm_source=test`)
    const invalid = normalizeReel(
      new URLSearchParams('category=kitchens&reel=p-1-999&item=3&photo=2'),
      reels,
    )
    expect(invalid.key).toBeNull()
    expect(invalid.search.toString()).toBe('category=kitchens')
    expect(
      normalizeReel(new URLSearchParams(`reel=${reels[0]!.reel}&reel=${reels[0]!.reel}`), reels)
        .key,
    ).toBeNull()
    expect(normalizeReel(new URLSearchParams({ reel: reels[0]!.reel }), []).key).toBeNull()
    expect(address('/works', withoutView(valid.search))).toBe(
      '/works?category=reels&utm_source=test',
    )
    expect(searchOf({ x: ['1', '2'], absent: undefined }).toString()).toBe('x=1&x=2')
  })
})

describe('REELS playback lifecycle', () => {
  let hidden = false
  let playing = false
  let play: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
    Object.defineProperty(HTMLMediaElement.prototype, 'paused', {
      configurable: true,
      get: () => !playing,
    })
    play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (
      this: HTMLMediaElement,
    ) {
      playing = true
      this.dispatchEvent(new Event('playing'))
      return Promise.resolve()
    })
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {
      playing = false
    })
  })
  afterEach(() => {
    hidden = false
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('resumes after a hidden tab only when playing; manual pause survives visibility changes', async () => {
    render(<ReelVideo source={source} muted onMuted={() => {}} onEnded={() => {}} />)
    await act(async () => {})
    expect(playing).toBe(true)
    act(() => {
      hidden = true
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(playing).toBe(false)
    act(() => {
      hidden = false
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await act(async () => {})
    expect(playing).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Пауза' }))
    const calls = play.mock.calls.length
    act(() => {
      hidden = true
      document.dispatchEvent(new Event('visibilitychange'))
      hidden = false
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(play.mock.calls).toHaveLength(calls)
    expect(playing).toBe(false)
  })

  it('shows a launch button for rejected sound autoplay and can retry without losing controls', async () => {
    play.mockRejectedValueOnce(new DOMException('policy', 'NotAllowedError'))
    render(<ReelVideo source={source} muted={false} onMuted={() => {}} onEnded={() => {}} />)
    await act(async () => {})
    expect(
      screen.getByText('Не удалось запустить видео автоматически. Нажмите „Воспроизвести“.'),
    ).toBeTruthy()
    fireEvent.click(screen.getByRole('status').querySelector('button')!)
    await act(async () => {})
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('uses claimSound; a competing player pauses this one, and leaving resets its position', async () => {
    const view = render(
      <ReelVideo source={source} muted={false} onMuted={() => {}} onEnded={() => {}} />,
    )
    await act(async () => {})
    const element = view.container.querySelector('video')!
    element.currentTime = 12
    let release: () => void
    act(() => {
      release = claimSound(() => {})
    })
    expect(playing).toBe(false)
    view.unmount()
    expect(element.currentTime).toBe(0)
    release!()
  })

  it('reports file errors, can retry, and fails a stalled start after the deadline', async () => {
    vi.useFakeTimers()
    const view = render(<ReelVideo source={source} muted onMuted={() => {}} onEnded={() => {}} />)
    await act(async () => {})
    fireEvent.error(view.container.querySelector('video')!)
    expect(screen.getByText('Не удалось загрузить видео.')).toBeTruthy()
    play.mockImplementation(() => new Promise(() => {}))
    fireEvent.click(screen.getByRole('button', { name: 'Повторить загрузку' }))
    act(() => vi.advanceTimersByTime(VIDEO_START_TIMEOUT_MS + 1))
    expect(screen.getByText('Не удалось загрузить видео.')).toBeTruthy()
  })

  it('seeks by arrows without changing reel or toggling pause', async () => {
    const ended = vi.fn()
    const view = render(<ReelVideo source={source} muted onMuted={() => {}} onEnded={ended} />)
    await act(async () => {})
    const element = view.container.querySelector('video')!
    Object.defineProperty(element, 'duration', { value: 100 })
    element.currentTime = 30
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' })
    expect(element.currentTime).toBe(35)
    expect(playing).toBe(true)
    fireEvent.ended(element)
    expect(ended).toHaveBeenCalledOnce()
  })
})
