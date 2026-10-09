import type { FocusEvent, RefObject } from 'react'

/**
 * Focus handlers for an element that never hides from under keyboard focus (the smart header,
 * the dock): `focusWithin` is true while keyboard focus is inside. Keyboard only: a tap or click
 * also focuses the button in most browsers, and the element would then stay on screen while
 * scrolling down. `onChange` re-evaluates the element's state.
 */
export function useKeyboardFocusWithin(focusWithin: RefObject<boolean>, onChange: () => void) {
  return {
    onFocus: (event: FocusEvent<HTMLElement>) => {
      focusWithin.current = event.target.matches(':focus-visible')
      onChange()
    },
    onBlur: (event: FocusEvent<HTMLElement>) => {
      if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
      focusWithin.current = false
      onChange()
    },
  }
}
