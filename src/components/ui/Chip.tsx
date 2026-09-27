import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

export type ChipVariant = 'surface' | 'surface-media' | 'glass' | 'accent' | 'outline' | 'frost'

// No single spec in README: values from the design references (see each line).
// Color and weight are set separately below so that `muted` / `strong` never conflict.
const VARIANT: Record<ChipVariant, string> = {
  // Values in «История» (home, about)
  surface: 'rounded-pill border border-border bg-surface px-3.5 py-2 text-body-xs',
  // Hero chips on «Дизайнерам», over video
  'surface-media':
    'rounded-pill border border-border-strong bg-surface/80 px-3.5 py-2 text-body-xs',
  // Date, catalog category, metro, «Новость» tag over media
  glass: 'rounded-thumb glass px-3 py-1.5 text-caption',
  // «Новинка» tag
  accent: 'rounded-thumb bg-accent px-3 py-1.5 text-caption',
  // Article meta: date, reading time
  outline: 'rounded-thumb border border-border-strong px-3 py-1.5 text-caption',
  // Project facts in the viewer
  frost: 'rounded-xl bg-text/12 px-2.5 py-1.25 text-caption backdrop-blur-glass',
}

const COLOR: Record<ChipVariant, string> = {
  surface: 'text-text',
  'surface-media': 'text-text',
  glass: 'text-text',
  accent: 'text-on-accent',
  outline: 'text-text-2',
  frost: 'text-text',
}

const BORDER: Partial<Record<ChipVariant, string>> = {
  glass: 'border border-border-strong',
  accent: 'border border-accent',
}

type Props = {
  variant?: ChipVariant
  /** Secondary text color (text-2), e.g. catalog category and the «Новость» tag. */
  muted?: boolean
  /** Bold text: news tags. */
  strong?: boolean
  /** Outline for tags next to outline chips (article header). */
  bordered?: boolean
  /** Leading icon, hidden from screen readers. */
  icon?: ReactNode
  children: ReactNode
  className?: string
}

/** Static chip / badge. Selectable filters use FilterChip. */
export function Chip({
  variant = 'surface',
  muted = false,
  strong = false,
  bordered = false,
  icon,
  children,
  className,
}: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 whitespace-nowrap',
        VARIANT[variant],
        muted ? 'text-text-2' : COLOR[variant],
        strong || variant === 'accent' ? 'font-bold' : 'font-semibold',
        bordered && BORDER[variant],
        className,
      )}
    >
      {icon && (
        <span aria-hidden="true" className="flex">
          {icon}
        </span>
      )}
      {children}
    </span>
  )
}
