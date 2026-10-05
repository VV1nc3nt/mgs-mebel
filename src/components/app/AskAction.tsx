import { useEffect, useRef, type MouseEvent, type Ref } from 'react'

import { Action } from '@/components/ui/Action'
import {
  CHOOSER_CLOSE_LABEL,
  contactLinkLabel,
  dockChooserLabel,
  type Messenger,
} from '@/lib/chrome'
import { cn } from '@/lib/cn'

type Props = {
  label: string
  messengers: Messenger[]
  open?: boolean
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void
  ref?: Ref<HTMLButtonElement>
}

/** Lime circle with three dots; turns into «×» while the choice is open (README of the dock §3). */
function AskIcon() {
  return (
    <span aria-hidden="true" className="relative size-8 shrink-0">
      <span className="absolute inset-0 flex chooser-motion items-center justify-center gap-0.75 rounded-full bg-on-accent group-data-open/chooser:scale-60 group-data-open/chooser:rotate-90 group-data-open/chooser:opacity-0">
        <span className="size-1 rounded-full bg-accent" />
        <span className="size-1 rounded-full bg-accent" />
        <span className="size-1 rounded-full bg-accent" />
      </span>
      <span className="absolute inset-0 flex scale-60 chooser-motion -rotate-90 items-center justify-center opacity-0 group-data-open/chooser:scale-100 group-data-open/chooser:rotate-0 group-data-open/chooser:opacity-100">
        <span className="absolute h-0.5 w-4 rotate-45 rounded-full bg-on-accent" />
        <span className="absolute h-0.5 w-4 -rotate-45 rounded-full bg-on-accent" />
      </span>
    </span>
  )
}

/** «Спросить» that folds while the choice is open: from its measured width to 0. */
function FoldingLabel({ children }: { children: string }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const label = ref.current
    const text = label?.firstElementChild as HTMLElement | null
    if (!label || !text) return
    const observer = new ResizeObserver(() =>
      label.style.setProperty('--label-w', String(text.offsetWidth)),
    )
    observer.observe(text)
    return () => observer.disconnect()
  }, [])

  return (
    <span
      ref={ref}
      className="block chooser-label chooser-motion overflow-hidden group-data-open/chooser:opacity-0"
    >
      <span className="inline-block pl-2.5 whitespace-nowrap">{children}</span>
    </span>
  )
}

const PILL =
  'flex h-11 shrink-0 items-center rounded-pill bg-accent pr-4.5 pl-1.5 text-button-s text-on-accent hover:bg-accent-hover'

/**
 * «Спросить» (README of the dock §2, §5): one messenger — a link to it; two or three — the button
 * of the choice (the dock lays out the logos). Without messengers the dock has no button.
 */
export function AskAction({ label, messengers, open = false, onClick, ref }: Props) {
  const [only] = messengers
  if (!only) return null

  if (messengers.length === 1) {
    return (
      <Action
        href={only.href}
        aria-label={contactLinkLabel(label, only)}
        className={cn(PILL, 'gap-2.5')}
      >
        <AskIcon />
        {label}
      </Action>
    )
  }

  return (
    <button
      ref={ref}
      type="button"
      aria-expanded={open}
      aria-label={open ? CHOOSER_CLOSE_LABEL : dockChooserLabel(label)}
      onClick={onClick}
      className={cn(PILL, 'chooser-motion group-data-open/chooser:pr-1.5')}
    >
      <AskIcon />
      <FoldingLabel>{label}</FoldingLabel>
    </button>
  )
}
