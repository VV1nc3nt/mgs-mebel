import { useCallback, useEffect, useRef } from 'react'

export type ScrollRelease = (options: { restore: boolean }) => void

/**
 * Freezes the page under an overlay. `overflow: hidden` on <html> stops wheel and keyboard
 * scrolling; a fixed <body> shifted by the scroll offset also stops iOS Safari, which ignores
 * overflow on touch. The scrollbar gutter stays (`scrollbar-gutter: stable` in globals.css), so
 * the width does not jump. `data-scroll-locked` on <html> tells scroll listeners to ignore the
 * jumps. `restore: false` leaves the page at the top — for navigating away.
 */
export function lockScroll(): ScrollRelease {
  const { documentElement: html, body } = document
  const y = window.scrollY
  const saved = {
    overflow: html.style.overflow,
    position: body.style.position,
    top: body.style.top,
    left: body.style.left,
    right: body.style.right,
  }
  html.style.overflow = 'hidden'
  body.style.position = 'fixed'
  body.style.top = `-${y}px`
  body.style.left = '0'
  body.style.right = '0'
  html.dataset.scrollLocked = ''

  return ({ restore }) => {
    html.style.overflow = saved.overflow
    body.style.position = saved.position
    body.style.top = saved.top
    body.style.left = saved.left
    body.style.right = saved.right
    delete html.dataset.scrollLocked
    if (restore) window.scrollTo({ top: y, left: 0, behavior: 'instant' })
  }
}

/** `lock()` / `unlock({ restore })`, idempotent; unmounting unlocks and restores. */
export function useScrollLock() {
  const release = useRef<ScrollRelease | null>(null)

  const lock = useCallback(() => {
    release.current ??= lockScroll()
  }, [])

  const unlock = useCallback((options: { restore: boolean }) => {
    release.current?.(options)
    release.current = null
  }, [])

  useEffect(() => () => unlock({ restore: true }), [unlock])

  return { lock, unlock }
}
