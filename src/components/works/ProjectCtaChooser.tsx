'use client'

import type { ReactNode } from 'react'

import { MessengerIcon } from '@/components/icons/MessengerIcon'
import { Action } from '@/components/ui/Action'
import { useChooser } from '@/hooks/useChooser'
import {
  CHOOSER_CLOSE_LABEL,
  CHOOSER_GROUP_LABEL,
  chooserLabel,
  MESSENGER_NAMES,
  type Messenger,
} from '@/lib/chrome'
import { cssVars } from '@/lib/cssVars'
import { CTA_CONTENT, CTA_TILE, CTA_TRIGGER } from './projectCtaStyles'

type Props = {
  caption: string
  /** Two or three, in MESSENGER_ORDER. */
  messengers: Messenger[]
  /** Ids of the title and text: the description of the button. */
  describedBy: string
  /** Title and text (server). */
  head: ReactNode
  /** «<button> →» of the closed tile (server). */
  label: ReactNode
}

/**
 * The CTA tile with a choice of messengers (two or three): the tile is the button. Open, the label
 * at the bottom gives way to the messenger links, 44 each, in the same place — nothing grows out
 * of the tile or covers the title; «×» joins the row where it fits. Esc, a click outside, ←/→ and
 * the focus — useChooser, as every contact button; closed, the focus is on the tile.
 */
export function ProjectCtaChooser({ caption, messengers, describedBy, head, label }: Props) {
  const { open, rootRef, groupRef, buttonRef, onButtonClick, onPick, onKeyDown } = useChooser()

  return (
    <div
      ref={rootRef}
      data-open={open ? '' : undefined}
      onKeyDown={onKeyDown}
      className={`${CTA_TILE} chooser`}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-label={open ? CHOOSER_CLOSE_LABEL : chooserLabel(caption)}
        aria-describedby={describedBy}
        onClick={onButtonClick}
        className={CTA_TRIGGER}
      />
      <div className={CTA_CONTENT}>
        {head}
        {/* The label and the links share one cell: the open row never moves the text above */}
        <div className="mt-auto grid items-end">
          <div className="col-start-1 row-start-1 chooser-motion group-data-open/cta:opacity-0">
            {label}
          </div>
          <div
            ref={groupRef}
            role="group"
            aria-label={CHOOSER_GROUP_LABEL}
            inert={!open}
            className="col-start-1 row-start-1 flex gap-1"
          >
            {messengers.map(({ kind, href }, i) => (
              <Action
                key={kind}
                href={href}
                aria-label={MESSENGER_NAMES[kind]}
                onClick={onPick}
                style={cssVars({ '--i': messengers.length - 1 - i })}
                className="pointer-events-none flex size-11 shrink-0 scale-60 chooser-motion items-center justify-center rounded-full border border-border-strong bg-surface-3 text-text opacity-0 chooser-stagger group-data-open/cta:pointer-events-auto group-data-open/cta:scale-100 group-data-open/cta:opacity-100 hover:border-accent"
              >
                <MessengerIcon kind={kind} className="size-5.5 shrink-0" />
              </Action>
            ))}
            {/* «×» of the tile button where it fits (clicks go through to it); narrow — the tile */}
            <span
              aria-hidden="true"
              className="relative hidden size-11 shrink-0 scale-60 chooser-motion items-center justify-center rounded-full bg-accent opacity-0 group-data-open/cta:scale-100 group-data-open/cta:opacity-100 @cta-tile:flex"
            >
              <span className="absolute h-0.5 w-4 rotate-45 rounded-full bg-on-accent" />
              <span className="absolute h-0.5 w-4 -rotate-45 rounded-full bg-on-accent" />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
