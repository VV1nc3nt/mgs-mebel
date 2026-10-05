'use client'

import { usePathname } from 'next/navigation'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react'

import {
  initialMenu,
  isMenuOpen,
  MenuContext,
  menuReducer,
  useMenu,
  type CloseReason,
} from '@/hooks/useMenu'
import { useScrollLock } from '@/hooks/useScrollLock'
import { DESKTOP_QUERY } from '@/lib/breakpoints'
import { closeChooser } from '@/lib/chooser'
import { setOverlay } from '@/lib/overlay'

/** Menu state for the header button, the page wrapper and the dialog. */
export function MenuProvider({ children }: { children: ReactNode }) {
  const [model, dispatch] = useReducer(menuReducer, initialMenu)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { lock, unlock } = useScrollLock()
  const pathname = usePathname()
  const lastPathname = useRef(pathname)

  const open = useCallback(() => dispatch({ type: 'open' }), [])
  const close = useCallback(
    (reason: Exclude<CloseReason, 'reset'>) => dispatch({ type: 'close', reason }),
    [],
  )
  // Whichever applies: `opened` ends opening, `closed` ends closing; the other is a no-op.
  const settle = useCallback(() => {
    dispatch({ type: 'opened' })
    dispatch({ type: 'closed' })
  }, [])

  // Runs after the commit that removed `inert` from the page: the button can take focus.
  // The start of closing does only that; the page stays fixed under the overlay (already in
  // place thanks to `top: -y`) and is released in one go once the animation has ended.
  useLayoutEffect(() => {
    if (isMenuOpen(model.state)) {
      lock()
    } else if (model.state === 'closing') {
      if (model.reason === 'dismiss') buttonRef.current?.focus({ preventScroll: true })
      // Leaving for another page: Next scrolls it, the old position must not come back.
      if (model.reason === 'navigate') unlock({ restore: false })
    } else {
      unlock({ restore: model.reason !== 'navigate' })
    }
  }, [model.state, model.reason, lock, unlock])

  // The menu closes any open messenger choice (dock, contact buttons).
  useEffect(() => {
    if (isMenuOpen(model.state)) closeChooser()
  }, [model.state])

  // Background videos pause from the start of opening until closing has fully ended.
  useEffect(() => {
    setOverlay('menu', model.state !== 'closed')
  }, [model.state])
  useEffect(() => () => setOverlay('menu', false), [])

  // Back/forward or any other route change closes the menu.
  useEffect(() => {
    if (lastPathname.current === pathname) return
    lastPathname.current = pathname
    dispatch({ type: 'close', reason: 'navigate' })
  }, [pathname])

  useEffect(() => {
    // The menu is mobile/tablet only (README §4): it closes as soon as the viewport is desktop.
    const desktop = window.matchMedia(DESKTOP_QUERY)
    const onChange = () => desktop.matches && dispatch({ type: 'reset' })
    desktop.addEventListener('change', onChange)
    return () => desktop.removeEventListener('change', onChange)
  }, [])

  const value = useMemo(
    () => ({ state: model.state, open, close, settle, buttonRef }),
    [model.state, open, close, settle],
  )
  return <MenuContext value={value}>{children}</MenuContext>
}

/** Everything but the menu: inert while the menu is open (header, main, footer, dock). */
export function PageRoot({ children }: { children: ReactNode }) {
  const { state } = useMenu()
  return <div inert={isMenuOpen(state)}>{children}</div>
}
