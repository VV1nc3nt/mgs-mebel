import { useEffect, useEffectEvent, useSyncExternalStore } from 'react'

import { subscribePageScroll } from '@/hooks/usePageScroll'
import { initialStepState, keyDelta, TOP_Y, touchStep, wheelStep } from '@/lib/heroStep'
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
 * No scroll-direction listener: wheel / touch / keys only. Wheel and touchmove block scrolling
 * (non-passive) only at the very top, where the scene takes them; below it they stay passive, so
 * the page scrolls without waiting for the main thread, and the gesture state still sees them.
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
    // Wheel and touchmove are non-passive now: preventDefault works
    let blocking = false

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
      if (handle(event.deltaY) && blocking) event.preventDefault()
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
      if (result.consume && blocking && event.cancelable) event.preventDefault()
      if (result.step) go(result.step)
    }
    const onTouchEnd = () => {
      touchY = null
    }

    // The options of a listener are fixed when it is added: switching means remove, then add
    const listen = (block: boolean) => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchmove', onTouchMove)
      window.addEventListener('wheel', onWheel, { passive: !block })
      window.addEventListener('touchmove', onTouchMove, { passive: !block })
      blocking = block
    }

    listen(window.scrollY <= TOP_Y)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    // The shared page scroll listener: at the top again (or away from it) — switch
    const unsubscribe = subscribePageScroll(({ y }) => {
      if ((y <= TOP_Y) !== blocking) listen(!blocking)
    })
    return () => {
      unsubscribe()
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [enabled, overlayOpen])
}
