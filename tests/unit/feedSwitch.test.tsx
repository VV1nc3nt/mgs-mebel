import { act, render, renderHook } from '@testing-library/react'
import { createElement, useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useFeedSwitch } from '@/hooks/useFeedSwitch'
import { useFeedWave } from '@/hooks/useFeedWave'
import { env } from './setup'

type Key = 'a' | 'b' | 'c'

const deferred = <T,>() => {
  let resolve: (value: T) => void = () => {}
  let reject: (error: unknown) => void = () => {}
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const setRootTime = (name: string, value: string) =>
  document.documentElement.style.setProperty(name, value)

describe('useFeedSwitch', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    document.documentElement.removeAttribute('style')
  })

  const setup = (load: (key: Key) => string | Promise<string>, onFail = vi.fn()) => {
    const hook = renderHook(
      ({ want }: { want: Key }) =>
        useFeedSwitch<Key, string>({ initial: { key: 'a', value: 'A' }, want, load, onFail }),
      { initialProps: { want: 'a' as Key } },
    )
    return { ...hook, onFail }
  }
  const flush = () => act(() => vi.runAllTimersAsync())

  it('the server feed without a request; a change of `want` shows its feed, generation + 1', async () => {
    const load = vi.fn((key: Key) => key.toUpperCase())
    const { result, rerender } = setup(load)
    expect(result.current.shown).toEqual({ key: 'a', value: 'A', generation: 0 })
    expect(load).not.toHaveBeenCalled()
    rerender({ want: 'b' })
    await flush()
    expect(load).toHaveBeenCalledWith('b')
    expect(result.current.shown).toEqual({ key: 'b', value: 'B', generation: 1 })
  })

  it('a feed is loaded once: back to it — from memory', async () => {
    const load = vi.fn(async (key: Key) => key.toUpperCase())
    const { result } = setup(load)
    act(() => result.current.show('b'))
    await flush()
    act(() => result.current.show('a'))
    await flush()
    act(() => result.current.show('b'))
    await flush()
    expect(load).toHaveBeenCalledTimes(1)
    expect(result.current.shown).toEqual({ key: 'b', value: 'B', generation: 3 })
  })

  it('`show` then the same `want`: one request, not two', async () => {
    const load = vi.fn(async (key: Key) => key.toUpperCase())
    const { result, rerender } = setup(load)
    act(() => result.current.show('b'))
    rerender({ want: 'b' })
    await flush()
    expect(load).toHaveBeenCalledTimes(1)
    expect(result.current.requestedKey()).toBe('b')
  })

  it('the old feed fades out for --motion-feed-out, the new one comes after it', async () => {
    setRootTime('--motion-feed-out', '200ms')
    const { result } = setup((key) => key.toUpperCase())
    act(() => result.current.show('b'))
    expect(result.current.leaving).toBe(true)
    await act(() => vi.advanceTimersByTimeAsync(199))
    expect(result.current.shown.key).toBe('a')
    await act(() => vi.advanceTimersByTimeAsync(1))
    expect(result.current.leaving).toBe(false)
    expect(result.current.shown.key).toBe('b')
  })

  it('reduced motion: no fade', async () => {
    env.reducedMotion = true
    setRootTime('--motion-feed-out', '200ms')
    const { result } = setup((key) => key.toUpperCase())
    act(() => result.current.show('b'))
    expect(result.current.leaving).toBe(false)
    await flush()
    expect(result.current.shown.key).toBe('b')
  })

  it('a response that is no longer the latest is dropped', async () => {
    const b = deferred<string>()
    const c = deferred<string>()
    const { result } = setup((key) => (key === 'b' ? b.promise : c.promise))
    act(() => result.current.show('b'))
    act(() => result.current.show('c'))
    await act(async () => c.resolve('C'))
    await flush()
    await act(async () => b.resolve('B'))
    await flush()
    expect(result.current.shown).toMatchObject({ key: 'c', value: 'C', generation: 1 })
  })

  it('back to the shown feed before the other one came: that request is dropped', async () => {
    setRootTime('--motion-feed-out', '200ms')
    const b = deferred<string>()
    const { result } = setup(() => b.promise)
    act(() => result.current.show('b'))
    act(() => result.current.show('a'))
    expect(result.current.leaving).toBe(false)
    await act(async () => b.resolve('B'))
    await flush()
    expect(result.current.shown).toEqual({ key: 'a', value: 'A', generation: 0 })
  })

  it('a failed load: the feed stays, onFail with its key; the next try loads again', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValue('B')
    const { result, onFail } = setup(load)
    act(() => result.current.show('b'))
    await flush()
    expect(onFail).toHaveBeenCalledWith('a')
    expect(result.current.shown.key).toBe('a')
    expect(result.current.leaving).toBe(false)
    expect(result.current.requestedKey()).toBe('a')
    act(() => result.current.show('b'))
    await flush()
    expect(load).toHaveBeenCalledTimes(2)
    expect(result.current.shown.value).toBe('B')
  })

  it('a load that throws at once fails the same way', async () => {
    const { result, onFail } = setup(() => {
      throw new Error('bad')
    })
    act(() => result.current.show('b'))
    await flush()
    expect(onFail).toHaveBeenCalledWith('a')
    expect(result.current.shown.key).toBe('a')
  })

  it('`update` changes a feed in memory and on screen without a new generation', async () => {
    const load = vi.fn(async (key: Key) => key.toUpperCase())
    const { result } = setup(load)
    act(() => result.current.update('a', (v) => `${v}+`))
    expect(result.current.shown).toEqual({ key: 'a', value: 'A+', generation: 0 })
    act(() => result.current.show('b'))
    await flush()
    act(() => result.current.show('a'))
    await flush()
    expect(result.current.shown.value).toBe('A+')
    // A feed not in memory: nothing
    act(() => result.current.update('c', () => 'C'))
    act(() => result.current.show('c'))
    await flush()
    expect(result.current.shown.value).toBe('C')
    expect(load).toHaveBeenCalledWith('c')
  })
})

