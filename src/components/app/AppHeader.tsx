import { Button } from '@/components/ui/Button'
import { HIT_AREA_Y } from '@/components/ui/hitArea'
import { contactLabel, type SiteChrome } from '@/lib/chrome'
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
  const { phone, ctaLabel, contactAction } = chrome
  const cta = ctaLabel && contactAction ? { label: ctaLabel, action: contactAction } : undefined

  return (
    <HeaderShell>
      <BackLink />
      <Logo />
      <HeaderNav items={chrome.nav} />
      {(phone || cta) && (
        <div className="hidden items-center gap-4 xl:flex">
          {phone && (
            <a
              href={phone.href}
              className={`relative text-button whitespace-nowrap transition-colors hover:text-accent ${HIT_AREA_Y}`}
            >
              {phone.display}
            </a>
          )}
          {cta && (
            <Button
              href={cta.action.href}
              size={44}
              aria-label={contactLabel(cta.label, cta.action)}
            >
              {cta.label}
            </Button>
          )}
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
