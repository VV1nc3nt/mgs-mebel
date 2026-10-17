import type { SettingsInput } from './chrome'
import { imageSource, type MediaValue } from './media'
import { BRAND, ogImage } from './seo'
import { absoluteUrl, siteUrl } from './site'

export type JsonLdData = Record<string, unknown>

/**
 * JSON for a <script type="application/ld+json">: `<` is escaped, so CMS text can never close
 * the script tag (Next.js JSON-LD guide).
 */
export const serializeJsonLd = (data: JsonLdData): string =>
  JSON.stringify(data).replace(/</g, '\\u003c')

/** The company on every page: name, site, contacts from `settings` (no logo, no sameAs yet). */
export const organizationJsonLd = (settings: SettingsInput): JsonLdData => {
  const telephone = settings.contacts?.hotlinePhone?.trim()
  const email = settings.contacts?.email?.trim()
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND,
    url: siteUrl(),
    ...(telephone || email
      ? {
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer service',
            ...(telephone && { telephone }),
            ...(email && { email }),
          },
        }
      : {}),
  }
}

export type Breadcrumb = { name: string; path: string }

/** Path from the home page to the current one; the last item is the page itself. */
export const breadcrumbJsonLd = (items: Breadcrumb[]): JsonLdData => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: absoluteUrl(item.path),
  })),
})

export type NewsArticleInput = {
  title: string
  lead?: string | null
  cover?: MediaValue
  date: string
  updatedAt?: string | null
  path: string
}

/**
 * A news article (Яндекс / Google rich results): the company as author and publisher (no logo yet),
 * the cover as an absolute URL (Open Graph size), the page as its main entity.
 */
export const newsArticleJsonLd = ({
  title,
  lead,
  cover,
  date,
  updatedAt,
  path,
}: NewsArticleInput): JsonLdData => {
  const organization = { '@type': 'Organization', name: BRAND, url: siteUrl() }
  const description = lead?.trim()
  const image = ogImage(cover)?.url
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: title,
    ...(description && { description }),
    ...(image && { image: [image] }),
    datePublished: date,
    ...(updatedAt && { dateModified: updatedAt }),
    author: organization,
    publisher: organization,
    mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(path) },
  }
}

/** Pages listed in their order (the works feed «все»); none — no list. */
export const itemListJsonLd = (items: Breadcrumb[]): JsonLdData | null =>
  items.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: items.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          url: absoluteUrl(item.path),
        })),
      }
    : null

const DAYS: Record<string, string> = {
  пн: 'Mo',
  вт: 'Tu',
  ср: 'We',
  чт: 'Th',
  пт: 'Fr',
  сб: 'Sa',
  вс: 'Su',
}
const DASH = '\\s*[-–—]\\s*'
const DAY = '([а-яё]{2})\\.?'
const DAY_RANGE = new RegExp(`^${DAY}(?:${DASH}${DAY})?$`, 'i')
const TIME = '(\\d{1,2}):(\\d{2})'
const GROUP = new RegExp(`^(?:(.+?)\\s+)?${TIME}${DASH}${TIME}$`)
// Hours without days: every day
const EVERY_DAY = 'Mo-Su'

const schemaTime = (hours: string, minutes: string): string | null => {
  const h = Number(hours)
  const m = Number(minutes)
  if (h > 24 || m > 59 || (h === 24 && m > 0)) return null
  return `${String(h).padStart(2, '0')}:${minutes}`
}

const schemaDays = (text: string): string | null => {
  const parts = text.split(',').map((part) => part.trim())
  const days: string[] = []
  for (const part of parts) {
    const match = DAY_RANGE.exec(part)
    if (!match) return null
    const from = DAYS[match[1].toLowerCase()]
    const to = match[2] ? DAYS[match[2].toLowerCase()] : undefined
    if (!from || (match[2] && !to)) return null
    days.push(to ? `${from}-${to}` : from)
  }
  return days.join(',')
}

/**
 * Opening hours as the editor writes them — «Пн–Пт 10:00–21:00; Сб–Вс 11:00–20:00» (groups by
 * «;», days by «,», hyphen or dash; no days — every day) — in the schema.org `openingHours` format:
 * ['Mo-Fr 10:00-21:00', 'Sa-Su 11:00-20:00']. Empty — []; anything else — null.
 */
export const openingHoursSchema = (text: string | null | undefined): string[] | null => {
  const groups = (text ?? '')
    .split(';')
    .map((group) => group.trim().replace(/\s+/g, ' '))
    .filter(Boolean)
  const result: string[] = []
  for (const group of groups) {
    const match = GROUP.exec(group)
    if (!match) return null
    const days = match[1] ? schemaDays(match[1]) : EVERY_DAY
    const opens = schemaTime(match[2], match[3])
    const closes = schemaTime(match[4], match[5])
    if (!days || !opens || !closes) return null
    result.push(`${days} ${opens}-${closes}`)
  }
  return result
}

export type SalonJsonLdInput = {
  id: number | string
  name: string
  address: string
  phone?: string | null
  hours?: string | null
  location?: { lat?: number | null; lng?: number | null } | null
  poster?: MediaValue
}

const SALONS_PATH = '/salons'

/** A salon of the «Салоны» page: FurnitureStore with its address, phone, coordinates and hours. */
export const salonJsonLd = (salon: SalonJsonLdInput): JsonLdData => {
  const page = absoluteUrl(SALONS_PATH)
  const telephone = salon.phone?.trim()
  const { lat, lng } = salon.location ?? {}
  const openingHours = openingHoursSchema(salon.hours)
  const image = imageSource(salon.poster, 'card')
  return {
    '@context': 'https://schema.org',
    '@type': 'FurnitureStore',
    '@id': `${page}#${salon.id}`,
    name: `${BRAND} — ${salon.name}`,
    url: page,
    address: { '@type': 'PostalAddress', streetAddress: salon.address },
    ...(telephone && { telephone }),
    ...(typeof lat === 'number' &&
      typeof lng === 'number' && {
        geo: { '@type': 'GeoCoordinates', latitude: lat, longitude: lng },
      }),
    ...(openingHours?.length && { openingHours }),
    ...(image && { image: absoluteUrl(image.src) }),
  }
}
