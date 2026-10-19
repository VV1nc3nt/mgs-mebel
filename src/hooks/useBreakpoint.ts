import { useSyncExternalStore } from 'react'

import { BREAKPOINTS } from '@/lib/media'

export type Breakpoint = 'base' | 'md' | 'xl'

const MD = `(min-width: ${BREAKPOINTS.md}px)`
const XL = `(min-width: ${BREAKPOINTS.xl}px)`

const subscribe = (onChange: () => void) => {
  const queries = [window.matchMedia(MD), window.matchMedia(XL)]
  queries.forEach((mql) => mql.addEventListener('change', onChange))
  return () => queries.forEach((mql) => mql.removeEventListener('change', onChange))
}

const current = (): Breakpoint =>
  window.matchMedia(XL).matches ? 'xl' : window.matchMedia(MD).matches ? 'md' : 'base'

/**
 * The breakpoint of the window: `base`, `md` (768) or `xl` (1280). Changes only when a breakpoint
 * is crossed, not on every resize. On the server and during hydration it is `base`, then the real
 * value — without a hydration mismatch.
 */
export function useBreakpoint(): Breakpoint {
  return useSyncExternalStore(subscribe, current, () => 'base')
}
