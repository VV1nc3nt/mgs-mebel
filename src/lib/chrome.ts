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

/** Order of the messengers everywhere: dock, contact buttons, menu, footer. */
export const MESSENGER_ORDER = [
  'max',
  'telegram',
  'whatsapp',
] as const satisfies readonly MessengerKind[]

export type NavItem = { key: NavKey; href: string; label: string; shortLabel: string }

/**
 * Header, menu, dock and footer data: plain serialisable values only, so it can be passed to
 * client components as is. Empty CMS fields become `undefined` and their elements are not shown.
 */
export type SiteChrome = {
  nav: NavItem[]
  phone?: { display: string; href: string }
  /** In MESSENGER_ORDER, without empty links. */
  messengers: Messenger[]
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

/** Accessible name of a contact button with one messenger: the visible label plus where it leads. */
export const contactLinkLabel = (label: string, messenger: Messenger): string =>
  `${label} в ${MESSENGER_NAMES[messenger.kind]}`

/** Accessible name of the closed dock button with a choice of messengers. */
export const dockChooserLabel = (label: string): string => `${label} в мессенджере`

/** The open choice: the same button closes it. */
export const CHOOSER_CLOSE_LABEL = 'Закрыть выбор мессенджера'

/** The group of messenger logos in the dock. */
export const DOCK_GROUP_LABEL = 'Спросить в мессенджере'

export const toChrome = (layout: LayoutInput, settings: SettingsInput): SiteChrome => {
  const nav = NAV_ROUTES.flatMap(({ key, href }) => {
    const label = text(layout.nav?.[key]?.label)
    if (!label) return []
    return [{ key, href, label, shortLabel: text(layout.nav?.[key]?.shortLabel) ?? label }]
  })

  const phoneText = text(settings.contacts?.hotlinePhone)
  const phoneHref = phoneText && telHref(phoneText)

  const messengers = MESSENGER_ORDER.flatMap((kind) => {
    const href = text(settings.messengers?.[kind])
    return href ? [{ kind, href }] : []
  })

  return {
    nav,
    phone: phoneText && phoneHref ? { display: phoneText, href: phoneHref } : undefined,
    messengers,
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
