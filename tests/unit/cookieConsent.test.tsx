import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CookieBanner } from '@/components/cookies/CookieBanner'
import { ConsentScripts } from '@/components/cookies/ConsentScripts'
import { CookieSettingsButton } from '@/components/cookies/CookieSettingsButton'
import {
  allows,
  CONSENT_KEY,
  consentOf,
  isCurrent,
  parseConsent,
  resetConsentStore,
  revokes,
  serializeConsent,
} from '@/lib/cookieConsent'
import { toCookieTexts } from '@/lib/footer'
import { globals } from '@/seed/data/globals'

const texts = toCookieTexts(globals(() => 0).layout, {
  cookies: { href: '/cookies', title: 'Политика cookies' },
})!
const NOW = new Date('2026-10-27T10:00:00.000Z')

describe('consent values', () => {
  it('three choices, README §2', () => {
    expect(consentOf('accept', NOW)).toEqual({
      necessary: true,
      analytics: true,
      marketing: true,
      rejected: false,
      date: '2026-10-27T10:00:00.000Z',
      version: 1,
    })
    expect(consentOf('necessary', NOW)).toMatchObject({
      necessary: true,
      analytics: false,
      marketing: false,
      rejected: false,
    })
    expect(consentOf('reject', NOW)).toMatchObject({
      necessary: false,
      analytics: false,
      marketing: false,
      rejected: true,
    })
  })

  it('parse ⇄ serialize; garbage is no choice', () => {
    const c = consentOf('necessary', NOW)
    expect(parseConsent(serializeConsent(c))).toEqual(c)
    for (const raw of [null, '', '{', '1', 'null', '{"analytics":true}', '[]']) {
      expect(parseConsent(raw)).toBeNull()
    }
    expect(parseConsent(JSON.stringify({ ...c, marketing: 'yes' }))).toBeNull()
  })

  it('an old version asks again and allows nothing', () => {
    const old = { ...consentOf('accept', NOW), version: 0 }
    expect(isCurrent(old)).toBe(false)
    expect(isCurrent(consentOf('accept', NOW))).toBe(true)
    expect(allows(old, 'analytics')).toBe(false)
    expect(allows(consentOf('accept', NOW), 'analytics')).toBe(true)
    expect(allows(null, 'marketing')).toBe(false)
  })

  it('revokes: a category given before is taken back', () => {
    const all = consentOf('accept', NOW)
    expect(revokes(all, consentOf('necessary', NOW))).toBe(true)
    expect(revokes(all, consentOf('accept', NOW))).toBe(false)
    expect(revokes(null, consentOf('reject', NOW))).toBe(false)
    expect(revokes(consentOf('necessary', NOW), consentOf('reject', NOW))).toBe(false)
  })
})

/** A localStorage of the test: jsdom under recent Node has none. `blocked` — every call throws. */
const storage = (blocked = false): Storage => {
  const items = new Map<string, string>()
  const guard = () => {
    if (blocked) throw new DOMException('blocked', 'SecurityError')
  }
  return {
    get length() {
      return items.size
    },
    clear: () => items.clear(),
    key: (i) => [...items.keys()][i] ?? null,
    getItem: (k) => (guard(), items.get(k) ?? null),
    setItem: (k, v) => (guard(), void items.set(k, String(v))),
    removeItem: (k) => void items.delete(k),
  }
}

const useStorage = (blocked = false) =>
  Object.defineProperty(window, 'localStorage', { value: storage(blocked), configurable: true })

describe('CookieBanner', () => {
  beforeEach(() => {
    resetConsentStore()
    useStorage()
  })
  afterEach(() => vi.restoreAllMocks())

  const app = () => (
    <>
      <CookieBanner texts={texts} />
      <CookieSettingsButton />
      <ConsentScripts category="analytics">
        <span>analytics</span>
      </ConsentScripts>
    </>
  )

  it('shows on the first visit, saves the choice and hides', async () => {
    render(app())
    const dialog = await screen.findByRole('dialog', { name: 'Cookies' })
    expect(dialog.getAttribute('aria-modal')).toBeNull()
    expect(screen.getByRole('link', { name: 'Подробнее' }).getAttribute('href')).toBe('/cookies')
    expect(screen.queryByText('analytics')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Принять все' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(JSON.parse(window.localStorage.getItem(CONSENT_KEY)!)).toMatchObject({
      analytics: true,
      marketing: true,
      rejected: false,
      version: 1,
    })
    expect(screen.getByText('analytics')).toBeTruthy()
  })

  it('stays hidden with a current choice; an old version shows it again', async () => {
    window.localStorage.setItem(CONSENT_KEY, serializeConsent(consentOf('reject', NOW)))
    const { unmount } = render(app())
    await act(async () => {})
    expect(screen.queryByRole('dialog')).toBeNull()
    unmount()
    resetConsentStore()
    window.localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({ ...consentOf('accept', NOW), version: 0 }),
    )
    render(app())
    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect(screen.queryByText('analytics')).toBeNull()
  })

  it('Esc does not close it', async () => {
    render(app())
    const dialog = await screen.findByRole('dialog')
    fireEvent.keyDown(dialog, { key: 'Escape' })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('«Настройки cookies» opens it again: focus on the first button, back after the choice', async () => {
    window.localStorage.setItem(CONSENT_KEY, serializeConsent(consentOf('necessary', NOW)))
    render(app())
    await act(async () => {})
    const settings = screen.getByRole('button', { name: 'Настройки cookies' })
    settings.focus()
    // detail 0: from the keyboard
    fireEvent.click(settings, { detail: 0 })
    const reject = await screen.findByRole('button', { name: 'Отказаться' })
    expect(document.activeElement).toBe(reject)
    fireEvent.click(reject)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(settings)
  })

  it('taking analytics back reloads the page', async () => {
    const reload = vi.fn()
    vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, reload })
    window.localStorage.setItem(CONSENT_KEY, serializeConsent(consentOf('accept', NOW)))
    render(app())
    await act(async () => {})
    fireEvent.click(screen.getByRole('button', { name: 'Настройки cookies' }), { detail: 1 })
    fireEvent.click(await screen.findByRole('button', { name: 'Только необходимые' }))
    expect(reload).toHaveBeenCalledOnce()
  })

  it('without localStorage: shown, the choice lives in memory', async () => {
    useStorage(true)
    render(app())
    fireEvent.click(await screen.findByRole('button', { name: 'Только необходимые' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
