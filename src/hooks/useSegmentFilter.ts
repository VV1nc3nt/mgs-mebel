'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'

import { filterScrollTarget, filterUrl, isStuck, parseFilter } from '@/lib/segmentFilter'
import { useReducedMotion } from './useReducedMotion'

// Fallback for the end of the scroll to the list: no `scrollend` when the page is already there
const SCROLL_SETTLE_MS = 1000

type Options<T extends string> = {
  /** URL parameter, e.g. `category`. */
  param: string
  /** Values shown in the bar. */
  values: readonly T[]
  /** «все»: no parameter in the URL; unknown values fall back to it too. */
  fallback: T
  /**
   * Keep the last value while the URL is not the list's own (works: the project viewer is open
   * on /works/<slug>, whose URL has no filter).
   */
  frozen?: boolean
}

/**
 * State of a sticky segment filter (catalogs, works): the value lives in the URL (`?param=`) and
 * is read with useSearchParams, so the server renders the filtered list and back / forward stay
 * in sync. A change replaces the history entry (no new one). If the bar is stuck, the page
 * scrolls to the start of the list; otherwise the position stays.
 * `sentinelRef` — an empty element right before the bar, `barRef` — the bar.
 */
export function useSegmentFilter<T extends string>({
  param,
  values,
  fallback,
  frozen = false,
}: Options<T>) {
  const fromUrl = parseFilter(useSearchParams().get(param), values, fallback)
  const [kept, setKept] = useState(fromUrl)
  if (!frozen && kept !== fromUrl) setKept(fromUrl)
  const value = frozen ? kept : fromUrl
  const reducedMotion = useReducedMotion()
  const sentinelRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const scrollPending = useRef(false)

  const select = useCallback(
    (next: T) => {
      if (next === value) return
      const sentinel = sentinelRef.current
      const bar = barRef.current
      // Measured before the list changes: a shorter list may move the page by itself
      scrollPending.current = Boolean(
        sentinel &&
        bar &&
        isStuck(sentinel.getBoundingClientRect().top, bar.getBoundingClientRect().top),
      )
      // Chrome's scroll anchoring would move the page when the cards around the viewport go —
      // first a jump, then the scroll to the list runs down and hides the smart header. Off until
      // that scroll ends.
      if (scrollPending.current) document.documentElement.style.overflowAnchor = 'none'
      window.history.replaceState(null, '', filterUrl(window.location.href, param, next, fallback))
    },
    [value, param, fallback],
  )

  useLayoutEffect(() => {
    const sentinel = sentinelRef.current
    if (!scrollPending.current || !sentinel) return
    scrollPending.current = false
    const root = document.documentElement
    const top = filterScrollTarget({
      y: window.scrollY,
      barY: sentinel.getBoundingClientRect().top + window.scrollY,
      headerH: Number(root.style.getPropertyValue('--header-h')) || 0,
      pinned: root.hasAttribute('data-header-pinned'),
    })
    const restore = () => {
      window.clearTimeout(timer)
      window.removeEventListener('scrollend', restore)
      root.style.removeProperty('overflow-anchor')
    }
    const timer = window.setTimeout(restore, SCROLL_SETTLE_MS)
    window.addEventListener('scrollend', restore)
    window.scrollTo({ top, behavior: reducedMotion ? 'auto' : 'smooth' })
  }, [value, reducedMotion])

  return { value, select, sentinelRef, barRef }
}
