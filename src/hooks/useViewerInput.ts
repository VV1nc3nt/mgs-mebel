'use client'

import { useEffect, useEffectEvent } from 'react'

import { getActiveChooser } from '@/lib/chooser'
import { canScrollInside, swipeStep } from '@/lib/viewer'
import { initialStepState, KEY_DELTA, wheelGesture } from '@/lib/wheelGesture'

type Handlers = {
  /** ← / →, tap zones: the previous / next frame. */
  frame: (dir: 1 | -1) => void
  /** ↓ / ↑, wheel: the next / previous project. */
  project: (dir: 1 | -1) => void
  /** Vertical swipe: like `project`, but down on the first project closes. */
  swipe: (dir: 1 | -1) => void
  /** Esc. */
  close: () => void
  reducedMotion: boolean
}

/** Marks a box that scrolls inside the viewer (the expanded description). */
export const VIEWER_SCROLL_ATTR = 'data-viewer-scroll'

// Focus in these types: their keys are their own
const FIELDS = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])'

const scrollBox = (target: EventTarget | null): HTMLElement | null =>
  target instanceof Element ? target.closest<HTMLElement>(`[${VIEWER_SCROLL_ATTR}]`) : null

/**
 * Keys, wheel and swipes of the open project viewer: window listeners while it is mounted.
 * The wheel is the hero's gesture (lib/wheelGesture): one trackpad swipe with its inertia is one
 * project. A box that can still scroll in the gesture's direction keeps the wheel and the swipe.
 * While a messenger choice is open (the CTA's), nothing here works: Esc and the arrows are the
 * choice's (hooks/useChooser.ts), and a swipe that starts with it open only closes it.
 */
export function useViewerInput(handlers: Handlers): void {
  // The latest handlers at event time, without re-adding the listeners
  const current = useEffectEvent(() => handlers)

  useEffect(() => {
    let state = initialStepState()
    const choosing = () => getActiveChooser() !== null
    // Read before the choice's own pointerdown closes it (window capture comes first)
    let pressedChoosing = false
    let touch: {
      x: number
      y: number
      box: HTMLElement | null
      down: boolean
      up: boolean
    } | null = null

    const step = (dy: number) => {
      const result = wheelGesture(state, {
        dy,
        now: Date.now(),
        rm: current().reducedMotion,
        active: true,
        wants: true,
      })
      state = result.state
      if (result.step) current().project(result.step)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      if (event.target instanceof Element && event.target.closest(FIELDS)) return
      if (choosing()) return
      switch (event.key) {
        case 'Escape':
          current().close()
          break
        case 'ArrowRight':
          current().frame(1)
          break
        case 'ArrowLeft':
          current().frame(-1)
          break
        case 'ArrowDown':
          step(KEY_DELTA)
          break
        case 'ArrowUp':
          step(-KEY_DELTA)
          break
        default:
          return
      }
      event.preventDefault()
    }

    const onWheel = (event: WheelEvent) => {
      const box = scrollBox(event.target)
      if (box && canScrollInside(box, event.deltaY > 0 ? 1 : -1)) return
      event.preventDefault()
      if (!choosing()) step(event.deltaY)
    }

    const onPointerDown = () => {
      pressedChoosing = choosing()
    }
    const onTouchStart = (event: TouchEvent) => {
      const t = event.touches[0]
      if (!t || event.touches.length > 1 || pressedChoosing || choosing()) {
        touch = null
        return
      }
      const box = scrollBox(event.target)
      touch = {
        x: t.clientX,
        y: t.clientY,
        box,
        down: Boolean(box && canScrollInside(box, 1)),
        up: Boolean(box && canScrollInside(box, -1)),
      }
    }
    // The page under the viewer never moves; a scrolling box scrolls itself
    const onTouchMove = (event: TouchEvent) => {
      if (!touch?.box && event.cancelable) event.preventDefault()
    }
    const onTouchEnd = (event: TouchEvent) => {
      const t = event.changedTouches[0]
      const start = touch
      touch = null
      if (!t || !start) return
      const dir = swipeStep({ dx: t.clientX - start.x, dy: t.clientY - start.y })
      if (!dir) return
      // Finger up scrolls the box down: it keeps the swipe while it can
      if (start.box && (dir === 1 ? start.down : start.up)) return
      current().swipe(dir)
    }

    window.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true })
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, { capture: true })
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [])
}
