import { useSyncExternalStore } from 'react'

import {
  getConsentState,
  getServerConsentState,
  subscribeConsent,
  type ConsentState,
} from '@/lib/cookieConsent'

/**
 * The cookie choice of the visitor (lib/cookieConsent.ts). On the server and during hydration —
 * not read yet: localStorage is read after mount, so the HTML never depends on it.
 */
export function useCookieConsent(): ConsentState {
  return useSyncExternalStore(subscribeConsent, getConsentState, getServerConsentState)
}
