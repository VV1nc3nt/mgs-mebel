import {
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'

import { closeChooser, getActiveChooser, openChooser, subscribeChooser } from '@/lib/chooser'

const NAV_KEYS = ['ArrowLeft', 'ArrowRight', 'Home', 'End']

/**
 * A messenger choice opened in place by its button (the dock, contact buttons). Open state comes
 * from the shared store, so only one choice is open on the page. Here: Esc and a click outside
 * close it; ←/→, Home/End move between the links and the button; focus goes to the first link
 * only when the choice is opened from the keyboard, back to the button when it is closed from
 * the keyboard. A click with `detail === 0` is Enter or Space.
 */
export function useChooser() {
  const id = useId()
  const open = useSyncExternalStore(
    subscribeChooser,
    () => getActiveChooser() === id,
    () => false,
  )
  const rootRef = useRef<HTMLDivElement>(null)
  const groupRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const focusFirst = useRef(false)

  const focusButton = () => buttonRef.current?.focus({ preventScroll: true })

  // The links lose `inert` in this commit; focus waits for the next frame, so it does not share
  // a frame with the start of the animation.
  useEffect(() => {
    if (!open || !focusFirst.current) return
    focusFirst.current = false
    const frame = requestAnimationFrame(() =>
      groupRef.current?.querySelector('a')?.focus({ preventScroll: true }),
    )
    return () => cancelAnimationFrame(frame)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      closeChooser(id)
      focusButton()
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node | null)) closeChooser(id)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open, id])

  // Closed from outside (a scroll, the menu, another choice) with focus on a link: the link turns
  // inert, so focus would fall to <body>.
  useEffect(() => {
    if (!open && groupRef.current?.contains(document.activeElement)) focusButton()
  }, [open])

  useEffect(() => () => closeChooser(id), [id])

  /** The button opens and closes; closing keeps focus on it, it is the same element. */
  const onButtonClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (open) {
      closeChooser(id)
      return
    }
    focusFirst.current = event.detail === 0
    openChooser(id)
  }

  /** A link was chosen: it opens in a new tab, the choice closes. */
  const onPick = (event: MouseEvent<HTMLAnchorElement>) => {
    closeChooser(id)
    if (event.detail === 0) focusButton()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!open || !NAV_KEYS.includes(event.key)) return
    const items = [
      ...(groupRef.current?.querySelectorAll<HTMLElement>('a') ?? []),
      ...(buttonRef.current ? [buttonRef.current] : []),
    ]
    const i = items.indexOf(document.activeElement as HTMLElement)
    if (i < 0) return
    event.preventDefault()
    const last = items.length - 1
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? last
          : (i + (event.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length
    items[next]?.focus()
  }

  return { open, rootRef, groupRef, buttonRef, onButtonClick, onPick, onKeyDown }
}
