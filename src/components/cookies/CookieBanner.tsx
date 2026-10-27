'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'

import { Button } from '@/components/ui/Button'
import { useCookieConsent } from '@/hooks/useCookieConsent'
import {
  consentOpener,
  isNoticeShown,
  saveConsent,
  type ConsentChoice,
} from '@/lib/cookieConsent'
import type { CookieTexts } from '@/lib/footer'

/**
 * Cookie notice (README of the footer §2, 2b): until the visitor chooses — and again from
 * «Настройки cookies» of the footer. Three choices, no settings screen. Not modal: the focus is
 * not trapped and Esc does not close it — the choice is required, the site stays usable.
 * Rendered only on the client (the choice is read after mount): no HTML, no layout shift.
 */
export function CookieBanner({ texts }: { texts: CookieTexts }) {
  const state = useCookieConsent()
  const shown = isNoticeShown(state)
  const rootRef = useRef<HTMLDivElement>(null)
  const firstRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (shown && state.focusNotice) firstRef.current?.focus()
  }, [shown, state.focusNotice])

  if (!shown) return null

  const choose = (choice: ConsentChoice) => {
    const focusInside = rootRef.current?.contains(document.activeElement) ?? false
    const revoked = saveConsent(choice)
    // A loaded analytics script cannot be unloaded: the page starts again without it
    if (revoked) {
      window.location.reload()
      return
    }
    if (focusInside) {
      const opener = consentOpener()
      if (opener) opener.focus()
      else document.getElementById('content')?.focus({ preventScroll: true })
    }
  }

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-label="Cookies"
      className="cookie-banner z-cookie flex flex-col gap-3 rounded-media border border-border-strong bg-surface p-4 shadow-cookie xl:flex-row xl:items-center xl:gap-6 xl:rounded-footer xl:py-3 xl:pr-3 xl:pl-7"
    >
      <p className="min-w-0 flex-1 text-body-xs text-pretty text-text-2">
        <strong className="font-bold text-text">{texts.lead}</strong> {texts.text}
        {texts.more && (
          <>
            {' '}
            <Link
              href={texts.more.href}
              prefetch={false}
              className="text-text-3 underline transition-colors hover:text-text"
            >
              {texts.more.label}
            </Link>
          </>
        )}
      </p>
      <div className="grid grid-cols-2 gap-2 xl:flex xl:shrink-0">
        <Button ref={firstRef} variant="outline" size={44} onClick={() => choose('reject')}>
          {texts.reject}
        </Button>
        <Button variant="outline" size={44} onClick={() => choose('necessary')}>
          {texts.necessary}
        </Button>
        <Button size={44} className="col-span-full" onClick={() => choose('accept')}>
          {texts.accept}
        </Button>
      </div>
    </div>
  )
}
