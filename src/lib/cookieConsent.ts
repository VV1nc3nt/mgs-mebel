/*
 * Cookie consent (README of the footer §2): the choice of the visitor in localStorage, a module
 * store for the notice, the footer button and the scripts that wait for consent. The notice has
 * no settings screen — three choices only.
 */

export const CONSENT_KEY = 'mgs-cookie-consent'
/** A new version asks everybody again. */
export const CONSENT_VERSION = 1

export type ConsentChoice = 'accept' | 'necessary' | 'reject'
export type ConsentCategory = 'analytics' | 'marketing'

export type Consent = {
  necessary: boolean
  analytics: boolean
  marketing: boolean
  rejected: boolean
  date: string
  version: number
}

const CHOICES: Record<ConsentChoice, Omit<Consent, 'date' | 'version'>> = {
  accept: { necessary: true, analytics: true, marketing: true, rejected: false },
  necessary: { necessary: true, analytics: false, marketing: false, rejected: false },
  reject: { necessary: false, analytics: false, marketing: false, rejected: true },
}

export const consentOf = (choice: ConsentChoice, now: Date): Consent => ({
  ...CHOICES[choice],
  date: now.toISOString(),
  version: CONSENT_VERSION,
})

export const serializeConsent = (consent: Consent): string => JSON.stringify(consent)

/** A stored value, or null when there is none or it is not ours. */
export const parseConsent = (raw: string | null | undefined): Consent | null => {
  if (!raw) return null
  try {
    const v: unknown = JSON.parse(raw)
    if (!v || typeof v !== 'object') return null
    const c = v as Record<string, unknown>
    const flags = ['necessary', 'analytics', 'marketing', 'rejected'] as const
    if (!flags.every((k) => typeof c[k] === 'boolean')) return null
    if (typeof c.date !== 'string' || typeof c.version !== 'number') return null
    return {
      necessary: c.necessary as boolean,
      analytics: c.analytics as boolean,
      marketing: c.marketing as boolean,
      rejected: c.rejected as boolean,
      date: c.date,
      version: c.version,
    }
  } catch {
    return null
  }
}

/** The choice was made for the current version of the notice. */
export const isCurrent = (consent: Consent | null): consent is Consent =>
  consent !== null && consent.version === CONSENT_VERSION

/** Consent to a category that only a current choice gives. */
export const allows = (consent: Consent | null, category: ConsentCategory): boolean =>
  isCurrent(consent) && consent[category]

/** A category given before is taken back: scripts already loaded stay until a reload. */
export const revokes = (before: Consent | null, after: Consent): boolean =>
  (['analytics', 'marketing'] as const).some((k) => allows(before, k) && !after[k])

// ---------------------------------------------------------------------------------------------
// Store

export type ConsentState = {
  /** false on the server and during hydration: the notice and the scripts wait for the client. */
  read: boolean
  consent: Consent | null
  /** «Настройки cookies»: the notice is shown again over a saved choice. */
  reopened: boolean
  /** Opened again from the keyboard: the focus goes to the first button. */
  focusNotice: boolean
}

const SERVER_STATE: ConsentState = {
  read: false,
  consent: null,
  reopened: false,
  focusNotice: false,
}
/** The footer button that opened the notice again: the focus comes back to it. */
let opener: HTMLElement | null = null

let state: ConsentState = SERVER_STATE
/** localStorage throws (private mode, blocked site data): the choice lives until a reload. */
let memory: string | null = null
const listeners = new Set<() => void>()

const readStorage = (): string | null => {
  try {
    return window.localStorage.getItem(CONSENT_KEY)
  } catch {
    return memory
  }
}

const writeStorage = (value: string) => {
  memory = value
  try {
    window.localStorage.setItem(CONSENT_KEY, value)
  } catch {
    // Not available: kept in memory
  }
}

const set = (next: ConsentState) => {
  state = next
  for (const listener of listeners) listener()
}

const onStorage = (event: StorageEvent) => {
  // Another tab chose: this one follows
  if (event.key === CONSENT_KEY || event.key === null) {
    set({ ...state, consent: parseConsent(readStorage()) })
  }
}

export function subscribeConsent(listener: () => void): () => void {
  if (listeners.size === 0) window.addEventListener('storage', onStorage)
  listeners.add(listener)
  if (!state.read) {
    // First subscriber after mount: read now, notify after the subscription is in place
    state = { ...SERVER_STATE, read: true, consent: parseConsent(readStorage()) }
    queueMicrotask(listener)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) window.removeEventListener('storage', onStorage)
  }
}

export const getConsentState = (): ConsentState => state
export const getServerConsentState = (): ConsentState => SERVER_STATE

/** The notice is shown: no current choice, or the visitor asked for it again. */
export const isNoticeShown = (s: ConsentState): boolean =>
  s.read && (s.reopened || !isCurrent(s.consent))

/** Saves the choice; true when it takes back a category (the caller reloads the page). */
export function saveConsent(choice: ConsentChoice, now = new Date()): boolean {
  const before = state.consent
  const consent = consentOf(choice, now)
  writeStorage(serializeConsent(consent))
  set({ ...SERVER_STATE, read: true, consent })
  return revokes(before, consent)
}

/** «Настройки cookies» in the footer: `keyboard` — opened with Enter / Space. */
export function reopenConsent({
  keyboard = false,
  from = null,
}: { keyboard?: boolean; from?: HTMLElement | null } = {}): void {
  opener = from
  set({ ...state, read: true, reopened: true, focusNotice: keyboard })
}

/** The element to focus after a choice made with the focus inside the notice. */
export const consentOpener = (): HTMLElement | null => (opener?.isConnected ? opener : null)

/** Tests only: back to the state before the first read. */
export function resetConsentStore(): void {
  state = SERVER_STATE
  memory = null
  opener = null
}
