/** Site sections in menu order (README §5.3). Labels come from the `layout` global. */
export const NAV_ROUTES = [
  { key: 'about', href: '/about' },
  { key: 'salons', href: '/salons' },
  { key: 'works', href: '/works' },
  { key: 'catalogs', href: '/catalogs' },
  { key: 'designers', href: '/designers' },
  { key: 'news', href: '/news' },
] as const

export type NavKey = (typeof NAV_ROUTES)[number]['key']

/** Pages that open with a full-bleed hero: the header lies over it (design: absolute header). */
export const HERO_ROUTES: readonly string[] = ['/', '/about', '/designers']

/**
 * Path the header islands see on the global 404 instead of the unmatched URL: not a hero,
 * no active section, «←» to home.
 */
export const NOT_FOUND_PATH = '/404'

const trimSlash = (pathname: string) =>
  pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname

export const isHeroRoute = (pathname: string): boolean => HERO_ROUTES.includes(trimSlash(pathname))

/** A section is active on its own page and on pages nested under it (/news/[slug] → /news). */
export const isActive = (pathname: string, href: string): boolean => {
  const path = trimSlash(pathname)
  return path === href || path.startsWith(`${href}/`)
}

/** Target of the header «←»: the parent section, or home. None on the home page itself. */
export const parentOf = (pathname: string): { href: string; label: string } | null => {
  const path = trimSlash(pathname)
  if (path === '/') return null
  if (path.startsWith('/news/')) return { href: '/news', label: 'Назад к новостям' }
  // A project page (works v2 §3.1): «← Все работы»
  if (path.startsWith('/works/')) return { href: '/works', label: 'Все работы' }
  return { href: '/', label: 'На главную' }
}
