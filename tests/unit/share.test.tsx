import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ViewerShare } from '@/components/works/ViewerShare'
import { useViewerInput } from '@/hooks/useViewerInput'
import { closeChooser, openChooser } from '@/lib/chooser'
import { clipboardMethod, shareMethod, shareRefusal } from '@/lib/share'
import { projectUrl } from '@/lib/viewer'

const DATA = { title: 'Кухня-гостиная', url: 'https://mgs.example/works/kuhnya' }
const share = () => Promise.resolve()
const writeText = () => Promise.resolve()
const domError = (name: string) => Object.assign(new Error(name), { name })

describe('share decisions', () => {
  it('the share sheet when there is one and it takes the data', () => {
    expect(shareMethod({ share, clipboard: { writeText } }, DATA)).toBe('share')
    expect(shareMethod({ share, canShare: () => true }, DATA)).toBe('share')
  })

  it('no share sheet, or it refuses the data: the clipboard, else the text', () => {
    expect(shareMethod({ clipboard: { writeText } }, DATA)).toBe('clipboard')
    expect(shareMethod({ share, canShare: () => false, clipboard: { writeText } }, DATA)).toBe(
      'clipboard',
    )
    const throwing = () => {
      throw new TypeError('bad data')
    }
    expect(shareMethod({ share, canShare: throwing, clipboard: { writeText } }, DATA)).toBe(
      'clipboard',
    )
    expect(shareMethod({}, DATA)).toBe('text')
    expect(shareMethod({ clipboard: {} }, DATA)).toBe('text')
    expect(clipboardMethod({ clipboard: undefined })).toBe('text')
  })

  it('a closed share sheet is no failure; other refusals fall back', () => {
    expect(shareRefusal(domError('AbortError'))).toBe('ignore')
    expect(shareRefusal(domError('NotAllowedError'))).toBe('fallback')
    expect(shareRefusal(new TypeError('x'))).toBe('fallback')
    expect(shareRefusal('x')).toBe('fallback')
  })

  it('the project URL: absolute, from the server origin', () => {
    expect(projectUrl('https://mgs.example', 'kuhnya')).toBe('https://mgs.example/works/kuhnya')
  })
})

describe('ViewerShare', () => {
  const nav = navigator as unknown as Record<string, unknown>
  const original = { share: nav.share, canShare: nav.canShare, clipboard: nav.clipboard }
  const stub = (values: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(values)) {
      Object.defineProperty(navigator, key, { value, configurable: true, writable: true })
    }
  }
  const flush = () => act(() => Promise.resolve())

  beforeEach(() => {
    stub({ share: undefined, canShare: undefined, clipboard: undefined })
    document.documentElement.style.setProperty('--share-status-time', '2s')
  })
  afterEach(() => {
    stub(original)
    document.documentElement.style.removeProperty('--share-status-time')
    vi.useRealTimers()
  })

  const press = () => fireEvent.click(screen.getByRole('button', { name: 'Поделиться' }))
  const status = () => screen.getByRole('status')

  it('shares the title and the link, without a text; a closed sheet shows nothing', async () => {
    const shareSpy = vi.fn(() => Promise.reject(domError('AbortError')))
    const clipboard = { writeText: vi.fn(() => Promise.resolve()) }
    stub({ share: shareSpy, clipboard })
    render(<ViewerShare {...DATA} />)
    press()
    await flush()
    expect(shareSpy).toHaveBeenCalledWith({ title: DATA.title, url: DATA.url })
    expect(clipboard.writeText).not.toHaveBeenCalled()
    expect(status().hasAttribute('data-shown')).toBe(false)
  })

  it('a failed sheet: the link goes to the clipboard', async () => {
    const clipboard = { writeText: vi.fn(() => Promise.resolve()) }
    stub({ share: () => Promise.reject(domError('NotAllowedError')), clipboard })
    render(<ViewerShare {...DATA} />)
    press()
    await flush()
    await flush()
    expect(clipboard.writeText).toHaveBeenCalledWith(DATA.url)
    expect(status().textContent).toBe('Ссылка скопирована')
  })

  it('without a sheet: «Ссылка скопирована» for the token time; a press again restarts it', async () => {
    vi.useFakeTimers()
    const clipboard = { writeText: vi.fn(() => Promise.resolve()) }
    stub({ clipboard })
    render(<ViewerShare {...DATA} />)
    press()
    await flush()
    expect(status().textContent).toBe('Ссылка скопирована')
    expect(status().hasAttribute('data-shown')).toBe(true)
    act(() => vi.advanceTimersByTime(1500))
    press()
    await flush()
    act(() => vi.advanceTimersByTime(1500))
    expect(status().hasAttribute('data-shown')).toBe(true)
    act(() => vi.advanceTimersByTime(600))
    expect(status().hasAttribute('data-shown')).toBe(false)
  })

  it('the clipboard refuses, or there is none: the link itself, kept', async () => {
    vi.useFakeTimers()
    stub({ clipboard: { writeText: () => Promise.reject(domError('NotAllowedError')) } })
    const { unmount } = render(<ViewerShare {...DATA} />)
    press()
    await flush()
    expect(status().textContent).toBe(DATA.url)
    act(() => vi.advanceTimersByTime(10_000))
    expect(status().hasAttribute('data-shown')).toBe(true)
    unmount()

    stub({ clipboard: undefined })
    render(<ViewerShare {...DATA} />)
    press()
    expect(status().textContent).toBe(DATA.url)
  })
})

describe('useViewerInput with a messenger choice open', () => {
  afterEach(() => closeChooser())

  it('keys and the wheel do nothing while the choice is open', () => {
    const handlers = {
      frame: vi.fn(),
      project: vi.fn(),
      swipe: vi.fn(),
      close: vi.fn(),
      reducedMotion: false,
    }
    renderHook(() => useViewerInput(handlers))
    openChooser('cta')
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: 'Escape' })
    const wheel = new WheelEvent('wheel', { deltaY: 120, cancelable: true })
    window.dispatchEvent(wheel)
    expect(wheel.defaultPrevented).toBe(true)
    expect(handlers.project).not.toHaveBeenCalled()
    expect(handlers.frame).not.toHaveBeenCalled()
    expect(handlers.close).not.toHaveBeenCalled()

    closeChooser()
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(handlers.frame).toHaveBeenCalledWith(1)
  })
})
