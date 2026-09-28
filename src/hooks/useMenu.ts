import { createContext, useContext, type RefObject } from 'react'

/** id of the menu dialog, referenced by the header menu button while the menu is open. */
export const MENU_ID = 'app-menu'

/**
 * closed → opening → open → closing → closed. The dialog is mounted in every state but `closed`.
 * `opening` and `closing` last until the overlay transition ends.
 */
export type MenuState = 'closed' | 'opening' | 'open' | 'closing'

/**
 * Why the menu closes. `dismiss`: Esc, ×, a link to the current page — the page stays, so the
 * scroll position and focus on the menu button come back. `navigate`: a link to another page —
 * Next scrolls the new page and moves focus. `reset`: desktop width, no animation.
 */
export type CloseReason = 'dismiss' | 'navigate' | 'reset'

export type MenuModel = { state: MenuState; reason: CloseReason | null }

export type MenuAction =
  | { type: 'open' }
  | { type: 'opened' }
  | { type: 'close'; reason: Exclude<CloseReason, 'reset'> }
  | { type: 'closed' }
  | { type: 'reset' }

export const initialMenu: MenuModel = { state: 'closed', reason: null }

/** Repeated clicks and Esc mid-animation are no-ops or clean reversals, never a stuck state. */
export function menuReducer(model: MenuModel, action: MenuAction): MenuModel {
  switch (action.type) {
    case 'open':
      return model.state === 'closed' || model.state === 'closing'
        ? { state: 'opening', reason: null }
        : model
    case 'opened':
      return model.state === 'opening' ? { ...model, state: 'open' } : model
    case 'close':
      return model.state === 'opening' || model.state === 'open'
        ? { state: 'closing', reason: action.reason }
        : model
    case 'closed':
      return model.state === 'closing' ? { ...model, state: 'closed' } : model
    case 'reset':
      return model.state === 'closed' ? model : { state: 'closed', reason: 'reset' }
  }
}

export const isMenuOpen = (state: MenuState) => state === 'opening' || state === 'open'

/** Longest transition (duration + delay) of an element, from its computed style, in ms. */
export function transitionTime(element: Element): number {
  const style = getComputedStyle(element)
  const ms = (list: string) =>
    list
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => (value.endsWith('ms') ? parseFloat(value) : parseFloat(value) * 1000) || 0)
  const durations = ms(style.transitionDuration)
  const delays = ms(style.transitionDelay)
  return durations.reduce(
    (max, duration, i) => Math.max(max, duration + (delays[i % delays.length] ?? 0)),
    0,
  )
}

export type MenuContextValue = {
  state: MenuState
  open: () => void
  close: (reason: Exclude<CloseReason, 'reset'>) => void
  /** The overlay reports the end of its opening / closing transition. */
  settle: () => void
  /** Header menu button: focus comes back here after the menu closes. */
  buttonRef: RefObject<HTMLButtonElement | null>
}

export const MenuContext = createContext<MenuContextValue | null>(null)

export function useMenu(): MenuContextValue {
  const value = useContext(MenuContext)
  if (!value) throw new Error('useMenu: no MenuProvider')
  return value
}
