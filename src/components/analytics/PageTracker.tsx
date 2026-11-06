'use client'

import { useEffect } from 'react'

import { allows, getConsentState, subscribeConsent } from '@/lib/cookieConsent'
import { analyticsConfig, publicAnalyticsPath, stopMetrika, viewMetrika } from '@/lib/metrika'

/** Mounted only by a successful public page and only after analytics consent. */
export function PageTracker({ path }: { path: string }) {
  useEffect(() => {
    const id = analyticsConfig(window.location.hostname)
    if (!id || !publicAnalyticsPath(path) || window.top !== window.self) return
    const permitted = () => allows(getConsentState().consent, 'analytics')
    let release: (() => void) | undefined
    if (permitted()) release = viewMetrika(id, path, permitted)
    const unsubscribe = subscribeConsent(() => {
      if (!permitted()) stopMetrika()
    })
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted && permitted()) {
        stopMetrika()
        release = viewMetrika(id, path, permitted)
      }
    }
    window.addEventListener('pageshow', restored)
    return () => {
      unsubscribe()
      window.removeEventListener('pageshow', restored)
      release?.()
    }
  }, [path])
  return null
}
