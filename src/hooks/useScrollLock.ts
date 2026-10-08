import { useCallback, useEffect, useRef } from 'react'

export type ScrollRelease = (options: { toTop: boolean }) => void

/**
 * Freezes the page under an overlay: `overflow: hidden` on <html> stops wheel, keyboard and
 * (iOS Safari 16+) touch scrolling, `overscroll-behavior: none` stops the rubber band. The page
 * keeps its scroll position: no fixed <body> shifted by the offset — in iOS Safari that jump
 * rebuilt the layers (every backdrop-filter flashed for a frame) and brought back the toolbars.
 * The scrollbar gutter stays (`scrollbar-gutter: stable` in globals.css), so the width does not
 * jump. `data-scroll-locked` on <html> tells scroll listeners to ignore what happens meanwhile.
 * `toTop: true` leaves the page at the top — for navigating away.
 */
export function lockScroll(): ScrollRelease {
  const html = document.documentElement
  const saved = {
    overflow: html.style.overflow,
    overscrollBehavior: html.style.overscrollBehavior,
  }
  html.style.overflow = 'hidden'
  html.style.overscrollBehavior = 'none'
  html.dataset.scrollLocked = ''

  return ({ toTop }) => {
    html.style.overflow = saved.overflow
    html.style.overscrollBehavior = saved.overscrollBehavior
    delete html.dataset.scrollLocked
    if (toTop) window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }
}

/** `lock()` / `unlock({ toTop })`, idempotent; unmounting unlocks in place. */
export function useScrollLock() {
  const release = useRef<ScrollRelease | null>(null)

  const lock = useCallback(() => {
    release.current ??= lockScroll()
  }, [])

  const unlock = useCallback((options: { toTop: boolean }) => {
    release.current?.(options)
    release.current = null
  }, [])

  useEffect(() => () => unlock({ toTop: false }), [unlock])

  return { lock, unlock }
}
