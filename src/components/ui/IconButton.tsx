import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { Action, type ActionProps } from './Action'
import { HIT_AREA } from './hitArea'

export type IconButtonVariant =
  'surface' | 'glass' | 'ghost' | 'outline' | 'outline-media' | 'light'
export type IconButtonSize = 32 | 36 | 40 | 44 | 48 | 52 | 56

const VARIANT: Record<IconButtonVariant, string> = {
  surface: 'bg-surface-3 text-text hover:bg-border-strong',
  glass: 'glass text-text',
  // Dock «Наверх»: transparent, surface-3 on hover
  ghost: 'text-text hover:bg-surface-3',
  outline: 'border border-border-strong text-text hover:border-accent',
  // Over photo/video (README §5.2)
  'outline-media': 'border border-text/25 text-text backdrop-blur-soft hover:border-text',
  light: 'bg-text text-on-accent',
}

// Visual size below 44: ::before extends the hit area to 44 (README §9) without changing the layout.
const SIZE: Record<IconButtonSize, string> = {
  32: `size-8 ${HIT_AREA} [&_svg]:size-4`,
  36: `size-9 ${HIT_AREA} [&_svg]:size-4.5`,
  40: `size-10 ${HIT_AREA} [&_svg]:size-4.5`,
  44: 'size-11 [&_svg]:size-5',
  // Footer social buttons: 48 with a 22 logo (README §5.5)
  48: 'size-12 [&_svg]:size-5.5',
  // Home hero arrows on mobile, next to the 52 CTA (home README §1.2)
  52: 'size-13 [&_svg]:size-5',
  56: 'size-14 [&_svg]:size-5.5',
}

export type IconButtonProps = ActionProps & {
  /** Required: the button has no visible text. */
  'aria-label': string
  variant?: IconButtonVariant
  size?: IconButtonSize
  /** Icon, e.g. from lucide-react. Hidden from screen readers. */
  children: ReactNode
}

/** Round icon button or link (README §5.6, §9). */
export function IconButton({
  variant = 'surface',
  size = 40,
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <Action
      {...props}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-full transition-colors',
        'disabled:pointer-events-none disabled:text-text-4 aria-disabled:pointer-events-none aria-disabled:text-text-4',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
    >
      <span aria-hidden="true" className="flex">
        {children}
      </span>
    </Action>
  )
}
