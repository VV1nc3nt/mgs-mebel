import type { Designer } from '@/payload-types'

import { orderMessengers, type Messenger } from './chrome'
import { asMedia, type MediaValue } from './media'
import { telHref } from './phone'
import { plural } from './plural'

export type DesignerProject = NonNullable<NonNullable<Designer['projects']>['items']>[number]

/**
 * Projects shown on the page (designers v2 §2.3): not hidden, with a title and a poster, in the
 * editor's order. Numbers and the counter count only these.
 */
export const visibleProjects = (items: DesignerProject[] | null | undefined): DesignerProject[] =>
  (items ?? []).filter((item) => !item.hidden && item.title?.trim() && asMedia(item.poster))

/** Card number: 0 → «01». */
export const itemNumber = (index: number): string => String(index + 1).padStart(2, '0')

/** «6 преимуществ» next to the capabilities heading. */
export const capabilityCount = (n: number): string =>
  `${n} ${plural(n, ['преимущество', 'преимущества', 'преимуществ'])}`

export type DesignerManagerInput = {
  photo?: MediaValue
  name?: string | null
  position?: string | null
  phone?: string | null
  max?: string | null
  whatsapp?: string | null
  telegram?: string | null
}

export type DesignerManager = {
  photo: MediaValue
  name?: string
  position?: string
  phone?: { display: string; href: string }
  /** In MESSENGER_ORDER, without empty links. */
  messengers: Messenger[]
}

const text = (value: string | null | undefined): string | undefined => value?.trim() || undefined

/**
 * The manager card of «Сотрудничество»: only the fields the page shows. No phone and no
 * messengers — nothing to contact, no section (null).
 */
export const toDesignerManager = (
  input: DesignerManagerInput | null | undefined,
): DesignerManager | null => {
  const display = text(input?.phone)
  const href = display && telHref(display)
  const phone = display && href ? { display, href } : undefined
  const messengers = orderMessengers(input)
  if (!phone && !messengers.length) return null
  return {
    photo: asMedia(input?.photo),
    name: text(input?.name),
    position: text(input?.position),
    phone,
    messengers,
  }
}
