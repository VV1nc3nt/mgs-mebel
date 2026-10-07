import { useEffect, useEffectEvent, useSyncExternalStore } from 'react'

import { initialStepState, keyDelta, touchStep, wheelStep } from '@/lib/heroStep'
import { isOverlayOpen, subscribeOverlay } from '@/lib/overlay'

type Options = {
  /** Two segments: without them there is nothing to step to. */
  enabled: boolean
  /** Current segment, read at event time. */
  slide: number
  reducedMotion: boolean
  /** Switches the scene by ±1. */
  step: (dir: 1 | -1) => void
}

// Focus on these keeps its own keys: Space presses a button, arrows move between tabs, fields type.
const OWN_KEYS =
  'button, a, [role="tab"], input, textarea, select, [contenteditable]:not([contenteditable="false"]), .chooser'

const ownsKeys = (target: EventTarget | null) =>
  target instanceof Element && target.closest(OWN_KEYS) !== null

/**
 * Scroll step of the hero scene (lib/heroStep): window listeners while the hero is mounted, has
 * two segments and no overlay (menu) is open — the overlay is checked again at event time.
 * No scroll-direction listener: wheel / touch / keys only.
 */
export function useHeroStep({ enabled, slide, reducedMotion, step }: Options): void {
  const overlayOpen = useSyncExternalStore(subscribeOverlay, isOverlayOpen, () => false)
  // Current values at event time, without re-adding the listeners.
  const current = useEffectEvent(() => ({ slide, reducedMotion }))
  const go = useEffectEvent((dir: 1 | -1) => step(dir))

  useEffect(() => {
    if (!enabled || overlayOpen) return
    let state = initialStepState()
    let touchY: number | null = null
    let fired = false

    const input = (dy: number) => {
      const { slide, reducedMotion } = current()
      return { dy, now: Date.now(), scrollY: window.scrollY, slide, rm: reducedMotion }
    }

    // Wheel and keys: true — the scene handled it, the page must not scroll.
    const handle = (dy: number): boolean => {
      const result = wheelStep(state, input(dy))
      state = result.state
      if (result.resetScroll) window.scrollTo({ top: 0, behavior: 'instant' })
      if (result.step) go(result.step)
      return result.consume
    }

    const onWheel = (event: WheelEvent) => {
      if (isOverlayOpen()) return
      if (handle(event.deltaY)) event.preventDefault()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (isOverlayOpen() || event.defaultPrevented || ownsKeys(event.target)) return
      const dy = keyDelta(event)
      if (dy && handle(dy)) event.preventDefault()
    }
    const onTouchStart = (event: TouchEvent) => {
      touchY = event.touches[0]?.clientY ?? null
      fired = false
    }
    const onTouchMove = (event: TouchEvent) => {
      const y = event.touches[0]?.clientY
      if (touchY === null || y === undefined || isOverlayOpen()) return
      const result = touchStep(state, { ...input(touchY - y), fired })
      state = result.state
      fired = result.fired
      if (result.consume && event.cancelable) event.preventDefault()
      if (result.step) go(result.step)
    }
    const onTouchEnd = () => {
      touchY = null
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [enabled, overlayOpen])
}
