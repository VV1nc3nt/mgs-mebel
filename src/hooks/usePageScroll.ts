import { useEffect, useLayoutEffect, useRef } from 'react'

import {
  clampScrollY,
  initialScroll,
  nextScroll,
  type ScrollDirection,
  type ScrollTrack,
} from '@/lib/scrollDirection'

export type PageScroll = { y: number; dir: ScrollDirection }
type Listener = (scroll: PageScroll) => void

/*
 * One passive scroll listener and one frame for everything that follows the page scroll (the
 * header and the dock), so both see the same direction in the same frame.
 */
const listeners = new Set<Listener>()
let track: ScrollTrack | null = null
let frame = 0
let scrolled = false

const readY = () =>
  clampScrollY(window.scrollY, document.documentElement.scrollHeight - window.innerHeight)

// The menu's scroll lock jumps the page to the top and back: not a user scroll.
const locked = () => document.documentElement.hasAttribute('data-scroll-locked')

function flush() {
  frame = 0
  const y = readY()
  // Only a scroll turns the direction; a resize (Safari's toolbar) re-evaluates with the old one
  track = !track ? initialScroll(y) : scrolled ? nextScroll(track, y) : track
  scrolled = false
  const scroll = { y, dir: track.dir }
  for (const listener of listeners) listener(scroll)
}

function onScroll() {
  if (locked()) return
  scrolled = true
  frame ||= requestAnimationFrame(flush)
}

function onResize() {
  if (locked()) return
  frame ||= requestAnimationFrame(flush)
}

export function subscribePageScroll(listener: Listener): () => void {
  if (!listeners.size) {
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize, { passive: true })
  }
  listeners.add(listener)
  const y = readY()
  track ??= initialScroll(y)
  listener({ y, dir: track.dir })
  return () => {
    listeners.delete(listener)
    if (listeners.size) return
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onResize)
    cancelAnimationFrame(frame)
    frame = 0
    track = null
    scrolled = false
  }
}

/** Calls `callback` with the clamped scrollY and direction: now, then once per frame. */
export function usePageScroll(callback: Listener) {
  const ref = useRef(callback)
  useLayoutEffect(() => {
    ref.current = callback
  })
  useEffect(() => subscribePageScroll((scroll) => ref.current(scroll)), [])
}
