import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { Action, type ActionProps } from './Action'
import { HIT_AREA_Y } from './hitArea'

export type ButtonVariant =
  'primary' | 'outline' | 'outline-media' | 'light' | 'inverse' | 'inverse-outline'

export type ButtonSize = 40 | 44 | 48 | 52 | 56

/** Classes of the variants and sizes, shared with the closed contact button (ContactChooser). */
export const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover',
  outline: 'border border-border-strong text-text hover:border-text',
  // Over photo/video (README §5.2)
  'outline-media': 'border border-text/25 text-text backdrop-blur-soft hover:border-text',
  light: 'bg-text text-on-accent',
  // On the accent CTA block of an article
  inverse: 'bg-bg text-text',
  'inverse-outline': 'border border-bg text-bg',
}

export const BUTTON_SIZE: Record<ButtonSize, string> = {
  // 40 < 44: the hit area is extended by ::before without changing the layout
  40: `h-10 px-4.5 text-button-s ${HIT_AREA_Y}`,
  44: 'h-11 px-4.5 text-button-s',
  48: 'h-12 px-4.5 text-button-s',
  52: 'h-13 px-8 text-button',
  56: 'h-14 px-8 text-button',
}

const WIDTH = {
  auto: '',
  full: 'w-full',
  // README §5.6: full width on mobile, by content from tablet
  'mobile-full': 'w-full md:w-auto',
} as const

export type ButtonProps = ActionProps & {
  variant?: ButtonVariant
  size?: ButtonSize
  width?: keyof typeof WIDTH
  /** Trailing «→» (primary CTA, README §5.6). */
  arrow?: boolean
  /** Leading icon, e.g. `<Download />` from lucide-react. Hidden from screen readers. */
  icon?: ReactNode
}

/** Pill button or link (README §5.6). */
export function Button({
  variant = 'primary',
  size = 52,
  width = 'auto',
  arrow = false,
  icon,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <Action
      {...props}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center gap-2.5 rounded-pill whitespace-nowrap transition-colors',
        'disabled:pointer-events-none disabled:border-transparent disabled:bg-surface-3 disabled:text-text-4',
        'aria-disabled:pointer-events-none aria-disabled:border-transparent aria-disabled:bg-surface-3 aria-disabled:text-text-4',
        BUTTON_VARIANT[variant],
        BUTTON_SIZE[size],
        WIDTH[width],
        className,
      )}
    >
      {icon && (
        <span aria-hidden="true" className="flex [&_svg]:size-4">
          {icon}
        </span>
      )}
      {children}
      {arrow && <span aria-hidden="true">→</span>}
    </Action>
  )
}
