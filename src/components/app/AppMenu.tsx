'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'

import { MessengerIcon } from '@/components/icons/MessengerIcon'
import { Action } from '@/components/ui/Action'
import { HIT_AREA } from '@/components/ui/hitArea'
import { isMenuOpen, MENU_ID, transitionTime, useMenu } from '@/hooks/useMenu'
import { useRoutePath } from '@/hooks/useRoutePath'
import { MESSENGER_NAMES, type SiteChrome } from '@/lib/chrome'
import { cn } from '@/lib/cn'
import { cssVars } from '@/lib/cssVars'
import { isActive } from '@/lib/routes'
import { BurgerIcon } from './BurgerIcon'
import { Logo } from './Logo'

const FOCUSABLE = 'a[href], button:not([disabled])'

export type MenuChrome = Pick<SiteChrome, 'nav' | 'phone' | 'messengers' | 'menu'>

/** Full-screen menu for mobile and tablet (README §5.3). Mounted only while it is not closed. */
export function AppMenu({ chrome }: { chrome: MenuChrome }) {
  const { state } = useMenu()
  if (state === 'closed' || !chrome.nav.length) return null
  return <MenuDialog chrome={chrome} />
}

function MenuDialog({ chrome }: { chrome: MenuChrome }) {
  const { state, close, settle } = useMenu()
  const pathname = useRoutePath()
  const circleRef = useRef<HTMLDivElement>(null)
  const firstItemRef = useRef<HTMLAnchorElement>(null)
  const [shown, setShown] = useState(false)

  // Mount: the closed styles are computed first, so opening transitions from them.
  useEffect(() => {
    circleRef.current?.getBoundingClientRect()
    firstItemRef.current?.focus({ preventScroll: true })
  }, [])

  // Both directions switch styles in the next frame: the work of the state change (inert,
  // focus, scroll lock) never shares a frame with the start of the animation.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(isMenuOpen(state)))
    return () => cancelAnimationFrame(frame)
  }, [state])

  // End of opening / closing: the background circle's transitionend, or its computed duration as
  // a fallback.
  useEffect(() => {
    const circle = circleRef.current
    if (!circle || !((state === 'closing' && !shown) || (state === 'opening' && shown))) return
    const onEnd = (event: TransitionEvent) => event.target === circle && settle()
    circle.addEventListener('transitionend', onEnd)
    const timer = window.setTimeout(settle, transitionTime(circle) + 50)
    return () => {
      circle.removeEventListener('transitionend', onEnd)
      window.clearTimeout(timer)
    }
  }, [state, shown, settle])

  useEffect(() => {
    if (!isMenuOpen(state)) return
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') close('dismiss')
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [state, close])

  /** Tab and Shift+Tab cycle inside the dialog. */
  const trapFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return
    const items = [...event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)]
    const first = items[0]
    const last = items[items.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }

  /** A link to the current page only closes the menu; any other link closes and navigates. */
  const onLinkClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return
    }
    if (href === pathname) {
      event.preventDefault()
      close('dismiss')
    } else {
      close('navigate')
    }
  }

  const { phone, menu, messengers } = chrome

  return (
    <div
      id={MENU_ID}
      role="dialog"
      aria-modal="true"
      aria-label="Меню"
      data-shown={shown ? '' : undefined}
      // will-change only while something moves (globals.css), dropped once the menu is still
      data-animating={state === 'opening' || state === 'closing' ? '' : undefined}
      inert={state === 'closing'}
      onKeyDown={trapFocus}
      style={cssVars({ '--n': chrome.nav.length })}
      className="menu-dialog fixed inset-0 z-menu"
    >
      <div className="absolute inset-x-0 top-0 z-menu-header flex items-center justify-between gap-6 px-gutter py-5 menu-header md:px-gutter-md">
        <span aria-hidden="true" className="size-10 shrink-0" />
        <Logo onClick={(event) => onLinkClick(event, '/')} />
        <button
          type="button"
          onClick={() => close('dismiss')}
          aria-label="Закрыть меню"
          // No backdrop blur: the button lies over the animating overlay, so the blur would be
          // recomputed every frame, and it is opaque (surface) while the menu is open.
          className={cn(
            'relative flex size-10 shrink-0 items-center justify-center rounded-full',
            HIT_AREA,
          )}
        >
          {/* Colours change by crossfading two rings: opacity runs on the compositor, a colour
              transition would repaint the button in every frame of the menu animation. */}
          <span
            aria-hidden="true"
            className={cn(
              'absolute inset-0 rounded-full border border-text/25 transition-opacity duration-(--motion-menu-hover)',
              shown && 'opacity-0',
            )}
          />
          <span
            aria-hidden="true"
            className={cn(
              'absolute inset-0 rounded-full border border-border-strong bg-surface transition-opacity duration-(--motion-menu-hover)',
              !shown && 'opacity-0',
            )}
          />
          <BurgerIcon crossed={shown} />
        </button>
      </div>

      <div
        ref={circleRef}
        aria-hidden="true"
        className="pointer-events-none absolute menu-circle"
      />

      <div className="absolute inset-0 flex flex-col overflow-y-auto overscroll-contain menu-overlay">
        <nav
          aria-label="Разделы сайта"
          className="relative px-gutter pt-28 md:max-w-menu md:px-gutter-md md:pt-35"
        >
          <ul>
            {chrome.nav.map((item, i) => {
              const active = isActive(pathname, item.href)
              return (
                <li key={item.key} className="relative menu-item" style={cssVars({ '--i': i })}>
                  <Link
                    ref={i === 0 ? firstItemRef : undefined}
                    href={item.href}
                    onClick={(event) => onLinkClick(event, item.href)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group/item flex h-16 items-center gap-3.5 md:h-22',
                      active ? 'text-accent' : 'text-text',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'w-5.5 shrink-0 text-caption-s tracking-[0.04em] transition-colors duration-200',
                        active ? 'text-accent' : 'text-text-5 group-hover/item:text-accent',
                      )}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="flex-1 text-menu transition-transform duration-(--motion-menu-hover) ease-soft group-hover/item:translate-x-1.5 md:text-menu-md">
                      {item.label}
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-full text-body-s transition-all duration-(--motion-menu-hover) ease-soft',
                        active
                          ? 'bg-accent text-on-accent'
                          : '-translate-x-1.5 -rotate-45 text-text-5 group-hover/item:translate-x-0 group-hover/item:rotate-0 group-hover/item:bg-text group-hover/item:text-on-accent',
                      )}
                    >
                      →
                    </span>
                  </Link>
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-px menu-line bg-surface-3"
                  />
                </li>
              )
            })}
          </ul>
        </nav>

        {(phone || messengers.length > 0) && (
          // Padding on a still wrapper: the moving block stays inside the scroller's content box,
          // so the scroll area is not recomputed and repainted in every frame
          <div className="relative mt-auto px-gutter pb-menu-foot md:max-w-menu md:px-gutter-md">
            <div className="flex menu-foot flex-col gap-4.5">
              {phone && (
                <a href={phone.href} className="group/phone flex flex-col gap-1 self-start">
                  {menu.hotlineLabel && (
                    <span className="text-caption font-normal text-text-4">
                      {menu.hotlineLabel}
                    </span>
                  )}
                  <span className="text-phone-lg transition-colors group-hover/phone:text-accent">
                    {phone.display}
                  </span>
                </a>
              )}
              {messengers.length > 0 && (
                <div className="flex flex-col gap-2.5">
                  {menu.messengersLabel && (
                    <p className="text-body-xs font-semibold text-text-2">{menu.messengersLabel}</p>
                  )}
                  <ul className="grid grid-cols-3 gap-2">
                    {messengers.map(({ kind, href }) => (
                      <li key={kind} className="flex">
                        <Action
                          href={href}
                          aria-label={MESSENGER_NAMES[kind]}
                          className="flex h-14 flex-1 items-center justify-center rounded-pill border border-border-strong text-text transition-colors hover:border-accent hover:bg-surface"
                        >
                          <MessengerIcon kind={kind} className="size-6" />
                        </Action>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
