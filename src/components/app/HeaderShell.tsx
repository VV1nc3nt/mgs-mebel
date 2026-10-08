'use client'

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { useKeyboardFocusWithin } from '@/hooks/useKeyboardFocusWithin'
import { useMenu } from '@/hooks/useMenu'
import { usePageScroll, type PageScroll } from '@/hooks/usePageScroll'
import { useRoutePath } from '@/hooks/useRoutePath'
import { cn } from '@/lib/cn'
import { nextHeaderState, type HeaderState } from '@/lib/headerState'
import { isHeroRoute } from '@/lib/routes'

const OverMediaContext = createContext(false)

/** The header sits over the hero media: buttons take the translucent border (README §5.2). */
export const useHeaderOverMedia = () => use(OverMediaContext)

/**
 * <header> of every page. At the top it is where README §5.2 puts it: absolute over the hero,
 * elsewhere in the flow. Further down it is a smart header (a deviation from README §5.2):
 * hidden while scrolling down, fixed on glass while scrolling up or holding keyboard focus, back
 * in place at the top (states: lib/headerState.ts). The <header> keeps its place in the flow and
 * the bar inside it turns fixed, so nothing shifts. The pathname is known during SSR, so the HTML
 * already has the right variant.
 */
export function HeaderShell({ children }: { children: ReactNode }) {
  const hero = isHeroRoute(useRoutePath())
  const menuOpen = useMenu().state !== 'closed'
  const [state, setState] = useState<HeaderState>('top')
  const headerRef = useRef<HTMLElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const scroll = useRef<PageScroll | null>(null)
  /** Keyboard focus is inside: never hides from under it (useKeyboardFocusWithin). */
  const focusWithin = useRef(false)
  const menuOpenRef = useRef(menuOpen)

  useLayoutEffect(() => {
    menuOpenRef.current = menuOpen
  }, [menuOpen])

  const update = useCallback(() => {
    const header = headerRef.current
    const bar = barRef.current
    if (!header || !bar || !scroll.current) return
    const input = {
      ...scroll.current,
      top: header.getBoundingClientRect().top + window.scrollY,
      height: bar.offsetHeight,
      focusWithin: focusWithin.current,
      menuOpen: menuOpenRef.current,
    }
    setState((prev) => nextHeaderState(prev, input))
  }, [])
  const focusHandlers = useKeyboardFocusWithin(focusWithin, update)

  usePageScroll((next) => {
    scroll.current = next
    update()
  })

  // Every change is re-evaluated a frame later (away → pinned on a page reloaded mid-way or
  // when focus arrives), as is a new page.
  const path = useRoutePath()
  useEffect(() => {
    const frame = requestAnimationFrame(update)
    return () => cancelAnimationFrame(frame)
  }, [state, path, update])

  // Header height for the slot, sticky bars under the header and scroll-padding (globals.css).
  useEffect(() => {
    const bar = barRef.current
    if (!bar) return
    const root = document.documentElement
    const observer = new ResizeObserver(() =>
      root.style.setProperty('--header-h', String(bar.offsetHeight)),
    )
    observer.observe(bar)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--header-h')
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.toggleAttribute('data-header-pinned', state === 'pinned')
    return () => root.removeAttribute('data-header-pinned')
  }, [state])

  return (
    <OverMediaContext value={hero && state === 'top'}>
      <header
        ref={headerRef}
        data-variant={hero ? 'hero' : 'flow'}
        data-state={state}
        {...focusHandlers}
        className={cn('z-header site-header', hero ? 'absolute inset-x-0 top-0' : 'relative')}
      >
        <div ref={barRef} className="header-bar">
          {/* The CTA's open choice moves the phone aside (chooser-shifted) */}
          <div
            data-chooser-shift=""
            className="page-container flex items-center justify-between gap-6 py-5"
          >
            {children}
          </div>
        </div>
      </header>
    </OverMediaContext>
  )
}
