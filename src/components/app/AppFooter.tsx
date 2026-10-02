import { Fragment } from 'react'

import { MessengerIcon } from '@/components/icons/MessengerIcon'
import { IconButton } from '@/components/ui/IconButton'
import { MESSENGER_NAMES, type SiteChrome } from '@/lib/chrome'

/** Footer order of the social buttons (design: <footer>). */
const SOCIALS = ['telegram', 'max', 'whatsapp'] as const

const currentYear = () =>
  new Intl.DateTimeFormat('ru-RU', { year: 'numeric', timeZone: 'Europe/Moscow' }).format(
    new Date(),
  )

/**
 * Site footer (README §5.5): slogan with an accent part · hotline · social buttons · copyright.
 * A column on mobile/tablet, three columns on desktop. The bottom padding leaves room for the dock.
 */
export function AppFooter({ chrome }: { chrome: SiteChrome }) {
  const { footer, phone, messengers } = chrome
  const socials = SOCIALS.flatMap((kind) => {
    const href = messengers[kind]
    return href ? [{ kind, href }] : []
  })

  return (
    <footer className="mt-section flex flex-col gap-6 rounded-t-footer bg-surface-2 px-gutter pt-10 pb-dock-clearance md:px-gutter-md xl:px-gutter-xl xl:pt-section-xl">
      <div className="flex flex-col items-start gap-6 xl:grid xl:grid-cols-3">
        {(footer.sloganText || footer.sloganAccent) && (
          <p className="text-slogan text-balance">
            {footer.sloganText?.split(/\r?\n/).map((line, i) => (
              <Fragment key={i}>
                {i > 0 && <br />}
                {line}
              </Fragment>
            ))}
            {footer.sloganText && footer.sloganAccent && ' '}
            {footer.sloganAccent && <span className="text-accent">{footer.sloganAccent}</span>}
          </p>
        )}
        {phone && (
          <div className="flex flex-col gap-1">
            <a href={phone.href} className="text-phone transition-colors hover:text-accent">
              {phone.display}
            </a>
            {footer.hotlineLabel && (
              <p className="text-body-xs text-text-4">{footer.hotlineLabel}</p>
            )}
          </div>
        )}
        {socials.length > 0 && (
          <ul className="flex gap-2.5">
            {socials.map(({ kind, href }) => (
              <li key={kind} className="flex">
                <IconButton href={href} size={48} aria-label={MESSENGER_NAMES[kind]}>
                  <MessengerIcon kind={kind} />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </div>
      {footer.copyright && (
        <p className="border-t border-border pt-5 text-caption font-normal text-text-4">
          © {currentYear()} {footer.copyright}
        </p>
      )}
    </footer>
  )
}
