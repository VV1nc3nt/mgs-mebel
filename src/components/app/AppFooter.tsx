import Link from 'next/link'
import { Fragment } from 'react'

import { CookieSettingsButton } from '@/components/cookies/CookieSettingsButton'
import { ContactButton } from '@/components/ui/ContactButton'
import { HIT_AREA_Y } from '@/components/ui/hitArea'
import { cn } from '@/lib/cn'
import type { FooterData } from '@/lib/footer'
import { FooterAccordion, type FooterSection } from './FooterAccordion'
import { FOOTER_TITLE } from './footerStyles'
import { LogoMark } from './Logo'

const currentYear = () =>
  new Intl.DateTimeFormat('ru-RU', { year: 'numeric', timeZone: 'Europe/Moscow' }).format(
    new Date(),
  )

const COLUMN_LIST = 'flex flex-col'
const COLUMN_LINK =
  'relative flex min-h-hit items-center py-2.5 text-body font-semibold text-text-2 transition-colors hover:text-text md:py-0'
const BOTTOM_LINK = cn(
  'relative inline-flex min-h-hit items-center py-2.5 text-caption text-text-2 transition-colors hover:text-text md:py-0',
  HIT_AREA_Y,
)

/** Text with line breaks of the CMS. */
const lines = (value: string) =>
  value.split(/\r?\n/).map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {line}
    </Fragment>
  ))

