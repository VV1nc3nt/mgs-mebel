'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

import { trackRoute } from '@/lib/routeHistory'

/**
 * Keeps the previous route of the document (lib/routeHistory): the query too, which Next syncs
 * from replaceState (filters, the view of an item). Renders nothing.
 */
export function RouteHistory() {
  const pathname = usePathname()
  const search = useSearchParams().toString()
  useEffect(() => {
    trackRoute(pathname, search)
  }, [pathname, search])
  return null
}
