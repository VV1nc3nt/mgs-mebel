export type HrefKind =
  /** Own page: rendered with next/link. */
  | { kind: 'internal'; href: string }
  /** Other site: new tab, rel="noopener noreferrer". */
  | { kind: 'external'; href: string }
  /** tel:, mailto: and other schemes: a plain link in the same tab. */
  | { kind: 'plain'; href: string }

const siteOrigin = (): string | null => {
  try {
    return process.env.NEXT_PUBLIC_SITE_URL
      ? new URL(process.env.NEXT_PUBLIC_SITE_URL).origin
      : null
  } catch {
    return null
  }
}

/**
 * External means `http://` or `https://` on another origin. Absolute links to the own domain
 * (NEXT_PUBLIC_SITE_URL) become paths and open in the same tab.
 */
export const classifyHref = (href: string): HrefKind => {
  if (/^https?:\/\//i.test(href)) {
    const url = new URL(href)
    if (url.origin === siteOrigin()) {
      return { kind: 'internal', href: `${url.pathname}${url.search}${url.hash}` }
    }
    return { kind: 'external', href }
  }
  if (href.startsWith('/') || href.startsWith('#') || href.startsWith('?')) {
    return { kind: 'internal', href }
  }
  return { kind: 'plain', href }
}
