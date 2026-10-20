import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { Action, type ActionLinkProps, type ActionButtonProps } from './Action'
import { HIT_AREA_Y } from './hitArea'

type Common = {
  selected: boolean
  /** Result count after the label, e.g. on the news tabs. */
  count?: ReactNode
  /**
   * 40 — outline when off (news tabs, home chips); 44 — surface when off and no hit-area
   * extension (works page feeds, design: works v2 §2.2).
   */
  size?: 40 | 44
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
export function FilterChip({
  selected,
  count,
  size = 40,
  children,
  className,
  ...props
}: FilterChipProps) {
  const state =
    props.href === undefined
      ? { 'aria-pressed': selected }
      : { 'aria-current': selected ? ('page' as const) : undefined }

  return (
    <Action
      {...props}
      {...state}
      className={cn(
        size === 40
          ? 'relative inline-flex h-10 shrink-0 items-center gap-2 rounded-pill px-4.5 text-button-s whitespace-nowrap transition-colors'
          : 'relative inline-flex h-11 shrink-0 items-center gap-1.5 rounded-pill px-4.5 text-button-s whitespace-nowrap transition-colors',
        // 40 < 44: ::before extends the hit area vertically
        size === 40 && HIT_AREA_Y,
        selected
          ? 'bg-accent text-on-accent'
          : size === 40
            ? 'border border-border-strong font-semibold text-text-2 hover:border-text hover:text-text'
            : 'border border-border bg-surface font-semibold text-text hover:bg-surface-3',
        className,
      )}
    >
      {children}
      {count !== undefined && (
        <>
          {/* Space text node: «все 7» in the accessible name; not rendered in the flex row */}{' '}
          {/* Muted on the accent: 80 % keeps the contrast ≥ 4.5 (design: 60 %, 3.5) */}
          <span className={cn('text-caption', selected ? 'text-on-accent/80' : 'text-text-4')}>
            {count}
          </span>
        </>
      )}
    </Action>
  )
}
