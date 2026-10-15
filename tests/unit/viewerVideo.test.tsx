import { act, fireEvent, render, screen } from '@testing-library/react'
import { createRef, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ViewerSoundButton, ViewerVideo } from '@/components/works/ViewerVideo'
import { VIDEO_START_TIMEOUT_MS } from '@/lib/bgVideo'
import { claimSound } from '@/lib/soundPlayer'

const SOURCE = { src: '/api/media/file/reel.mp4', type: 'video/mp4' }
const refused = (name: string) => Promise.reject(Object.assign(new Error('no'), { name }))

/** The player with a segment fill and the viewer's sound state. */
function setup({ active = true, muted: initial = true } = {}) {
  const calls = { ended: vi.fn(), fallback: vi.fn(), muted: vi.fn() }
  const fillRef = createRef<HTMLDivElement>()
  let setMutedOutside: (value: boolean) => void = () => {}
  function Harness({ open }: { open: boolean }) {
    const [muted, setMuted] = useState(initial)
    setMutedOutside = setMuted
    return (
      <>
        <div ref={fillRef} data-testid="fill" />
        <ViewerVideo
          source={SOURCE}
          muted={muted}
          active={open}
          fillRef={fillRef}
          onEnded={calls.ended}
          onFallback={calls.fallback}
          onMuted={() => {
            calls.muted()
            setMuted(true)
          }}
        />
      </>
    )
  }
  const view = render(<Harness open={active} />)
  const video = view.container.querySelector('video')!
  const fill = () => fillRef.current!.style.getPropertyValue('--viewer-progress')
  return {
    ...view,
    video,
    fill,
    calls,
    setMuted: (value: boolean) => act(() => setMutedOutside(value)),
    open: (value: boolean) => view.rerender(<Harness open={value} />),
  }
}

afterEach(() => {
  vi.useRealTimers()
  Object.defineProperty(document, 'hidden', { configurable: true, value: false })
})

describe('ViewerVideo', () => {
  it('a muted inline video without loop or controls, started by play(), shown on playing', async () => {
    const { video } = setup()
    expect(video.muted).toBe(true)
    expect(video.hasAttribute('muted')).toBe(true)
    expect(video.hasAttribute('playsinline')).toBe(true)
    expect(video.hasAttribute('loop')).toBe(false)
    expect(video.hasAttribute('controls')).toBe(false)
    expect(video.hasAttribute('autoplay')).toBe(false)
    expect(video.querySelector('source')?.getAttribute('src')).toBe(SOURCE.src)
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled()
    expect(video.className).toContain('opacity-0')
    await act(async () => fireEvent.playing(video))
    expect(video.className).toContain('opacity-100')
  })

  it('the fill follows the file: currentTime / duration each frame, 1 on ended, then the next frame', async () => {
    const { video, fill, calls } = setup()
    Object.defineProperty(video, 'duration', { configurable: true, value: 10 })
    Object.defineProperty(video, 'currentTime', { configurable: true, writable: true, value: 5 })
    const frames: FrameRequestCallback[] = []
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      frames.push(cb)
      return frames.length
    })
    await act(async () => fireEvent.playing(video))
    expect(fill()).toBe('0.5')
    video.currentTime = 7.5
    frames.at(-1)!(0)
    expect(fill()).toBe('0.75')
    await act(async () => fireEvent.ended(video))
    expect(fill()).toBe('1')
    expect(calls.ended).toHaveBeenCalledOnce()
    expect(calls.fallback).not.toHaveBeenCalled()
  })

  it('error, a muted refusal, stalled before playing, no playing in 4 s — the poster', async () => {
    const error = setup()
    await act(async () => fireEvent.error(error.video))
    expect(error.calls.fallback).toHaveBeenCalledOnce()
    error.unmount()

    vi.mocked(HTMLMediaElement.prototype.play).mockImplementationOnce(() => refused('NotSupportedError'))
    const refusal = setup()
    await act(async () => {})
    expect(refusal.calls.fallback).toHaveBeenCalledOnce()
    refusal.unmount()

    const stalled = setup()
    await act(async () => fireEvent.stalled(stalled.video))
    expect(stalled.calls.fallback).toHaveBeenCalledOnce()
    stalled.unmount()

    vi.useFakeTimers()
    const late = setup()
    await act(async () => vi.advanceTimersByTime(VIDEO_START_TIMEOUT_MS))
    expect(late.calls.fallback).toHaveBeenCalledOnce()
  })

  it('stalled or the timeout after playing is buffering, not a failure; abort is not a refusal', async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockImplementationOnce(() => refused('AbortError'))
    vi.useFakeTimers()
    const { video, calls } = setup()
    await act(async () => fireEvent.playing(video))
    await act(async () => fireEvent.stalled(video))
    await act(async () => vi.advanceTimersByTime(VIDEO_START_TIMEOUT_MS * 2))
    expect(calls.fallback).not.toHaveBeenCalled()
  })

  it('refused with sound (autoplay policy): muted again and played, the button back to «off»', async () => {
    const play = vi.mocked(HTMLMediaElement.prototype.play)
    play.mockImplementationOnce(() => refused('NotAllowedError'))
    const { video, calls } = setup({ muted: false })
    await act(async () => {})
    expect(video.muted).toBe(true)
    expect(calls.muted).toHaveBeenCalledOnce()
    expect(calls.fallback).not.toHaveBeenCalled()
    expect(play).toHaveBeenCalledTimes(2)
  })

  it('sound: unmuted holds the sound — another player starting mutes it; turning it on stops the other', async () => {
    const { video, calls, setMuted } = setup()
    const other = vi.fn()
    claimSound(other)
    setMuted(false)
    expect(video.muted).toBe(false)
    expect(other).toHaveBeenCalledOnce()
    act(() => {
      claimSound(vi.fn())
    })
    expect(calls.muted).toHaveBeenCalledOnce()
    expect(video.muted).toBe(true)
  })

  it('pauses in a hidden tab and goes on when it shows; pauses when the viewer closes', async () => {
    const { video, open } = setup()
    const play = vi.mocked(HTMLMediaElement.prototype.play)
    const pause = vi.mocked(HTMLMediaElement.prototype.pause)
    await act(async () => fireEvent.playing(video))
    pause.mockClear()
    play.mockClear()
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(pause).toHaveBeenCalledOnce()
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(play).toHaveBeenCalledOnce()
    pause.mockClear()
    open(false)
    expect(pause).toHaveBeenCalled()
  })
})

describe('ViewerSoundButton', () => {
  it('says what a press does, without aria-pressed', () => {
    const onToggle = vi.fn()
    const { rerender } = render(<ViewerSoundButton muted onToggle={onToggle} />)
    const button = screen.getByRole('button', { name: 'Включить звук' })
    expect(button.hasAttribute('aria-pressed')).toBe(false)
    fireEvent.click(button)
    expect(onToggle).toHaveBeenCalledOnce()
    rerender(<ViewerSoundButton muted={false} onToggle={onToggle} />)
    expect(screen.getByRole('button', { name: 'Выключить звук' })).toBeTruthy()
  })
})