describe('useFeedWave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setRootTime('--motion-feed-stagger', '60ms')
    setRootTime('--motion-feed-wait', '600ms')
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })
  })
  afterEach(() => {
    vi.useRealTimers()
    document.documentElement.removeAttribute('style')
  })

  // Items at the given tops (100 high); the second item's image is still loading
  function List({ generation, tops }: { generation: number; tops: number[] }) {
    const ref = useRef<HTMLUListElement>(null)
    useFeedWave(ref, generation)
    return (
      <ul ref={ref}>
        {tops.map((top, i) => (
          <li
            key={`${generation}-${i}`}
            ref={(el) => {
              if (el) el.getBoundingClientRect = () => ({ top, bottom: top + 100 }) as DOMRect
            }}
          >
            {i === 1 && createElement('img', { alt: '' })}
          </li>
        ))}
      </ul>
    )
  }
  const waves = (container: HTMLElement) =>
    [...container.querySelectorAll('li')].map((li) => li.dataset.wave ?? null)
  // Images still loading (jsdom: an image without a source is complete)
  const imagesLoading = () => {
    const original = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'complete')!
    Object.defineProperty(HTMLImageElement.prototype, 'complete', {
      configurable: true,
      get: () => false,
    })
    return () => Object.defineProperty(HTMLImageElement.prototype, 'complete', original)
  }

  it('the server list (generation 0): no wave', () => {
    const { container } = render(<List generation={0} tops={[0, 200]} />)
    expect(waves(container)).toEqual([null, null])
  })

  it('new items in the viewport wait, then rise one by one; out of view — nothing', async () => {
    const { container, rerender } = render(<List generation={0} tops={[0, 200, 900]} />)
    // The image of the second item is loading
    const restore = imagesLoading()
    rerender(<List generation={1} tops={[0, 200, 900]} />)
    expect(waves(container)).toEqual(['wait', 'wait', null])
    await act(() => vi.advanceTimersByTimeAsync(20))
    expect(waves(container)).toEqual(['in', 'wait', null])
    // Its turn at 60 ms; the image came at 100 ms
    await act(() => vi.advanceTimersByTimeAsync(80))
    expect(waves(container)[1]).toBe('wait')
    act(() => {
      container.querySelector('img')!.dispatchEvent(new Event('load'))
    })
    await act(() => vi.advanceTimersByTimeAsync(20))
    expect(waves(container)).toEqual(['in', 'in', null])
    restore()
  })

  it('an image that does not come: up after --motion-feed-wait', async () => {
    const restore = imagesLoading()
    const { container } = render(<List generation={1} tops={[0, 200]} />)
    await act(() => vi.advanceTimersByTimeAsync(60 + 590))
    expect(waves(container)[1]).toBe('wait')
    await act(() => vi.advanceTimersByTimeAsync(30))
    expect(waves(container)[1]).toBe('in')
    restore()
  })

  it('reduced motion: no wave', () => {
    env.reducedMotion = true
    const { container } = render(<List generation={1} tops={[0, 200]} />)
    expect(waves(container)).toEqual([null, null])
  })

  it('the next feed clears the marks of the previous one', async () => {
    const { container, rerender } = render(<List generation={1} tops={[0]} />)
    await act(() => vi.advanceTimersByTimeAsync(50))
    const first = container.querySelector('li')!
    rerender(<List generation={2} tops={[0]} />)
    expect(first.dataset.wave).toBeUndefined()
    expect(waves(container)).toEqual(['wait'])
  })
})
