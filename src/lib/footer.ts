import type { LayoutInput, Messenger, NavItem, SettingsInput } from './chrome'
import type { LegalLink, LegalLinks } from './legal'

/*
 * Footer and cookie notice data (README of the footer §1, §2): plain values for the server
 * footer and the client notice. Empty CMS fields drop their element; a column without a title or
 * without links is not shown.
 */

const text = (value: string | null | undefined): string | undefined => value?.trim() || undefined

/**
 * A footer link of an editor: a page of the site «/…» or an https:// address of another site.
 * Used by the field validation and by the footer (anything else is dropped).
 */
export const checkFooterHref = (value: string): string | true => {
  const href = value.trim()
  if (href.startsWith('/')) {
    return href.startsWith('//') ? 'Ссылка на страницу сайта начинается с одного «/»' : true
  }
  try {
    return new URL(href).protocol === 'https:'
      ? true
      : 'Ссылка должна начинаться с «/» или https://'
  } catch {
    return 'Ссылка должна начинаться с «/» или https://'
  }
}

export type FooterLink = { label: string; href: string }
export type FooterSalon = { name: string; address?: string }

export type FooterColumns = {
  menu?: { title: string; items: NavItem[] }
  buyers?: { title: string; items: FooterLink[] }
  salons?: { title: string; items: FooterSalon[] }
  contacts?: { title: string }
}

export type FooterData = {
  slogan: { text?: string; accent?: string }
  contacts: {
    phone?: { display: string; href: string }
    hotlineLabel?: string
    hours?: string
    email?: string
    messengers: Messenger[]
  }
  /** The block in place of the call form: a title and the contact button. */
  contact?: { title?: string; buttonLabel?: string }
  columns: FooterColumns
  /** «© year owner · ИНН … · ОГРН …» and the address below. */
  legal: { owner?: string; ids: string[]; address?: string }
  links: LegalLink[]
}

export type FooterInput = {
  layout: LayoutInput
  settings: SettingsInput
  nav: NavItem[]
  phone?: { display: string; href: string }
  messengers: Messenger[]
  salons: { name?: string | null; address?: string | null }[]
  legal: LegalLinks
}

export function toFooter({
  layout,
  settings,
  nav,
  phone,
  messengers,
  salons,
  legal,
}: FooterInput): FooterData {
  const footer = layout.footer
  const requisites = settings.requisites

  const buyerLinks = (footer?.buyerLinks ?? []).flatMap(({ label, href }) => {
    const l = text(label)
    const h = text(href)
    return l && h && checkFooterHref(h) === true ? [{ label: l, href: h }] : []
  })
  const salonItems = salons.flatMap(({ name, address }) => {
    const n = text(name)
    return n ? [{ name: n, address: text(address) }] : []
  })

  const contacts = {
    phone,
    hotlineLabel: text(footer?.hotlineLabel),
    hours: text(requisites?.hours),
    email: text(settings.contacts?.email),
    messengers,
  }
  const hasContacts = Boolean(phone || contacts.email || messengers.length > 0)

  const column = <T>(title: string | null | undefined, items: T[]) => {
    const t = text(title)
    return t && items.length > 0 ? { title: t, items } : undefined
  }
  const contactsTitle = text(footer?.contactsTitle)

  const title = text(footer?.contact?.title)
  const buttonLabel = text(footer?.contact?.buttonLabel)
  const button = buttonLabel && messengers.length > 0 ? buttonLabel : undefined

  const company = text(requisites?.company)
  const inn = text(requisites?.inn)
  const ogrn = text(requisites?.ogrn)

  return {
    slogan: { text: text(footer?.sloganText), accent: text(footer?.sloganAccent) },
    contacts,
    contact: title || button ? { title, buttonLabel: button } : undefined,
    columns: {
      menu: column(footer?.menuTitle, nav),
      buyers: column(footer?.buyersTitle, buyerLinks),
      salons: column(footer?.salonsTitle, salonItems),
      contacts: contactsTitle && hasContacts ? { title: contactsTitle } : undefined,
    },
    legal: {
      owner: company ?? text(footer?.copyright),
      ids: [inn && `ИНН ${inn}`, ogrn && `ОГРН ${ogrn}`].filter((v): v is string => !!v),
      address: text(requisites?.legalAddress),
    },
    links: [legal.privacy, legal.offer].filter((v): v is LegalLink => !!v),
  }
}

export type CookieTexts = {
  lead: string
  text: string
  /** «Подробнее» → /cookies: only with the label and a published policy. */
  more?: { label: string; href: string }
  reject: string
  necessary: string
  accept: string
}

/** The cookie notice: all or nothing — without the text or a button label there is no notice. */
export function toCookieTexts(layout: LayoutInput, legal: LegalLinks): CookieTexts | undefined {
  const c = layout.cookies
  const lead = text(c?.lead)
  const body = text(c?.text)
  const reject = text(c?.rejectLabel)
  const necessary = text(c?.necessaryLabel)
  const accept = text(c?.acceptLabel)
  if (!lead || !body || !reject || !necessary || !accept) return undefined
  const moreLabel = text(c?.moreLabel)
  return {
    lead,
    text: body,
    more: moreLabel && legal.cookies ? { label: moreLabel, href: legal.cookies.href } : undefined,
    reject,
    necessary,
    accept,
  }
}