/** Four columns from 1280, two rows from 768, brand / accordions / contacts below it. */
export function AppFooter({
  footer,
  cookieSettings,
}: {
  footer: FooterData
  /** «Настройки cookies»: only with the notice (its texts are filled in). */
  cookieSettings: boolean
}) {
  const { slogan, contacts, contact, columns, legal, links } = footer
  const year = currentYear()

  const sections: FooterSection[] = []
  if (columns.menu) {
    sections.push({
      key: 'menu',
      title: columns.menu.title,
      content: (
        <ul className={COLUMN_LIST}>
          {columns.menu.items.map(({ key, href, label }) => (
            <li key={key}>
              <Link href={href} className={COLUMN_LINK}>
                {label}
              </Link>
            </li>
          ))}
        </ul>
      ),
    })
  }
  if (columns.salons) {
    sections.push({
      key: 'salons',
      title: columns.salons.title,
      content: (
        <ul className={cn(COLUMN_LIST, 'md:gap-3.5')}>
          {columns.salons.items.map(({ name, address }, i) => (
            <li key={i}>
              <Link
                href="/salons"
                className="group flex min-h-hit flex-col gap-0.5 py-2.5 md:py-0"
                prefetch={false}
              >
                <span className="text-body font-bold text-text transition-colors group-hover:text-accent">
                  {name}
                </span>
                {address && <span className="text-body-xs text-text-4">{address}</span>}
              </Link>
            </li>
          ))}
        </ul>
      ),
    })
  }

  const hasContacts = Boolean(
    contacts.phone || contacts.hotlineLabel || contacts.hours || contacts.email || contact,
  )
  const owner = legal.owner && `© ${year} ${legal.owner}`
  const hasLegal = Boolean(owner || legal.ids.length || legal.address)
  const hasBottom = hasLegal || links.length > 0 || cookieSettings

  return (
    <footer className="mt-section rounded-t-footer bg-surface-2 pt-8 pb-dock-clearance md:pt-12 xl:pt-16 xl:pb-10">
      <div className="page-container flex flex-col gap-7 md:gap-10">
        <div className="flex flex-col gap-7 md:grid md:grid-footer md:gap-10">
          <div className="flex min-w-0 flex-col items-start gap-5 md:gap-6">
            <span
              role="img"
              aria-label="MGS MEBEL"
              className="flex shrink-0 flex-col items-center gap-0.75"
            >
              <LogoMark size="footer" />
            </span>
            {(slogan.text || slogan.accent) && (
              <p className="text-slogan wrap-break-word md:text-slogan-md">
                {slogan.text && lines(slogan.text)}
                {slogan.text && slogan.accent && ' '}
                {slogan.accent && <span className="text-accent">{slogan.accent}</span>}
              </p>
            )}
          </div>
          <FooterAccordion sections={sections} />
          {hasContacts && (
            <FooterContacts contacts={contacts} contact={contact} title={columns.contacts?.title} />
          )}
        </div>

        {hasBottom && (
          <div className="flex flex-col gap-4 border-t border-border pt-5 md:grid md:grid-cols-[1fr_auto] md:items-center md:gap-x-6 xl:grid-cols-[1fr_auto_1fr]">
            {hasLegal && (
              <p className="min-w-0 text-caption leading-relaxed font-normal wrap-anywhere text-text-4">
                {owner}
                {legal.ids.length > 0 && (
                  <>
                    {owner && (
                      <>
                        <br className="md:hidden" />
                        <span className="max-md:hidden"> · </span>
                      </>
                    )}
                    {legal.ids.join(' · ')}
                  </>
                )}
                {legal.address && (
                  <>
                    {(owner || legal.ids.length > 0) && <br />}
                    {legal.address}
                  </>
                )}
              </p>
            )}
            {links.length > 0 && (
              <ul className="flex flex-wrap gap-x-5 gap-y-1 md:col-span-2 md:row-start-2 xl:col-span-1 xl:col-start-2 xl:row-start-1 xl:justify-center">
                {links.map(({ href, title }) => (
                  <li key={href} className="flex">
                    <Link href={href} prefetch={false} className={BOTTOM_LINK}>
                      {title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {cookieSettings && (
              <CookieSettingsButton
                className={cn(
                  BOTTOM_LINK,
                  'self-start text-left md:col-start-2 md:row-start-1 md:justify-self-end xl:col-start-3',
                )}
              />
            )}
          </div>
        )}
      </div>
    </footer>
  )
}

/** Hotline and optional details, followed by the existing messenger chooser. */
function FooterContacts({
  contacts,
  contact,
  title,
}: {
  contacts: FooterData['contacts']
  contact: FooterData['contact']
  title?: string
}) {
  const { phone, hotlineLabel, hours, email, messengers } = contacts
  const hasNote = Boolean(hotlineLabel || hours)

  return (
    <section
      aria-label={title ? undefined : 'Контакты'}
      aria-labelledby={title ? 'footer-contacts-title' : undefined}
      className="flex min-w-0 flex-col gap-4 md:col-start-2 md:row-start-1 md:gap-3.5 xl:col-start-4"
    >
      {title && (
        <h2 id="footer-contacts-title" className={FOOTER_TITLE}>
          {title}
        </h2>
      )}
      {(phone || hasNote) && (
        <div className="flex flex-col gap-1">
          {phone && (
            <a
              href={phone.href}
              className={cn(
                'relative self-start text-phone-footer wrap-anywhere transition-colors hover:text-accent md:text-phone',
                HIT_AREA_Y,
              )}
            >
              {phone.display}
            </a>
          )}
          {hasNote && (
            <p className="text-body-xs text-text-4">
              {hotlineLabel}
              {hotlineLabel && hours && (
                <>
                  <span className="md:hidden"> · </span>
                  <br className="max-md:hidden" />
                </>
              )}
              {hours}
            </p>
          )}
        </div>
      )}
      {email && (
        <a
          href={`mailto:${email}`}
          className={cn(
            'relative self-start text-body font-semibold wrap-anywhere text-text-2 transition-colors hover:text-text',
            HIT_AREA_Y,
          )}
        >
          {email}
        </a>
      )}
      {contact && (
        <div data-footer-contact="" className="flex min-w-0 flex-col gap-2.5 pt-3">
          {contact.title && <p className="text-body-xs text-text-2">{contact.title}</p>}
          {contact.buttonLabel && (
            <div className="flex">
              <ContactButton
                caption={contact.buttonLabel}
                messengers={messengers}
                size={52}
                fullWidth="mobile"
                grow="start"
              />
            </div>
          )}
        </div>
      )}
    </section>
  )
}
