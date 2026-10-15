/**
 * Whether a full-screen overlay covers the page (menu now, project viewer later). A module store,
 * not React state: background videos pause under an overlay without re-rendering anything.
 */
export type OverlayKey = 'menu' | 'viewer'

const open = new Set<OverlayKey>()
const listeners = new Set<() => void>()

export const isOverlayOpen = (): boolean => open.size > 0

/** This overlay is open. */
export const isOverlay = (key: OverlayKey): boolean => open.has(key)

export function setOverlay(key: OverlayKey, value: boolean): void {
  const before = isOverlayOpen()
  if (value) open.add(key)
  else open.delete(key)
  // For styles and tests: which overlays cover the page
  if (typeof document !== 'undefined') {
    const html = document.documentElement
    if (open.size) html.dataset.overlay = [...open].join(' ')
    else delete html.dataset.overlay
  }
  if (isOverlayOpen() !== before) for (const listener of listeners) listener()
}

/** Called when the page goes from free to covered and back. Returns the unsubscribe function. */
export function subscribeOverlay(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
