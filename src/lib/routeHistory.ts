/**
 * The route the visitor came from within this document (client navigations): its path and query
 * at the moment it was left. Unknown after a full load — then nothing is known to go back to.
 */

export type RouteEntry = { pathname: string; search: string }

let current: RouteEntry | null = null
let previous: RouteEntry | null = null

/** The address now (path and query): a new path makes the last one the previous route. */
export function trackRoute(pathname: string, search: string) {
  if (current && current.pathname !== pathname) previous = current
  current = { pathname, search }
}

export const previousRoute = (): RouteEntry | null => previous

/** Tests: start over. */
export function resetRouteHistory() {
  current = null
  previous = null
}
