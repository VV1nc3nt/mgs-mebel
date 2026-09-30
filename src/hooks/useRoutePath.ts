'use client'

import { usePathname } from 'next/navigation'
import { createContext, useContext } from 'react'

const RoutePathContext = createContext<string | null>(null)

/** Replaces the URL path for the header islands of a page that is not the route itself (404). */
export const RoutePathProvider = RoutePathContext.Provider

/** Path the header, nav and menu reason about: the override if one is provided, else the URL. */
export function useRoutePath(): string {
  const override = useContext(RoutePathContext)
  const pathname = usePathname()
  return override ?? pathname
}
