import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { BgVideo, type BgVideoProps } from '@/components/ui/BgVideo'
import { isLiteNetwork, VIDEO_START_TIMEOUT_MS, videoAllowed } from '@/lib/bgVideo'
import { env, intersect } from './setup'
import { photo, video } from './fixtures'

const sizes = { base: '100vw' }

const renderVideo = (props: Partial<BgVideoProps> = {}) =>
  render(<BgVideo poster={photo} video={video} sizes={sizes} priority {...props} />)

const videoOf = (container: HTMLElement) => container.querySelector('video')

describe('videoAllowed / isLiteNetwork', () => {
  it('allows the video only without reduced motion and on a fast connection', () => {
    expect(videoAllowed({ reducedMotion: false, liteNetwork: false })).toBe(true)
    expect(videoAllowed({ reducedMotion: true, liteNetwork: false })).toBe(false)
    expect(videoAllowed({ reducedMotion: false, liteNetwork: true })).toBe(false)
  })

  it('treats Data Saver and slow-2g / 2g / 3g as a lite network', () => {
    expect(isLiteNetwork({ saveData: true, effectiveType: '4g' })).toBe(true)
    for (const effectiveType of ['slow-2g', '2g', '3g']) {
      expect(isLiteNetwork({ effectiveType })).toBe(true)
    }
    expect(isLiteNetwork({ saveData: false, effectiveType: '4g' })).toBe(false)
    expect(isLiteNetwork({})).toBe(false)
  })
})

