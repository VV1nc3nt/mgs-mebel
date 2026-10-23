'use client'

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
} from 'react'

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

// The horizontal padding of BUTTON_SIZE: around a label clipped to the place (`fit`)
const PAD: Record<ContactSize, string> = {
  44: 'px-4.5',
  48: 'px-4.5',
  52: 'px-8',
}

/**
 * Contact button with a choice of messengers, opened in place (README of the buttons, variant
 * «Сегменты»): the button turns into a dark capsule with a cell per messenger and «×» at the end.
 * The closed button looks like Button; a hidden copy of its label keeps its place in the flow and
 * the capsule lies over it, so neighbours never move. The cells and the glass appear only once the
 * place is measured: before that (server HTML, first frame) the button simply covers it.
 */
export function ContactChooser(props: ContactChooserProps) {
  const { open, rootRef, groupRef, buttonRef, onButtonClick, onPick, onKeyDown } = useChooser()
  return (
    <ChooserCapsule
      {...props}
      open={open}
      onPick={onPick}
      rootRef={rootRef}
      groupRef={groupRef}
      onKeyDown={onKeyDown}
      buttonRef={buttonRef}
      onButtonClick={onButtonClick}
    />
  )
}

type ChooserCapsuleProps = ContactChooserProps & {
  open: boolean
  onPick: (event: MouseEvent<HTMLAnchorElement>) => void
  rootRef?: RefObject<HTMLDivElement | null>
  groupRef?: RefObject<HTMLDivElement | null>
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void
  /**
   * Its own button with `onButtonClick` (contact buttons). Without it the button is only drawn: the trigger lies under
   * the capsule (the CTA tile of a project page), «×» and the closed capsule let clicks through to
   * it, and the cells take clicks only while open.
   */
  onButtonClick?: (event: MouseEvent<HTMLButtonElement>) => void
  buttonRef?: RefObject<HTMLButtonElement | null>
  /** The capsule never grows wider than its parent: a long label is clipped with «…». */
  fit?: boolean
  /** Extra classes of the button (a hover of the drawn button from the trigger under it). */
  buttonClassName?: string
}

/**
 * The capsule of a contact button: closed — the button, open — the cells, the glass and «×», sized
 * by chooserGeometry. ContactChooser gives it the state of useChooser and its own button; the CTA
 * tile of a project page — the state of the tile, so the same motion opens there.
 */
export function ChooserCapsule({
  caption,
  messengers,
  size,
  fullWidth,
  tone,
  arrow,
  grow,
  shiftNeighbours = false,
  open,
  onPick,
  rootRef,
  groupRef,
  onKeyDown,
  onButtonClick,
  buttonRef,
  fit = false,
  buttonClassName,
}: ChooserCapsuleProps) {
  const ownRef = useRef<HTMLDivElement>(null)
  const ref = rootRef ?? ownRef
  const [width, setWidth] = useState<number | null>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return
    // Fractional: a rounded width would shift a right-anchored capsule by a fraction of a pixel
    const observer = new ResizeObserver(() => setWidth(root.getBoundingClientRect().width))
    observer.observe(root)
    return () => observer.disconnect()
  }, [ref])

  const measured = width !== null
  // Sizes in px only while open; closed, the capsule and the button take the place of the button
  // (100%), so a late change of that place (a font loading) never leaves them a frame behind
  const geometry =
    open && measured ? chooserGeometry({ width, height: size, n: messengers.length, open }) : null
  const growth = geometry && width !== null ? geometry.width - width : 0

  useEffect(() => {
    if (!shiftNeighbours) return
    const row = ref.current?.closest<HTMLElement>('[data-chooser-shift]')
    if (!row) return
    row.style.setProperty('--chooser-shift', String(growth))
    row.toggleAttribute('data-chooser-open', growth > 0)
  }, [shiftNeighbours, growth, ref])

  const widthKey = fullWidth === 'mobile' ? 'mobile' : fullWidth ? 'full' : 'auto'

  const buttonClass = cn(
    // overflow-hidden: the wide label must not take the clicks of the cells next to «×»
    'relative h-full shrink-0 chooser-motion overflow-hidden rounded-full',
    geometry ? 'chooser-button' : 'w-full',
    TEXT[size],
    TONE[tone],
    buttonClassName,
  )
  const face = (
    <>
      <span
        className={cn(
          'pointer-events-none absolute inset-0 flex chooser-motion items-center justify-center gap-2.5 whitespace-nowrap group-data-open/chooser:opacity-0',
          fit && PAD[size],
        )}
      >
        {fit ? (
          // «…» only for a label longer than the place; while folding, the edge of the button
          // cuts it, as it cuts the label of the other contact buttons
          <span className="truncate group-data-open/chooser:shrink-0 group-data-open/chooser:overflow-visible">
            {caption}
          </span>
        ) : (
          caption
        )}
        {arrow && <span aria-hidden="true">→</span>}
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex scale-60 chooser-motion -rotate-90 items-center justify-center opacity-0 group-data-open/chooser:scale-100 group-data-open/chooser:rotate-0 group-data-open/chooser:opacity-100"
      >
        <span className="absolute h-0.5 w-4 rotate-45 rounded-full bg-on-accent" />
        <span className="absolute h-0.5 w-4 -rotate-45 rounded-full bg-on-accent" />
      </span>
    </>
  )

  return (
    <div
      ref={ref}
      data-open={open ? '' : undefined}
      onKeyDown={onKeyDown}
      className={cn(
        'group/chooser relative inline-flex shrink-0 chooser',
        WIDTH[widthKey],
        fit && 'max-w-full',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'invisible inline-flex items-center gap-2.5 whitespace-nowrap',
          BUTTON_SIZE[size],
          tone === 'outline' && 'border',
          fit && 'min-w-0 overflow-hidden',
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
                  className={cn(
                    'flex min-w-0 flex-1 scale-60 chooser-motion items-center justify-center rounded-full border border-border-strong text-text opacity-0 chooser-stagger group-data-open/chooser:scale-100 group-data-open/chooser:opacity-100 hover:border-accent hover:bg-surface',
                    !onButtonClick &&
                      'pointer-events-none group-data-open/chooser:pointer-events-auto',
                  )}
                >
                  <MessengerIcon kind={kind} className="size-5.5 shrink-0" />
                </Action>
              ))}
            </div>
          </>
        )}
        {onButtonClick ? (
          <button
            ref={buttonRef}
            type="button"
            aria-expanded={open}
            aria-label={open ? CHOOSER_CLOSE_LABEL : chooserLabel(caption)}
            onClick={onButtonClick}
            className={buttonClass}
          >
            {face}
          </button>
        ) : (
          <span aria-hidden="true" className={cn(buttonClass, 'pointer-events-none')}>
            {face}
          </span>
        )}
      </div>
    </div>
  )
}
