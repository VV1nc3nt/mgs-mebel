'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { clipboardMethod } from '@/lib/share'

/** Microcopy of the share status. */
export const SHARE_COPIED = 'Ссылка скопирована'

export type ShareStatusValue = { kind: 'copied' } | { kind: 'link'; url: string }

/** A duration custom property of the root (`2s`, `200ms`), in ms. */
export const rootTime = (name: string): number => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return (value.endsWith('ms') ? parseFloat(value) : parseFloat(value) * 1000) || 0
}

/**
 * The status of «Поделиться» of the article: «Ссылка скопирована» for
 * --share-status-time, or the link itself to copy by hand when the clipboard is not available —
 * kept until the next press. `hide` clears a shown status at the next press; `copy` writes the link
 * to the clipboard and shows the outcome.
 */
export function useShareStatus() {
  const [status, setStatus] = useState<ShareStatusValue | null>(null)
  const [shown, setShown] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const show = useCallback((value: ShareStatusValue) => {
    window.clearTimeout(timer.current)
    setStatus(value)
    setShown(true)
    // The link stays until the next press: it is there to be copied by hand
    if (value.kind === 'copied') {
      timer.current = window.setTimeout(() => setShown(false), rootTime('--share-status-time'))
    }
  }, [])

  const hide = useCallback(() => {
    window.clearTimeout(timer.current)
    setShown(false)
  }, [])

  const copy = useCallback(
    (url: string) => {
      if (clipboardMethod(navigator) === 'text') {
        show({ kind: 'link', url })
        return
      }
      navigator.clipboard
        .writeText(url)
        .then(() => show({ kind: 'copied' }))
        .catch(() => show({ kind: 'link', url }))
    },
    [show],
  )

  return { status, shown, hide, copy }
}
