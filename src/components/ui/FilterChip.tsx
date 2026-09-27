import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { Action, type ActionLinkProps, type ActionButtonProps } from './Action'
import { HIT_AREA_Y } from './hitArea'

type Common = {
  selected: boolean
  /** Result count after the label, e.g. on the news tabs. */
  count?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * With `href`: a link (aria-current when selected). Without: a toggle button (aria-pressed);
 * click handlers come from the client component that renders it (e.g. NewsTabs).
 */
export type FilterChipProps = Common &
  (Omit<ActionLinkProps, keyof Common> | Omit<ActionButtonProps, keyof Common>)

/**
 * Selectable pill 40 (README §5.7 news tabs; home «Наши работы» chips).
 * Presentational: no handlers of its own, no 'use client'.
 */
export function FilterChip({ selected, count, children, className, ...props }: FilterChipProps) {
  const state =
    props.href === undefined
      ? { 'aria-pressed': selected }
      : { 'aria-current': selected ? ('page' as const) : undefined }

  return (
    <Action
      {...props}
      {...state}
      className={cn(
        // 40 < 44: ::before extends the hit area vertically
        'relative inline-flex h-10 shrink-0 items-center gap-2 rounded-pill px-4.5 text-button-s whitespace-nowrap transition-colors',
        HIT_AREA_Y,
        selected
          ? 'bg-accent text-on-accent'
          : 'border border-border-strong font-semibold text-text-2 hover:border-text hover:text-text',
        className,
      )}
    >
      {children}
      {count !== undefined && (
        <>
          {/* Space text node: «все 7» in the accessible name; not rendered in the flex row */}{' '}
          <span className={cn('text-caption', selected ? 'opacity-60' : 'text-text-4')}>
            {count}
          </span>
        </>
      )}
    </Action>
  )
}
