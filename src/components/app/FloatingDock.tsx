'use client'

import { ChevronUp } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { IconButton } from '@/components/ui/IconButton'
import { usePageScroll, type PageScroll } from '@/hooks/usePageScroll'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { Messenger } from '@/lib/chrome'
import { FOOTER_ROOT_MARGIN, isDockVisible } from '@/lib/dockVisibility'
import { AskAction } from './AskAction'

/**
 * Floating dock (README §5.4): «Наверх» + «Спросить». Hidden on the first screen, while scrolling
 * down and next to the footer; shown when scrolling up. A hidden dock is inert.
 */
export function FloatingDock({ askLabel, action }: { askLabel?: string; action?: Messenger }) {
  const reducedMotion = useReducedMotion()
  const [visible, setVisible] = useState(false)
  const scroll = useRef<PageScroll | null>(null)
  const footerVisible = useRef(false)
  const focusWithin = useRef(false)

  const update = useCallback(() => {
    if (!scroll.current) return
    setVisible(
      isDockVisible({
        y: scroll.current.y,
        vh: window.innerHeight,
        dir: scroll.current.dir,
        footerVisible: footerVisible.current,
        focusWithin: focusWithin.current,
      }),
    )
  }, [])

  usePageScroll((next) => {
    scroll.current = next
    update()
  })

  useEffect(() => {
    const footer = document.querySelector('footer')
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.at(-1)
        if (!entry) return
        footerVisible.current = entry.isIntersecting
        update()
      },
      { rootMargin: FOOTER_ROOT_MARGIN },
    )
    if (footer) observer.observe(footer)
    return () => observer.disconnect()
  }, [update])

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
        update()
      }}
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
        focusWithin.current = false
        update()
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
