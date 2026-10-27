'use client'

import type { ReactNode } from 'react'

import { useCookieConsent } from '@/hooks/useCookieConsent'
import { allows, type ConsentCategory } from '@/lib/cookieConsent'

/**
 * The place for analytics and marketing scripts (README of the footer §2): its children render
 * only after the visitor agreed to `category` — never on the server, never before a choice.
 * Taking consent back reloads the page (CookieBanner): a loaded script cannot be unloaded.
 */
export function ConsentScripts({
  category,
  children,
}: {
  category: ConsentCategory
  children: ReactNode
}) {
  const { consent } = useCookieConsent()
  return allows(consent, category) ? children : null
}
