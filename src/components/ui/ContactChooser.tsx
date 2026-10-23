'use client'

import { useEffect, useState } from 'react'

import { MessengerIcon } from '@/components/icons/MessengerIcon'
import { useChooser } from '@/hooks/useChooser'
import {
  CHOOSER_CLOSE_LABEL,
  CHOOSER_GROUP_LABEL,
  chooserLabel,
  MESSENGER_NAMES,
  type Messenger,
} from '@/lib/chrome'
import { chooserGeometry } from '@/lib/chooserGeometry'
import { cn } from '@/lib/cn'
import { cssVars } from '@/lib/cssVars'
import { Action } from './Action'
import { BUTTON_SIZE, BUTTON_VARIANT } from './Button'

export type ContactSize = 44 | 48 | 52
export type ContactTone = 'accent' | 'outline'
/** `true` — the width of the parent; `'mobile'` — on mobile only, by content from tablet. */
export type ContactWidth = boolean | 'mobile'

export type ContactChooserProps = {
  caption: string
  /** Two or three, in MESSENGER_ORDER. */
  messengers: Messenger[]
  size: ContactSize
  fullWidth: ContactWidth
  /** `outline` — on an accent block (the CTA of an article). */
  tone: ContactTone
  arrow: boolean
  /** Which way the open capsule grows: `start` — to the left (the header), `end` — to the right. */
  grow: 'start' | 'end'
  /**
   * The header: while open, the elements marked `chooser-shifted` in the nearest
   * `[data-chooser-shift]` move aside by the growth of the capsule (transform only).
   */
  shiftNeighbours?: boolean
}

const WIDTH = { auto: '', full: 'w-full', mobile: 'w-full md:w-auto' } as const

// The label sizes of Button (README §5.6)
const TEXT: Record<ContactSize, string> = {
  44: 'text-button-s',
  48: 'text-button-s',
  52: 'text-button',
}

const TONE: Record<ContactTone, string> = {
  accent: BUTTON_VARIANT.primary,
  // On the accent block the ring is dark while closed (README of the buttons §4)
  outline: cn(
    BUTTON_VARIANT['inverse-outline'],
    'outline-on-accent group-data-open/chooser:border-transparent group-data-open/chooser:bg-accent group-data-open/chooser:text-on-accent group-data-open/chooser:outline-accent',
  ),
}

/**
 * Contact button with a choice of messengers, opened in place (README of the buttons, variant
 * «Сегменты»): the button turns into a dark capsule with a cell per messenger and «×» at the end.
 * The closed button looks like Button; a hidden copy of its label keeps its place in the flow and
 * the capsule lies over it, so neighbours never move. The cells and the glass appear only once the
 * place is measured: before that (server HTML, first frame) the button simply covers it.
 */
export function ContactChooser({
  caption,
  messengers,
  size,
  fullWidth,
  tone,
  arrow,
  grow,
  shiftNeighbours = false,
}: ContactChooserProps) {
  const { open, rootRef, groupRef, buttonRef, onButtonClick, onPick, onKeyDown } = useChooser()
  const [width, setWidth] = useState<number | null>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    // Fractional: a rounded width would shift a right-anchored capsule by a fraction of a pixel
    const observer = new ResizeObserver(() => setWidth(root.getBoundingClientRect().width))
    observer.observe(root)
    return () => observer.disconnect()
  }, [rootRef])

  const measured = width !== null
  // Sizes in px only while open; closed, the capsule and the button take the place of the button
  // (100%), so a late change of that place (a font loading) never leaves them a frame behind
  const geometry =
    open && measured ? chooserGeometry({ width, height: size, n: messengers.length, open }) : null
  const growth = geometry && width !== null ? geometry.width - width : 0

  useEffect(() => {
    if (!shiftNeighbours) return
    const row = rootRef.current?.closest<HTMLElement>('[data-chooser-shift]')
    if (!row) return
    row.style.setProperty('--chooser-shift', String(growth))
    row.toggleAttribute('data-chooser-open', growth > 0)
  }, [shiftNeighbours, growth, rootRef])

  const widthKey = fullWidth === 'mobile' ? 'mobile' : fullWidth ? 'full' : 'auto'

  return (
    <div
      ref={rootRef}
      data-open={open ? '' : undefined}
      onKeyDown={onKeyDown}
      className={cn('group/chooser relative inline-flex shrink-0 chooser', WIDTH[widthKey])}
    >
      <span
        aria-hidden="true"
        className={cn(
          'invisible inline-flex items-center gap-2.5 whitespace-nowrap',
          BUTTON_SIZE[size],
          tone === 'outline' && 'border',
        )}
      >
        {caption}
        {arrow && <span>→</span>}
      </span>

      <div
        style={
          geometry
            ? cssVars({
                '--capsule-w': geometry.width,
                '--capsule-h': geometry.height,
                '--button-w': geometry.button,
              })
            : undefined
        }
        className={cn(
          // Placed the same way in every state: only the size changes, between the place of the
          // button (100%) and the open numbers, so nothing shifts
          'absolute top-1/2 flex -translate-y-1/2 items-center rounded-full group-data-open/chooser:p-1.25',
          grow === 'start' ? 'right-0' : 'left-0',
          geometry ? 'chooser-capsule' : 'size-full',
          measured && 'chooser-motion',
        )}
      >
        {measured && (
          <>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 chooser-motion rounded-full glass-dock opacity-0 group-data-open/chooser:opacity-100"
            />
            <div
              ref={groupRef}
              role="group"
              aria-label={CHOOSER_GROUP_LABEL}
              inert={!open}
              className="relative flex h-full min-w-0 flex-1 chooser-motion gap-1 group-data-open/chooser:mr-1"
            >
              {messengers.map(({ kind, href }, i) => (
                <Action
                  key={kind}
                  href={href}
                  aria-label={MESSENGER_NAMES[kind]}
                  onClick={onPick}
                  style={cssVars({ '--i': messengers.length - 1 - i })}
                  className="flex min-w-0 flex-1 scale-60 chooser-motion items-center justify-center rounded-full border border-border-strong text-text opacity-0 chooser-stagger group-data-open/chooser:scale-100 group-data-open/chooser:opacity-100 hover:border-accent hover:bg-surface"
                >
                  <MessengerIcon kind={kind} className="size-5.5 shrink-0" />
                </Action>
              ))}
            </div>
          </>
        )}
        <button
          ref={buttonRef}
          type="button"
          aria-expanded={open}
          aria-label={open ? CHOOSER_CLOSE_LABEL : chooserLabel(caption)}
          onClick={onButtonClick}
          className={cn(
            // overflow-hidden: the wide label must not take the clicks of the cells next to «×»
            'relative h-full shrink-0 chooser-motion overflow-hidden rounded-full',
            geometry ? 'chooser-button' : 'w-full',
            TEXT[size],
            TONE[tone],
          )}
        >
          <span className="pointer-events-none absolute inset-0 flex chooser-motion items-center justify-center gap-2.5 whitespace-nowrap group-data-open/chooser:opacity-0">
            {caption}
            {arrow && <span aria-hidden="true">→</span>}
          </span>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex scale-60 chooser-motion -rotate-90 items-center justify-center opacity-0 group-data-open/chooser:scale-100 group-data-open/chooser:rotate-0 group-data-open/chooser:opacity-100"
          >
            <span className="absolute h-0.5 w-4 rotate-45 rounded-full bg-on-accent" />
            <span className="absolute h-0.5 w-4 -rotate-45 rounded-full bg-on-accent" />
          </span>
        </button>
      </div>
    </div>
  )
}
