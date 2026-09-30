'use client'

import type { ReactNode } from 'react'

import { useRoutePath } from '@/hooks/useRoutePath'
import { cn } from '@/lib/cn'
import { isHeroRoute } from '@/lib/routes'

/**
 * <header> of every page. Over a hero it is absolute on top of the video (README §5.2), elsewhere
 * it takes its place in the flow. The pathname is known during SSR, so the HTML already has the
 * right variant and nothing shifts on hydration.
 */
export function HeaderShell({ children }: { children: ReactNode }) {
  const hero = isHeroRoute(useRoutePath())
  return (
    <header
      data-variant={hero ? 'hero' : 'flow'}
      className={cn(
        'flex items-center justify-between gap-6 px-gutter py-5 md:px-gutter-md xl:px-gutter-xl',
        hero && 'absolute inset-x-0 top-0 z-header',
      )}
    >
      {children}
    </header>
  )
}
