import { ContactButton } from '@/components/ui/ContactButton'
import { HIT_AREA_Y } from '@/components/ui/hitArea'
import type { SiteChrome } from '@/lib/chrome'
import { cn } from '@/lib/cn'
import { BackLink } from './BackLink'
import { HeaderNav } from './HeaderNav'
import { HeaderShell } from './HeaderShell'
import { Logo } from './Logo'
import { MenuButton } from './MenuButton'

/**
 * Site header (README §5.2, §4). Mobile/tablet: ← / logo / ☰. Desktop: logo · sections · phone ·
 * CTA. Route-dependent parts (variant, «←», active section) are small client islands.
 */
export function AppHeader({ chrome }: { chrome: SiteChrome }) {
  const { phone, ctaLabel, messengers } = chrome
  const cta = Boolean(ctaLabel && messengers.length)

  return (
    <HeaderShell tallRow={cta}>
      <BackLink />
      <Logo />
      <HeaderNav items={chrome.nav} />
      {(phone || cta) && (
        // With the CTA the group is as high as its 44 button even before the button is parsed
        <div className={cn('hidden items-center gap-4 xl:flex', cta && 'min-h-11')}>
          {phone && (
            <a
              href={phone.href}
              className={`relative text-button whitespace-nowrap chooser-shifted hover:text-accent ${HIT_AREA_Y}`}
            >
              {phone.display}
            </a>
          )}
          {/* At the right margin: the open choice grows to the left */}
          <ContactButton
            caption={ctaLabel}
            messengers={messengers}
            size={44}
            grow="start"
            shiftNeighbours
          />
        </div>
      )}
      {/* Without sections there is nothing to open: an empty slot keeps the logo centred */}
      {chrome.nav.length > 0 ? (
        <MenuButton />
      ) : (
        <span aria-hidden="true" className="size-10 shrink-0 xl:hidden" />
      )}
    </HeaderShell>
  )
}
