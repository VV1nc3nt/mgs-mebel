'use client'

import type { ReactNode } from 'react'

import { MessengerIcon } from '@/components/icons/MessengerIcon'
import { Action } from '@/components/ui/Action'
import { ChooserCapsule } from '@/components/ui/ContactChooser'
import { useChooser } from '@/hooks/useChooser'
import {
  CHOOSER_CLOSE_LABEL,
  CHOOSER_GROUP_LABEL,
  chooserLabel,
  MESSENGER_NAMES,
  type Messenger,
} from '@/lib/chrome'
import { cssVars } from '@/lib/cssVars'
import { CTA_CONTENT, CTA_LABEL_TEXT, CTA_TILE, CTA_TRIGGER } from './projectCtaStyles'

type Props = {
  caption: string
  /** Two or three, in MESSENGER_ORDER. */
  messengers: Messenger[]
  /** Ids of the title and text: the description of the button. */
  describedBy: string
  /** Title and text (server). */
  head: ReactNode
}

/**
 * The CTA tile with a choice of messengers (two or three): the tile is the button, one useChooser
 * for the whole tile. Wide (`@cta-tile`), the lime capsule at the bottom is the capsule of the
 * contact buttons (ChooserCapsule): it turns into the row of logos and «×» with the same motion.
 * Narrow, no capsule fits: the lime label leaves, then the logos come out one by one from its
 * corner, left to right (`chooser-reveal`). Nothing grows out of the tile or covers the title.
 * Esc, a click outside, ←/→ and the focus — useChooser; closed, the focus is on the tile.
 */
export function ProjectCtaChooser({ caption, messengers, describedBy, head }: Props) {
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
        {/* Both layouts share one cell (only one is shown): the open row never moves the text */}
        <div
          ref={groupRef}
          style={cssVars({ '--n': messengers.length })}
          className="mt-auto grid items-end"
        >
          <span
            aria-hidden="true"
            className={`col-start-1 row-start-1 ${CTA_LABEL_TEXT} chooser-reveal-label group-data-open/cta:opacity-0 @cta-tile:hidden`}
          >
            {caption} →
          </span>
          <div
            role="group"
            aria-label={CHOOSER_GROUP_LABEL}
            inert={!open}
            className="col-start-1 row-start-1 flex gap-1 @cta-tile:hidden"
          >
            {messengers.map(({ kind, href }, i) => (
              <Action
                key={kind}
                href={href}
                aria-label={MESSENGER_NAMES[kind]}
                onClick={onPick}
                style={cssVars({ '--i': i })}
                className="chooser-reveal pointer-events-none flex size-11 shrink-0 origin-bottom-left scale-60 items-center justify-center rounded-full border border-border-strong bg-surface-3 text-text opacity-0 group-data-open/cta:pointer-events-auto group-data-open/cta:scale-100 group-data-open/cta:opacity-100 hover:border-accent"
              >
                <MessengerIcon kind={kind} className="size-5.5 shrink-0" />
              </Action>
            ))}
          </div>
          <div className="col-start-1 row-start-1 hidden @cta-tile:flex">
            <ChooserCapsule
              caption={caption}
              messengers={messengers}
              size={44}
              fullWidth={false}
              tone="accent"
              arrow
              grow="end"
              open={open}
              onPick={onPick}
              fit
              buttonClassName="group-hover/cta:bg-accent-hover"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
