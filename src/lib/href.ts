export type HrefKind =
  /** Own page: rendered with next/link. */
  | { kind: 'internal'; href: string }
  /** Other site: new tab, rel="noopener noreferrer". */
  | { kind: 'external'; href: string }
  /** tel:, mailto:, other schemes and files under /api: a plain link in the same tab. */
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
// Files and the API (`/api/media/file/…`) are not pages: a plain link, no next/link prefetch
const isApiPath = (path: string) => path === '/api' || /^\/api[/?#]/.test(path)

export const classifyHref = (href: string): HrefKind => {
  if (/^https?:\/\//i.test(href)) {
    const url = new URL(href)
    if (url.origin === siteOrigin()) {
      const path = `${url.pathname}${url.search}${url.hash}`
      return { kind: isApiPath(path) ? 'plain' : 'internal', href: path }
    }
    return { kind: 'external', href }
  }
  if (isApiPath(href)) return { kind: 'plain', href }
  if (href.startsWith('/') || href.startsWith('#') || href.startsWith('?')) {
    return { kind: 'internal', href }
  }
  return { kind: 'plain', href }
}
