import type { Layout, Setting } from '@/payload-types'

import { telHref } from './phone'
import { NAV_ROUTES, type NavKey } from './routes'

export type MessengerKind = 'max' | 'whatsapp' | 'telegram'

export const MESSENGER_NAMES: Record<MessengerKind, string> = {
  max: 'MAX',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
}

export type Messenger = { kind: MessengerKind; href: string }

export type NavItem = { key: NavKey; href: string; label: string; shortLabel: string }

/**
 * Header, menu, dock and footer data: plain serialisable values only, so it can be passed to
 * client components as is. Empty CMS fields become `undefined` and their elements are not shown.
 */
export type SiteChrome = {
  nav: NavItem[]
  phone?: { display: string; href: string }
  /** Keyed by kind; each component lists them in its own order. */
  messengers: Partial<Record<MessengerKind, string>>
  /** «Рассчитать проект» and «Спросить». */
  contactAction?: Messenger
  ctaLabel?: string
  menu: { hotlineLabel?: string; messengersLabel?: string }
  askLabel?: string
  footer: {
    sloganText?: string
    sloganAccent?: string
    hotlineLabel?: string
    copyright?: string
  }
}

/** Only the parts of the globals the site chrome reads (settings: no technical fields). */
export type LayoutInput = Partial<Pick<Layout, 'header' | 'nav' | 'menu' | 'dock' | 'footer'>>
export type SettingsInput = Partial<Pick<Setting, 'contacts' | 'messengers'>>

const text = (value: string | null | undefined): string | undefined => value?.trim() || undefined

/** Where «Рассчитать проект» and «Спросить» lead: WhatsApp, else Telegram, else nowhere. */
export const resolveContactAction = (
  messengers: SiteChrome['messengers'],
): Messenger | undefined => {
  if (messengers.whatsapp) return { kind: 'whatsapp', href: messengers.whatsapp }
  if (messengers.telegram) return { kind: 'telegram', href: messengers.telegram }
  return undefined
}

/** Accessible name of a contact button: the visible label plus where it leads. */
export const contactLabel = (label: string, action: Messenger): string =>
  `${label} в ${MESSENGER_NAMES[action.kind]}`

export const toChrome = (layout: LayoutInput, settings: SettingsInput): SiteChrome => {
  const nav = NAV_ROUTES.flatMap(({ key, href }) => {
    const label = text(layout.nav?.[key]?.label)
    if (!label) return []
    return [{ key, href, label, shortLabel: text(layout.nav?.[key]?.shortLabel) ?? label }]
  })

  const phoneText = text(settings.contacts?.hotlinePhone)
  const phoneHref = phoneText && telHref(phoneText)

  const messengers: SiteChrome['messengers'] = {}
  for (const kind of ['max', 'whatsapp', 'telegram'] as const) {
    const href = text(settings.messengers?.[kind])
    if (href) messengers[kind] = href
  }

  return {
    nav,
    phone: phoneText && phoneHref ? { display: phoneText, href: phoneHref } : undefined,
    messengers,
    contactAction: resolveContactAction(messengers),
    ctaLabel: text(layout.header?.ctaLabel),
    menu: {
      hotlineLabel: text(layout.menu?.hotlineLabel),
      messengersLabel: text(layout.menu?.messengersLabel),
    },
    askLabel: text(layout.dock?.askLabel),
    footer: {
      sloganText: text(layout.footer?.sloganText),
      sloganAccent: text(layout.footer?.sloganAccent),
      hotlineLabel: text(layout.footer?.hotlineLabel),
      copyright: text(layout.footer?.copyright),
    },
  }
}
