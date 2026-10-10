import { useSyncExternalStore } from 'react'

const QUERY = '(hover: hover) and (pointer: fine)'

const subscribe = (onChange: () => void) => {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

/**
 * A mouse or a trackpad (`(hover: hover) and (pointer: fine)`): hover effects and hover playback
 * only there. On the server and during hydration it is `null` (not known yet), then the real value.
 */
export function useHoverCapable(): boolean | null {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => null,
  )
}
