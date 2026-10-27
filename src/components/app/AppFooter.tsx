import Link from 'next/link'
import { Fragment, type ReactNode } from 'react'

import { CookieSettingsButton } from '@/components/cookies/CookieSettingsButton'
import { MessengerIcon } from '@/components/icons/MessengerIcon'
import { Action } from '@/components/ui/Action'
import { ContactButton } from '@/components/ui/ContactButton'
import { HIT_AREA_Y } from '@/components/ui/hitArea'
import { MESSENGER_NAMES } from '@/lib/chrome'
import { cn } from '@/lib/cn'
import type { FooterData } from '@/lib/footer'
import { FooterAccordion, type FooterSection } from './FooterAccordion'
import { FOOTER_TITLE } from './footerStyles'
import { LogoMark } from './Logo'

const currentYear = () =>
  new Intl.DateTimeFormat('ru-RU', { year: 'numeric', timeZone: 'Europe/Moscow' }).format(
    new Date(),
  )

const COLUMN_LIST = 'flex flex-col md:gap-3.5'
const COLUMN_LINK =
  'relative block py-2.5 text-body font-semibold text-text-2 transition-colors hover:text-text md:py-0'
// Text links of the bottom row from 768, chips below it (design: footer 1a / 2a)
const BOTTOM_LINK = cn(
  'relative rounded-thumb-lg border border-border-strong px-3.5 py-2 text-caption text-text-2 transition-colors hover:text-text',
  'md:rounded-none md:border-0 md:p-0',
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

/**
 * Site footer (README of the footer: 1a from 768, 2a below). One DOM for every width: below 768
 * the top row and the columns are `contents`, and `order` puts the blocks by importance — brand,
 * contacts, the contact card, the accordions, the bottom row. From 768 — the top row (brand and
 * the contact block), the columns (2 × 2, from 1280 four in a row) and the bottom row.
 * Empty fields and columns are not shown.
 */
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
  if (columns.buyers) {
    sections.push({
      key: 'buyers',
      title: columns.buyers.title,
      content: (
        <ul className={COLUMN_LIST}>
          {columns.buyers.items.map(({ label, href }, i) => (
            <li key={i}>
              <Action href={href} className={COLUMN_LINK}>
                {label}
              </Action>
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
        <ul className={COLUMN_LIST}>
          {columns.salons.items.map(({ name, address }, i) => (
            <li key={i}>
              <Link
                href="/salons"
                className="group flex flex-col gap-0.5 py-2.5 md:py-0"
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

  const hasContacts = Boolean(contacts.phone || contacts.email || contacts.messengers.length)
  const hasColumns = sections.length > 0 || hasContacts
  const owner = legal.owner && `© ${year} ${legal.owner}`
  const hasLegal = Boolean(owner || legal.ids.length || legal.address)
  const hasBottom = hasLegal || links.length > 0 || cookieSettings

  return (
    <footer className="mt-section rounded-t-footer bg-surface-2 pt-8 pb-dock-clearance md:pt-12 xl:pt-16 xl:pb-10">
      <div className="page-container flex flex-col gap-7 md:gap-10">
        <div className="contents md:flex md:flex-col md:gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="order-1 flex flex-row-reverse items-end justify-between gap-4 md:order-none md:flex-col md:items-start">
            <span
              role="img"
              aria-label="MGS MEBEL"
              className="flex shrink-0 flex-col items-center gap-0.75"
            >
              <LogoMark size="footer" />
            </span>
            {(slogan.text || slogan.accent) && (
              <p className="text-slogan text-balance md:text-slogan-md">
                {slogan.text && lines(slogan.text)}
                {slogan.text && slogan.accent && ' '}
                {slogan.accent && <span className="text-accent">{slogan.accent}</span>}
              </p>
            )}
          </div>
          {contact && (
            <div
              data-footer-contact=""
              className="order-3 flex flex-col gap-3 rounded-media border border-border bg-surface p-5 md:order-none md:gap-2.5 md:rounded-none md:border-0 md:bg-transparent md:p-0 xl:w-footer-contact"
            >
              {contact.title && (
                <p className="text-title-s md:text-body-xs md:font-semibold md:tracking-normal md:text-text-2">
                  {contact.title}
                </p>
              )}
              {contact.buttonLabel && (
                <div className="flex">
                  <ContactButton
                    caption={contact.buttonLabel}
                    messengers={contacts.messengers}
                    size={52}
                    fullWidth="mobile"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {hasColumns && (
          <div className="contents md:grid md:grid-footer md:gap-10 md:border-t md:border-border md:pt-8">
            <div className="order-4 md:contents">
              <FooterAccordion sections={sections} />
            </div>
            {hasContacts && <FooterContacts contacts={contacts} title={columns.contacts?.title} />}
          </div>
        )}

        {hasBottom && (
          <div className="order-5 flex flex-col gap-4 md:flex-row-reverse md:flex-wrap md:items-center md:justify-between md:gap-x-10 md:border-t md:border-border md:pt-5">
            {(links.length > 0 || cookieSettings) && (
              <ul className="flex flex-wrap gap-2 md:gap-x-5">
                {links.map(({ href, title }) => (
                  <li key={href} className="flex">
                    <Link href={href} prefetch={false} className={BOTTOM_LINK}>
                      {title}
                    </Link>
                  </li>
                ))}
                {cookieSettings && (
                  <li className="flex">
                    <CookieSettingsButton className={cn(BOTTOM_LINK, 'cursor-pointer')} />
                  </li>
                )}
              </ul>
            )}
            {hasLegal && (
              <p className="text-caption leading-relaxed font-normal text-text-4">
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
          </div>
        )}
      </div>
    </footer>
  )
}

/** «Контакты»: the column from 768, the block right after the brand below it (design: 2a). */
function FooterContacts({ contacts, title }: { contacts: FooterData['contacts']; title?: string }) {
  const { phone, hotlineLabel, hours, email, messengers } = contacts
  const note: ReactNode[] = [hotlineLabel, hours].filter(Boolean)

  return (
    <section
      aria-label={title ? undefined : 'Контакты'}
      aria-labelledby={title ? 'footer-contacts-title' : undefined}
      className="order-2 flex flex-col gap-4 md:order-none md:gap-3.5"
    >
      {title && (
        <h2 id="footer-contacts-title" className={cn(FOOTER_TITLE, 'max-md:sr-only')}>
          {title}
        </h2>
      )}
      {(phone || note.length > 0) && (
        <div className="flex flex-col gap-1">
          {phone && (
            <a
              href={phone.href}
              className="self-start text-phone-footer transition-colors hover:text-accent md:text-phone"
            >
              {phone.display}
            </a>
          )}
          {note.length > 0 && (
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
          className="self-start text-body font-semibold text-text-2 transition-colors hover:text-text"
        >
          {email}
        </a>
      )}
      {messengers.length > 0 && (
        <ul
          className={cn(
            'grid gap-2 md:flex md:gap-2.5',
            ['grid-cols-1', 'grid-cols-2', 'grid-cols-3'][messengers.length - 1],
          )}
        >
          {messengers.map(({ kind, href }) => (
            <li key={kind} className="flex">
              <Action
                href={href}
                aria-label={MESSENGER_NAMES[kind]}
                className="flex h-13 w-full items-center justify-center rounded-pill bg-surface-3 text-text transition-colors hover:bg-border-strong md:size-12"
              >
                <MessengerIcon kind={kind} className="size-5.5" />
              </Action>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
