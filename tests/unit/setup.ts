import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

/** jsdom has no matchMedia, IntersectionObserver or media playback: minimal controllable stubs. */
export const env = {
  reducedMotion: false,
  saveData: false,
  effectiveType: '4g',
  observers: [] as { callback: IntersectionObserverCallback; elements: Element[] }[],
}

/** Fires IntersectionObserver callbacks for all observed elements. */
export const intersect = (isIntersecting: boolean) => {
  for (const observer of env.observers) {
    observer.callback(
      observer.elements.map((target) => ({ target, isIntersecting }) as IntersectionObserverEntry),
      {} as IntersectionObserver,
    )
  }
}

beforeEach(() => {
  env.reducedMotion = false
  env.saveData = false
  env.effectiveType = '4g'
  env.observers = []

  window.matchMedia = vi.fn((query: string) => ({
    matches: query.includes('prefers-reduced-motion') && env.reducedMotion,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia

  Object.defineProperty(navigator, 'connection', {
    configurable: true,
    get: () =>
      Object.assign(new EventTarget(), {
        saveData: env.saveData,
        effectiveType: env.effectiveType,
      }),
  })

  window.IntersectionObserver = class {
    private entry: (typeof env.observers)[number]
    constructor(callback: IntersectionObserverCallback) {
      this.entry = { callback, elements: [] }
      env.observers.push(this.entry)
    }
    observe(element: Element) {
      this.entry.elements.push(element)
    }
    unobserve() {}
    disconnect() {
      env.observers = env.observers.filter((o) => o !== this.entry)
    }
    takeRecords() {
      return []
    }
  } as unknown as typeof IntersectionObserver

  // Reports once, on observe: enough for components that measure an element
  window.ResizeObserver = class {
    constructor(private callback: ResizeObserverCallback) {}
    observe(target: Element) {
      this.callback([{ target } as ResizeObserverEntry], this as unknown as ResizeObserver)
    }
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver

  HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve())
  HTMLMediaElement.prototype.pause = vi.fn()
  Element.prototype.scrollTo = vi.fn()
})

afterEach(() => cleanup())
