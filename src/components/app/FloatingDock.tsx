'use client'

import { ChevronUp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { IconButton } from '@/components/ui/IconButton'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { Messenger } from '@/lib/chrome'
import {
  FOOTER_ROOT_MARGIN,
  initialDockScroll,
  isDockVisible,
  nextDockScroll,
  type DockScroll,
} from '@/lib/dockVisibility'
import { AskAction } from './AskAction'

/**
 * Floating dock (README §5.4): «Наверх» + «Спросить». Hidden on the first screen, while scrolling
 * down and next to the footer; shown when scrolling up. A hidden dock is inert.
 */
export function FloatingDock({ askLabel, action }: { askLabel?: string; action?: Messenger }) {
  const reducedMotion = useReducedMotion()
  const [visible, setVisible] = useState(false)
  const scroll = useRef<DockScroll | null>(null)
  const footerVisible = useRef(false)
  const focusWithin = useRef(false)
  const update = useRef<() => void>(() => {})

  useEffect(() => {
    let frame = 0
    const compute = () => {
      frame = 0
      const y = window.scrollY
      scroll.current = scroll.current ? nextDockScroll(scroll.current, y) : initialDockScroll(y)
      setVisible(
        isDockVisible({
          y,
          vh: window.innerHeight,
          dir: scroll.current.dir,
          footerVisible: footerVisible.current,
          focusWithin: focusWithin.current,
        }),
      )
    }
    update.current = compute
    const onScroll = () => {
      // The menu's scroll lock jumps the page to the top and back: not a user scroll.
      if (document.documentElement.hasAttribute('data-scroll-locked')) return
      frame ||= requestAnimationFrame(compute)
    }

    const footer = document.querySelector('footer')
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.at(-1)
        if (!entry) return
        footerVisible.current = entry.isIntersecting
        compute()
      },
      { rootMargin: FOOTER_ROOT_MARGIN },
    )
    if (footer) observer.observe(footer)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    compute()
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const toTop = () => {
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'instant' : 'smooth' })
    // The start of the page, as the skip link does; the scroll is already on its way.
    document.getElementById('content')?.focus({ preventScroll: true })
  }

  return (
    <div
      data-hidden={visible ? undefined : ''}
      inert={!visible}
      onFocus={() => {
        focusWithin.current = true
        update.current()
      }}
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
        focusWithin.current = false
        update.current()
      }}
      className="dock z-dock flex items-center gap-1 rounded-dock glass-dock p-1 shadow-dock"
    >
      <IconButton variant="ghost" size={44} aria-label="Наверх" onClick={toTop}>
        <ChevronUp />
      </IconButton>
      <AskAction label={askLabel} action={action} />
    </div>
  )
}