describe('BgVideo', () => {
  afterEach(() => {
    vi.useRealTimers()
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
  })

  it('always renders the poster', () => {
    render(<BgVideo poster={photo} sizes={sizes} />)
    expect(screen.getByRole('img').getAttribute('alt')).toBe('Светлая кухня с белыми фасадами')
    expect(document.querySelector('video')).toBeNull()
  })

  it('mounts a muted looping inline video without the autoplay attribute', () => {
    const { container } = renderVideo()
    const el = videoOf(container)!
    expect(el.muted).toBe(true)
    expect(el.defaultMuted).toBe(true)
    expect(el.hasAttribute('muted')).toBe(true)
    expect(el.hasAttribute('autoplay')).toBe(false)
    expect(el.loop).toBe(true)
    expect(el.hasAttribute('playsinline')).toBe(true)
    expect(el.hasAttribute('controls')).toBe(false)
    expect(el.getAttribute('aria-hidden')).toBe('true')
    expect(el.getAttribute('preload')).toBe('auto')
    const source = el.querySelector('source')!
    expect(source.getAttribute('src')).toBe('/api/media/file/hero.mp4')
    expect(source.getAttribute('type')).toBe('video/mp4')
    expect(screen.getByRole('img')).toBeTruthy()
  })

  it('starts the video with play() in the viewport', () => {
    renderVideo()
    const play = vi.mocked(HTMLMediaElement.prototype.play)
    expect(play).not.toHaveBeenCalled()
    act(() => intersect(true))
    expect(play).toHaveBeenCalledTimes(1)
  })

  it('does not mount the video with reduced motion', () => {
    env.reducedMotion = true
    const { container } = renderVideo()
    expect(videoOf(container)).toBeNull()
    expect(screen.getByRole('img')).toBeTruthy()
  })

  it('does not mount the video with Save-Data', () => {
    env.saveData = true
    expect(videoOf(renderVideo().container)).toBeNull()
  })

  for (const effectiveType of ['slow-2g', '2g', '3g']) {
    it(`does not mount the video on ${effectiveType}`, () => {
      env.effectiveType = effectiveType
      expect(videoOf(renderVideo().container)).toBeNull()
    })
  }

  it('mounts the video on 4g', () => {
    env.effectiveType = '4g'
    expect(videoOf(renderVideo().container)).not.toBeNull()
  })

  it('mounts below-the-fold video near the viewport and pauses it outside', () => {
    const { container } = renderVideo({ priority: false })
    expect(videoOf(container)).toBeNull()
    act(() => intersect(true))
    expect(videoOf(container)!.getAttribute('preload')).toBe('metadata')
    act(() => intersect(false))
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled()
  })

  it('falls back to the poster when play() is refused', async () => {
    HTMLMediaElement.prototype.play = vi.fn(() =>
      Promise.reject(new DOMException('refused', 'NotAllowedError')),
    )
    const { container } = renderVideo()
    await act(async () => intersect(true))
    expect(videoOf(container)).toBeNull()
    expect(screen.getByRole('img')).toBeTruthy()
  })

  it('keeps the video when play() is interrupted by pause() (AbortError)', async () => {
    HTMLMediaElement.prototype.play = vi.fn(() =>
      Promise.reject(new DOMException('interrupted', 'AbortError')),
    )
    const { container } = renderVideo()
    await act(async () => intersect(true))
    expect(videoOf(container)).not.toBeNull()
  })

  it('falls back to the poster on error of the video or of its source', () => {
    const first = renderVideo()
    act(() => {
      videoOf(first.container)!.dispatchEvent(new Event('error'))
    })
    expect(videoOf(first.container)).toBeNull()
    first.unmount()

    const second = renderVideo()
    act(() => {
      second.container.querySelector('source')!.dispatchEvent(new Event('error'))
    })
    expect(videoOf(second.container)).toBeNull()
  })

  it('falls back on stalled before the first playing, not after it', () => {
    const before = renderVideo()
    act(() => {
      videoOf(before.container)!.dispatchEvent(new Event('stalled'))
    })
    expect(videoOf(before.container)).toBeNull()
    before.unmount()

    const after = renderVideo()
    const el = videoOf(after.container)!
    act(() => {
      el.dispatchEvent(new Event('playing'))
      el.dispatchEvent(new Event('stalled'))
    })
    expect(videoOf(after.container)).toBe(el)
  })

  it('falls back without playing 4 s after the attempt; playing cancels it', () => {
    vi.useFakeTimers()
    const late = renderVideo()
    act(() => intersect(true))
    act(() => vi.advanceTimersByTime(VIDEO_START_TIMEOUT_MS - 1))
    expect(videoOf(late.container)).not.toBeNull()
    act(() => vi.advanceTimersByTime(1))
    expect(videoOf(late.container)).toBeNull()
    late.unmount()

    const started = renderVideo()
    act(() => intersect(true))
    act(() => {
      videoOf(started.container)!.dispatchEvent(new Event('playing'))
    })
    act(() => vi.advanceTimersByTime(VIDEO_START_TIMEOUT_MS * 2))
    expect(videoOf(started.container)).not.toBeNull()
  })

  it('cancels the timeout outside the viewport and in a hidden tab', () => {
    vi.useFakeTimers()
    const { container } = renderVideo()
    act(() => intersect(true))
    act(() => intersect(false))
    act(() => vi.advanceTimersByTime(VIDEO_START_TIMEOUT_MS))
    expect(videoOf(container)).not.toBeNull()

    act(() => intersect(true))
    const pause = vi.mocked(HTMLMediaElement.prototype.pause)
    pause.mockClear()
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(pause).toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(VIDEO_START_TIMEOUT_MS))
    expect(videoOf(container)).not.toBeNull()

    const play = vi.mocked(HTMLMediaElement.prototype.play)
    play.mockClear()
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(play).toHaveBeenCalledTimes(1)
  })

  it('pauses an inactive video and cancels its timeout', () => {
    vi.useFakeTimers()
    const { container, rerender } = renderVideo()
    act(() => intersect(true))
    const pause = vi.mocked(HTMLMediaElement.prototype.pause)
    pause.mockClear()
    rerender(<BgVideo poster={photo} video={video} sizes={sizes} priority active={false} />)
    act(() => intersect(true))
    expect(pause).toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(VIDEO_START_TIMEOUT_MS))
    expect(videoOf(container)).not.toBeNull()
  })

  it('lazySrc: no source until the first time it is active', () => {
    const props = { lazySrc: true, priority: false }
    const { container, rerender } = renderVideo({ ...props, active: false })
    act(() => intersect(true))
    expect(container.querySelector('source')).toBeNull()

    rerender(<BgVideo poster={photo} video={video} sizes={sizes} {...props} active />)
    act(() => intersect(true))
    expect(container.querySelector('source')!.getAttribute('src')).toBe('/api/media/file/hero.mp4')

    // Stays loaded (paused) when it becomes inactive again
    rerender(<BgVideo poster={photo} video={video} sizes={sizes} {...props} active={false} />)
    expect(container.querySelector('source')).not.toBeNull()
  })

  it('restartKey: a new value rewinds the video', () => {
    const { container, rerender } = renderVideo({ restartKey: 0 })
    const el = videoOf(container)!
    el.currentTime = 3
    rerender(<BgVideo poster={photo} video={video} sizes={sizes} priority restartKey={0} />)
    expect(el.currentTime).toBe(3)
    rerender(<BgVideo poster={photo} video={video} sizes={sizes} priority restartKey={1} />)
    expect(el.currentTime).toBe(0)
  })

  it('shows the video only once it plays', () => {
    const { container } = renderVideo()
    const el = videoOf(container)!
    expect(el.className).toContain('bg-video-fade')
    expect(el.className).toContain('opacity-0')
    act(() => {
      el.dispatchEvent(new Event('playing'))
    })
    expect(el.className).toContain('opacity-100')
  })
})
