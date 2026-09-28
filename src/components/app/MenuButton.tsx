'use client'

import { usePathname } from 'next/navigation'

import { HIT_AREA } from '@/components/ui/hitArea'
import { isMenuOpen, MENU_ID, useMenu } from '@/hooks/useMenu'
import { cn } from '@/lib/cn'
import { isHeroRoute } from '@/lib/routes'
import { BurgerIcon } from './BurgerIcon'

/**
 * ☰ in the mobile/tablet header (README §5.2). While the menu is open the page, this button
 * included, is inert: the dialog has its own close button, and focus comes back here on close.
 */
export function MenuButton() {
  const { state, open, buttonRef } = useMenu()
  const hero = isHeroRoute(usePathname())
  const expanded = isMenuOpen(state)

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={open}
      aria-expanded={expanded}
      // Only while the dialog exists: it is not in the DOM when closed.
      aria-controls={expanded ? MENU_ID : undefined}
      // One name: while open this button is inert and the dialog's own button closes the menu
      aria-label="Открыть меню"
      className={cn(
        'relative flex size-10 shrink-0 items-center justify-center rounded-full border text-text transition-colors xl:hidden',
        HIT_AREA,
        // Over the hero like «←»: translucent border + blur; in the flow: border-strong
        hero
          ? 'border-text/25 backdrop-blur-soft hover:border-text'
          : 'border-border-strong hover:border-accent',
      )}
    >
      <BurgerIcon />
    </button>
  )
}
