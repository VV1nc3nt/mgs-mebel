import { subscribePageScroll } from '@/hooks/usePageScroll'
import { DIRECTION_THRESHOLD } from './scrollDirection'

/*
 * The open messenger choice (dock or a contact button): at most one on the page. A module store,
 * like lib/overlay.ts: opening one closes the other, the menu closes any. The rules that apply to
 * every choice live here: a page scroll of more than 6px or a change of the window width closes
 * it. Esc and a click outside belong to the element (hooks/useChooser.ts).
 */
let active: string | null = null
let stopWatching: (() => void) | null = null
const listeners = new Set<() => void>()

const emit = () => {
  for (const listener of listeners) listener()
}

/** Watches the page while a choice is open: the shared page scroll and the window width. */
function watch(): () => void {
  let openY: number | null = null
  // Not a new scroll listener: one more callback of the shared one (hooks/usePageScroll.ts)
  const unsubscribe = subscribePageScroll(({ y }) => {
    openY ??= y
    if (Math.abs(y - openY) > DIRECTION_THRESHOLD) closeChooser()
  })
  // Width only: iOS Safari changes the height when its toolbar shows up, e.g. after a tap next
  // to the bottom edge, where the dock is.
  const width = window.innerWidth
  const onResize = () => {
    if (window.innerWidth !== width) closeChooser()
  }
  window.addEventListener('resize', onResize, { passive: true })
  return () => {
    unsubscribe()
    window.removeEventListener('resize', onResize)
  }
}

export const getActiveChooser = (): string | null => active

/** Opens the choice `id`; any other one closes. */
export function openChooser(id: string): void {
  if (active === id) return
  active = id
  stopWatching ??= watch()
  emit()
}

/** Closes the choice `id`, or whichever is open without an id (the menu). */
export function closeChooser(id?: string): void {
  if (active === null || (id !== undefined && active !== id)) return
  active = null
  stopWatching?.()
  stopWatching = null
  emit()
}

export function subscribeChooser(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
