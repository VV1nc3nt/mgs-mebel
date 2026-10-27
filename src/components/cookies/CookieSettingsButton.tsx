'use client'

import type { MouseEvent } from 'react'

import { reopenConsent } from '@/lib/cookieConsent'

/** «Настройки cookies» of the footer: shows the cookie notice again. */
export function CookieSettingsButton({ className }: { className?: string }) {
  const onClick = (event: MouseEvent<HTMLButtonElement>) =>
    // detail 0: Enter / Space — the focus goes to the notice
    reopenConsent({ keyboard: event.detail === 0, from: event.currentTarget })

  return (
    <button type="button" onClick={onClick} className={className}>
      Настройки cookies
    </button>
  )
}
