import type { SettingsInput } from './chrome'
import { BRAND } from './seo'
import { siteUrl } from './site'

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
