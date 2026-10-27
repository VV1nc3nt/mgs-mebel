'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { useReducedMotion } from './useReducedMotion'
import { rootTime } from './useShareStatus'

export type FeedShown<K, V> = {
  key: K
  value: V
  /** Number of feed changes: 0 while the feed is the one rendered on the server. */
  generation: number
}

type Options<K extends string, V> = {
  /** The feed rendered on the server. */
  initial: { key: K; value: V }
  /** The feed the page wants now (the value in the URL…): another one is shown in place. */
  want: K
  /** A feed not in memory yet: a Server Action, or the value at once (cards on hand). */
  load: (key: K) => V | Promise<V>
  /** A failed load: the shown feed stays; back to its key (the chip and the URL). */
  onFail?: (shown: K) => void
}

/**
 * The feed of a page with chips (works, catalogs, news) and its change: a feed is loaded once and
 * kept in memory; the old elements fade out (`leaving`, --motion-feed-out) while the new ones load;
 * a response to a request that is no longer the latest is dropped. `show` starts a change right
 * away (a click: the request goes before the next render); a change of `want` shows its feed too.
 */
export function useFeedSwitch<K extends string, V>({ initial, want, load, onFail }: Options<K, V>) {
  const reducedMotion = useReducedMotion()
  const [shown, setShown] = useState<FeedShown<K, V>>({ ...initial, generation: 0 })
  const [leaving, setLeaving] = useState(false)
  const cache = useRef(new Map<K, V>([[initial.key, initial.value]]))
  const requestRef = useRef(0)
  // The latest requested feed: a change of `want` to it does nothing
  const requested = useRef(initial.key)
  const shownRef = useRef(shown)
  const latest = useRef({ load, onFail })
  useLayoutEffect(() => {
    shownRef.current = shown
    latest.current = { load, onFail }
  })

  const show = (key: K) => {
    const id = ++requestRef.current
    requested.current = key
    if (key === shownRef.current.key) {
      // Back to the shown feed before the other one came: that request is dropped
      setLeaving(false)
      return
    }
    let data: V | Promise<V>
    try {
      data = cache.current.has(key) ? (cache.current.get(key) as V) : latest.current.load(key)
    } catch (error) {
      data = Promise.reject(error)
    }
    const out = reducedMotion ? 0 : rootTime('--motion-feed-out')
    if (out) setLeaving(true)
    const faded = new Promise((resolve) => window.setTimeout(resolve, out))
    Promise.all([data, faded])
      .then(([value]) => {
        if (id !== requestRef.current) return
        cache.current.set(key, value)
        setLeaving(false)
        setShown((s) => ({ key, value, generation: s.generation + 1 }))
      })
      .catch(() => {
        if (id !== requestRef.current) return
        // The feed stays as it was, and so does the chip
        const back = shownRef.current.key
        requested.current = back
        setLeaving(false)
        latest.current.onFail?.(back)
      })
  }

  const showRef = useRef(show)
  useLayoutEffect(() => {
    showRef.current = show
  })
  useEffect(() => {
    if (want !== requested.current) showRef.current(want)
  }, [want])

  /** A change of a feed in memory (and on screen, if shown), not a feed change: «Показать ещё». */
  const update = useCallback((key: K, change: (value: V) => V) => {
    const current = cache.current.get(key)
    if (current === undefined) return
    const value = change(current)
    cache.current.set(key, value)
    setShown((s) => (s.key === key ? { ...s, value } : s))
  }, [])

  /** The latest requested feed: the shown one, or the one on its way. */
  const requestedKey = useCallback(() => requested.current, [])

  return { shown, leaving, show, update, requestedKey }
}
