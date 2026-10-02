const FALLBACK = 'http://localhost:3000'

/**
 * Absolute origin of the site, without a trailing slash: canonical URLs, Open Graph, JSON-LD,
 * Live Preview. `SITE_URL` is read at run time, so one image can serve several environments;
 * `NEXT_PUBLIC_SITE_URL` is frozen at build time (also in server code).
 */
export const siteUrl = (): string => {
  const value = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || FALLBACK
  try {
    return new URL(value).origin
  } catch {
    return FALLBACK
  }
}

/** Absolute URL of a site path: `/` is the origin itself, other paths have no trailing slash. */
export const absoluteUrl = (path: string): string => {
  const clean = path === '/' ? '' : path.replace(/\/+$/, '')
  return `${siteUrl()}${clean}`
}
