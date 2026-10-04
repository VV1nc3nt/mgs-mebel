import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HeaderShell } from '@/components/app/HeaderShell'
import { MenuButton } from '@/components/app/MenuButton'
import { MenuProvider } from '@/components/app/MenuProvider'
import { subscribePageScroll } from '@/hooks/usePageScroll'
import { nextHeaderState, type HeaderInput, type HeaderState } from '@/lib/headerState'
import { clampScrollY } from '@/lib/scrollDirection'

const nav = vi.hoisted(() => ({ pathname: '/' }))
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }))

describe('nextHeaderState', () => {
  const base: HeaderInput = {
    y: 1000,
    top: 0,
    height: 80,
    dir: 'up',
    focusWithin: false,
    menuOpen: false,
  }
  const next = (prev: HeaderState, input: Partial<HeaderInput>) =>
    nextHeaderState(prev, { ...base, ...input })

  it('keeps its state while the menu is open', () => {
    for (const prev of ['top', 'away', 'hidden', 'pinned'] as const) {
      expect(next(prev, { y: 0, dir: 'down', focusWithin: true, menuOpen: true })).toBe(prev)
    }
  })

  it('is back in place at its own offset, from any state', () => {
    for (const prev of ['away', 'hidden', 'pinned'] as const) {
      expect(next(prev, { y: 0 })).toBe('top')
    }
    // Below the draft-mode banner: its place starts at the banner height
    expect(next('pinned', { y: 48, top: 48 })).toBe('top')
    expect(next('pinned', { y: 49, top: 48 })).toBe('pinned')
  })

  it('scrolls with the page while still partly in view', () => {
    expect(next('top', { y: 79, dir: 'down' })).toBe('top')
    expect(next('top', { y: 79, dir: 'up', focusWithin: true })).toBe('top')
    expect(next('top', { y: 127, top: 48, dir: 'down' })).toBe('top')
  })

  it('leaves the flow only out of view, and never straight to pinned', () => {
    expect(next('top', { y: 80, dir: 'down' })).toBe('away')
    expect(next('top', { y: 5000, dir: 'up' })).toBe('away')
    expect(next('top', { y: 5000, focusWithin: true })).toBe('away')
  })

  it('pins on scrolling up and on focus', () => {
    expect(next('away', { dir: 'up' })).toBe('pinned')
    expect(next('hidden', { dir: 'up' })).toBe('pinned')
    expect(next('away', { dir: 'down', focusWithin: true })).toBe('pinned')
    expect(next('pinned', { dir: 'down', focusWithin: true })).toBe('pinned')
  })

  it('hides on scrolling down: away stays away, pinned slides out', () => {
    expect(next('away', { dir: 'down' })).toBe('away')
    expect(next('pinned', { dir: 'down' })).toBe('hidden')
    expect(next('hidden', { dir: 'down' })).toBe('hidden')
    // Pinned within the header's own height (above it the place is empty)
    expect(next('pinned', { y: 40, dir: 'down' })).toBe('hidden')
  })
})

describe('clampScrollY', () => {
  it('keeps scrollY within the scrollable range', () => {
    expect(clampScrollY(-30, 4000)).toBe(0)
    expect(clampScrollY(4050, 4000)).toBe(4000)
    expect(clampScrollY(1200, 4000)).toBe(1200)
    expect(clampScrollY(10, -200)).toBe(0)
  })
})

const setScroll = (y: number) => {
  Object.defineProperty(window, 'scrollY', { configurable: true, value: y })
  fireEvent.scroll(window)
}
const frame = () => act(() => new Promise((resolve) => requestAnimationFrame(resolve)))

beforeEach(() => {
  nav.pathname = '/'
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1000 })
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    value: 5000,
  })
  document.documentElement.removeAttribute('data-scroll-locked')
})

describe('page scroll', () => {
  it('turns the direction on scrolls only, with rubber-band overscroll clamped', async () => {
    const seen: { y: number; dir: string }[] = []
    const unsubscribe = subscribePageScroll((scroll) => seen.push(scroll))
    setScroll(3000)
    await frame()
    expect(seen.at(-1)).toEqual({ y: 3000, dir: 'down' })
    setScroll(4100) // past the bottom (max 4000)…
    await frame()
    setScroll(4000) // …and springing back: not a scroll up
    await frame()
    expect(seen.at(-1)).toEqual({ y: 4000, dir: 'down' })
    // Safari's toolbar: the viewport grows, the clamped y drops — still down
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1100 })
    fireEvent(window, new Event('resize'))
    await frame()
    expect(seen.at(-1)).toEqual({ y: 3900, dir: 'down' })
    unsubscribe()
  })
})

describe('HeaderShell', () => {
  // jsdom has no layout: the header's place is at the document top, so it moves with the scroll
  beforeEach(() => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
      () => ({ top: -window.scrollY }) as DOMRect,
    )
  })

  const renderHeader = () =>
    render(
      <MenuProvider>
        <HeaderShell>
          <span>Лого</span>
          <MenuButton />
        </HeaderShell>
      </MenuProvider>,
    )
  const header = () => document.querySelector('header')!
  const burger = () => screen.getByRole('button', { name: 'Открыть меню' })

  it('starts in place over the hero, with the media border', () => {
    renderHeader()
    expect(header().dataset.variant).toBe('hero')
    expect(header().dataset.state).toBe('top')
    expect(burger().className).toContain('border-text/25')
  })

  it('goes away, pins on scrolling up with the flow border, back in place at the top', async () => {
    renderHeader()
    setScroll(2000)
    await frame()
    await frame()
    expect(header().dataset.state).toBe('away')
    setScroll(1900)
    await frame()
    await frame()
    expect(header().dataset.state).toBe('pinned')
    expect(document.documentElement.hasAttribute('data-header-pinned')).toBe(true)
    expect(burger().className).toContain('border-border-strong')
    setScroll(2100)
    await frame()
    expect(header().dataset.state).toBe('hidden')
    expect(document.documentElement.hasAttribute('data-header-pinned')).toBe(false)
    setScroll(0)
    await frame()
    expect(header().dataset.state).toBe('top')
  })

  it('shows when focus comes in while hidden', async () => {
    renderHeader()
    setScroll(2000)
    await frame()
    await frame()
    expect(header().dataset.state).toBe('away')
    act(() => burger().focus())
    expect(header().dataset.state).toBe('pinned')
  })

  it('keeps its state while the menu is open', async () => {
    renderHeader()
    setScroll(2000)
    await frame()
    setScroll(1900)
    await frame()
    await frame()
    expect(header().dataset.state).toBe('pinned')
    fireEvent.click(burger())
    // The scroll lock jumps to the top: ignored, and the open menu freezes the header anyway
    setScroll(0)
    await frame()
    await frame()
    expect(header().dataset.state).toBe('pinned')
  })
})
