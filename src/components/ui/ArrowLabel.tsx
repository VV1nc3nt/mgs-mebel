import { ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

/**
 * Text with «→» in a 28 circle (README §6.7): «Читать» of a news card, «Все» of «Ещё новости». Not
 * a link itself — it sits inside one.
 */
export function ArrowLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      {children}
      <span
        aria-hidden="true"
        className="flex size-7 items-center justify-center rounded-full bg-text/15 backdrop-blur-glass"
      >
        <ArrowRight className="size-3.5" />
      </span>
    </span>
  )
}
