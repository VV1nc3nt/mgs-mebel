'use client'

import { useEffect, useEffectEvent, useRef, useState } from 'react'

import { nearestSlide, needsRealign, snapAlignOf, snapTargets } from '@/lib/slider'
import { useReducedMotion } from './useReducedMotion'

// Browsers without `scrollend`: a programmatic scroll is over this long after its last frame.
const SCROLL_SETTLE_MS = 150

/**
 * Where the track rests for each slide, read anew every time: slide widths, scroll-padding and
 * snap-align may change at any breakpoint (salons: mobile — start, tablet — center, desktop — a
 * grid without scrolling).
 */
const measure = (root: HTMLElement) => {
  const style = getComputedStyle(root)
  const slides = Array.from(root.children as HTMLCollectionOf<HTMLElement>)
  const max = root.scrollWidth - root.clientWidth
  const targets = snapTargets(
    slides.map((slide) => ({ left: slide.offsetLeft, width: slide.offsetWidth })),
    {
      width: root.clientWidth,
      paddingStart: parseFloat(style.scrollPaddingLeft) || 0,
      paddingEnd: parseFloat(style.scrollPaddingRight) || 0,
      maxScroll: max,
    },
    snapAlignOf(slides[0] && getComputedStyle(slides[0]).scrollSnapAlign),
  )
  return { targets, max }
}

type Options = {
  /** A swipe or a scroll made another slide active (not a call of `goTo`). */
  onScrollSelect?: (index: number) => void
}

/**
 * The active slide of a scroll-snap track (salons, media sliders): the one whose snap target is
 * nearest to the scroll position (lib/slider.ts), read in the frame after a scroll. `goTo` scrolls
 * to a slide's own target; until that scroll settles the slides it passes do not become active.
 * A resize keeps the active slide: only a new window width counts (iOS Safari resizes the window on
 * a vertical scroll too), picks are held at once (the browser's own re-snap scrolls before the
 * next frame) and the track moves to the active slide's new target instantly.
 *
 * The track element gets `track`, `onScroll` and `onScrollEnd`; its children are the slides.
 */
export function useSnapSlider({ onScrollSelect }: Options = {}) {
  const [active, setActive] = useState(0)
  const reducedMotion = useReducedMotion()
  const track = useRef<HTMLDivElement>(null)
  const pending = useRef(false)
  const settle = useRef<number | undefined>(undefined)
  const frame = useRef<number | undefined>(undefined)
  const lastWidth = useRef(0)

  useEffect(
    () => () => {
      window.clearTimeout(settle.current)
      if (frame.current !== undefined) cancelAnimationFrame(frame.current)
    },
    [],
  )

  const settleLater = () => {
    window.clearTimeout(settle.current)
    settle.current = window.setTimeout(() => {
      pending.current = false
    }, SCROLL_SETTLE_MS)
  }

  /**
   * Scrolls the track to a slide's snap target, horizontally only: the page does not move. False
   * when there is nothing to scroll.
   */
  const scrollToTarget = (index: number, behavior: ScrollBehavior) => {
    const root = track.current
    if (!root?.children[index]) return false
    const { targets, max } = measure(root)
    if (max <= 0) return false
    // The slide's own snap target: the scroll ends where the snap keeps it
    const left = targets[index]
    if (!needsRealign(left, root.scrollLeft)) return false
    pending.current = true
    // An instant scroll may end without `scrollend` (Safari): the timer releases the picks anyway
    if (behavior === 'auto' || !('onscrollend' in window)) settleLater()
    root.scrollTo({ left, behavior })
    return true
  }

  /** Makes a slide active and scrolls to it (smoothly, unless reduced motion). */
  const goTo = (index: number) => {
    setActive(index)
    scrollToTarget(index, reducedMotion ? 'auto' : 'smooth')
  }

  /** Next frame: the slide whose snap target is nearest to the scroll position becomes active. */
  const syncActive = () => {
    if (frame.current !== undefined) cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      frame.current = undefined
      const root = track.current
      if (!root || pending.current) return
      const { targets, max } = measure(root)
      if (max <= 0) return
      const next = nearestSlide(targets, root.scrollLeft)
      if (next === active) return
      setActive(next)
      onScrollSelect?.(next)
    })
  }

  const onScroll = () => {
    if (pending.current) {
      if (!('onscrollend' in window)) settleLater()
      return
    }
    syncActive()
  }

  const onScrollEnd = () => {
    pending.current = false
  }

  // The active slide's new target, read in the frame after the resize
  const realign = useEffectEvent(() => {
    if (!scrollToTarget(active, 'auto')) pending.current = false
  })

  const onResize = useEffectEvent(() => {
    pending.current = true
    window.clearTimeout(settle.current)
    if (frame.current !== undefined) cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      frame.current = undefined
      realign()
    })
  })

  useEffect(() => {
    lastWidth.current = window.innerWidth
    // Only a new width (a turn, a breakpoint): a swipe while iOS Safari folds its toolbars must
    // not jump back (as in lib/chooser.ts)
    const listener = () => {
      if (window.innerWidth === lastWidth.current) return
      lastWidth.current = window.innerWidth
      onResize()
    }
    window.addEventListener('resize', listener, { passive: true })
    return () => window.removeEventListener('resize', listener)
  }, [])

  return { track, active, goTo, onScroll, onScrollEnd }
}
