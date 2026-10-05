'use client'

import { ChevronUp } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { MessengerIcon } from '@/components/icons/MessengerIcon'
import { Action } from '@/components/ui/Action'
import { IconButton } from '@/components/ui/IconButton'
import { useChooser } from '@/hooks/useChooser'
import { usePageScroll, type PageScroll } from '@/hooks/usePageScroll'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { DOCK_GROUP_LABEL, MESSENGER_NAMES, type Messenger } from '@/lib/chrome'
import { cn } from '@/lib/cn'
import { cssVars } from '@/lib/cssVars'
import { FOOTER_ROOT_MARGIN, isDockVisible } from '@/lib/dockVisibility'
import { AskAction } from './AskAction'

/**
 * Floating dock (README §5.4): «Наверх» + «Спросить». Hidden on the first screen, while scrolling
 * down and next to the footer; shown when scrolling up. A hidden dock is inert.
 * With two or three messengers «Спросить» opens the choice in place (README of the dock, variant
 * B): «Наверх» folds, the logos come out to the left, «Спросить» turns into «×». While the choice
 * is open the dock stays.
 */
export function FloatingDock({
  askLabel,
  messengers,
}: {
  askLabel?: string
  messengers: Messenger[]
}) {
  const reducedMotion = useReducedMotion()
  const [visible, setVisible] = useState(false)
  const scroll = useRef<PageScroll | null>(null)
  const footerVisible = useRef(false)
  /** Keyboard focus is inside: the dock never hides from under it. */
  const focusWithin = useRef(false)
  const {
    open: chooserOpen,
    rootRef,
    groupRef,
    buttonRef,
    onButtonClick,
    onPick,
    onKeyDown,
  } = useChooser()
  const ask = askLabel && messengers.length > 0 ? askLabel : undefined
  const choice = Boolean(ask) && messengers.length > 1
  const open = choice && chooserOpen
  const openRef = useRef(open)

  const update = useCallback(() => {
    if (!scroll.current) return
    setVisible(
      isDockVisible({
        y: scroll.current.y,
        vh: window.innerHeight,
        dir: scroll.current.dir,
        footerVisible: footerVisible.current,
        focusWithin: focusWithin.current,
        chooserOpen: openRef.current,
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

  useEffect(() => {
    openRef.current = open
    update()
  }, [open, update])

  const toTop = () => {
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'instant' : 'smooth' })
    // The start of the page, as the skip link does; the scroll is already on its way.
    document.getElementById('content')?.focus({ preventScroll: true })
  }

  return (
    <div
      ref={rootRef}
      data-hidden={visible ? undefined : ''}
      data-open={open ? '' : undefined}
      inert={!visible}
      onFocus={(event) => {
        // Keyboard focus only: a tap or click also focuses the button in most browsers, and the
        // dock would then stay on screen after the choice closes on a scroll.
        focusWithin.current = event.target.matches(':focus-visible')
        update()
      }}
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
        focusWithin.current = false
        update()
      }}
      onKeyDown={onKeyDown}
      className="group/chooser dock z-dock flex items-center rounded-dock glass-dock p-1 shadow-dock chooser"
    >
      {/* Spacing by margins, not gap: a folded item takes no room at all */}
      <div
        inert={open}
        className={cn(
          'flex w-11 shrink-0 chooser-motion overflow-hidden group-data-open/chooser:mr-0 group-data-open/chooser:w-0 group-data-open/chooser:opacity-0',
          ask && 'mr-1',
        )}
      >
        <IconButton variant="ghost" size={44} aria-label="Наверх" onClick={toTop}>
          <ChevronUp />
        </IconButton>
      </div>
      {choice && (
        <div
          ref={groupRef}
          role="group"
          aria-label={DOCK_GROUP_LABEL}
          inert={!open}
          className="flex"
        >
          {messengers.map(({ kind, href }, i) => (
            <Action
              key={kind}
              href={href}
              aria-label={MESSENGER_NAMES[kind]}
              onClick={onPick}
              style={cssVars({ '--i': messengers.length - 1 - i })}
              className={cn(
                'group/logo flex h-11 w-0 shrink-0 scale-60 chooser-motion items-center justify-center overflow-hidden rounded-full opacity-0 chooser-stagger',
                'group-data-open/chooser:mr-1 group-data-open/chooser:w-11 group-data-open/chooser:scale-100 group-data-open/chooser:opacity-100',
              )}
            >
              {/* The ring is inside: a 0-wide link with a border would still take 2px */}
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border-strong text-text transition-colors group-hover/logo:border-accent group-hover/logo:bg-surface">
                <MessengerIcon kind={kind} className="size-5.5" />
              </span>
            </Action>
          ))}
        </div>
      )}
      {ask && (
        <AskAction
          ref={buttonRef}
          label={ask}
          messengers={messengers}
          open={open}
          onClick={onButtonClick}
        />
      )}
    </div>
  )
}
