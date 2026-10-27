'use client'

import { useLayoutEffect, type RefObject } from 'react'

import { useReducedMotion } from './useReducedMotion'
import { rootTime } from './useShareStatus'

/** An element with any part inside the viewport. */
const inViewport = (el: Element) => {
  const { top, bottom } = el.getBoundingClientRect()
  return bottom > 0 && top < window.innerHeight
}

/**
 * The wave of a new feed (`feed-wave` in globals.css): after each feed change (`generation`) the
 * children of the list in the viewport wait hidden (before the first paint) and rise one by one
 * (--motion-feed-stagger), each when its image is ready, at most --motion-feed-wait after its turn.
 * The list rendered on the server (generation 0) and reduced motion — no wave.
 */
export function useFeedWave(listRef: RefObject<HTMLElement | null>, generation: number) {
  const reducedMotion = useReducedMotion()
  useLayoutEffect(() => {
    const list = listRef.current
    if (!generation || !list || reducedMotion) return
    const stagger = rootTime('--motion-feed-stagger')
    const wait = rootTime('--motion-feed-wait')
    const timers: number[] = []
    const cleanups: (() => void)[] = []
    const visible = [...list.children].filter(inViewport) as HTMLElement[]
    visible.forEach((item, i) => {
      item.dataset.wave = 'wait'
      const rise = () => {
        if (item.dataset.wave !== 'wait') return
        // Applied in the next frame, so the hidden state is painted and the transition runs
        timers.push(window.requestAnimationFrame(() => (item.dataset.wave = 'in')))
      }
      timers.push(
        window.setTimeout(() => {
          const image = item.querySelector('img')
          if (!image || image.complete) return rise()
          image.addEventListener('load', rise, { once: true })
          image.addEventListener('error', rise, { once: true })
          cleanups.push(() => {
            image.removeEventListener('load', rise)
            image.removeEventListener('error', rise)
          })
          timers.push(window.setTimeout(rise, wait))
        }, stagger * i),
      )
    })
    return () => {
      timers.forEach((t) => {
        window.clearTimeout(t)
        window.cancelAnimationFrame(t)
      })
      cleanups.forEach((fn) => fn())
      for (const item of visible) delete item.dataset.wave
    }
  }, [listRef, generation, reducedMotion])
}
