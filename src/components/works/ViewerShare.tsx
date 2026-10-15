'use client'

import { Share2 } from 'lucide-react'
import { useEffect, useRef, useState, type MouseEventHandler } from 'react'

import { clipboardMethod, shareMethod, shareRefusal, type ShareData } from '@/lib/share'

/** Microcopy of the share status. */
export const SHARE_COPIED = 'Ссылка скопирована'

/** «Поделиться» of the viewer's rail (README §6.4): the icon on the glass, the label under it. */
export function ShareButton({ onClick }: { onClick?: MouseEventHandler<HTMLButtonElement> }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 flex-col items-center gap-1 text-caption-s text-text"
    >
      <span
        aria-hidden="true"
        className="flex size-9 items-center justify-center rounded-full glass [&_svg]:size-4.5"
      >
        <Share2 />
      </span>
      Поделиться
    </button>
  )
}

export type ShareStatusValue = { kind: 'copied' } | { kind: 'link'; url: string }

/**
 * The outcome of «Поделиться», announced politely: «Ссылка скопирована», or the link itself to
 * copy by hand when the clipboard is not available. Always in the DOM (a live region must exist
 * before its text changes); hidden, it keeps the last text while it fades out.
 */
export function ShareStatus({ value, shown }: { value: ShareStatusValue | null; shown: boolean }) {
  return (
    <p
      role="status"
      data-shown={shown && value ? '' : undefined}
      className="share-status max-w-xs min-w-0 rounded-2xl glass px-3 py-2 text-body-xs text-text"
    >
      {value?.kind === 'copied' && SHARE_COPIED}
      {value?.kind === 'link' && <span className="break-all select-all">{value.url}</span>}
    </p>
  )
}

/** A duration custom property of the root (`2s`, `200ms`), in ms. */
const rootTime = (name: string): number => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return (value.endsWith('ms') ? parseFloat(value) : parseFloat(value) * 1000) || 0
}

/**
 * «Поделиться» and its status (README §6.4): the share sheet with the title and the absolute link
 * (no text); without one, or when it fails, the link goes to the clipboard and «Ссылка
 * скопирована» shows for --share-status-time; without the clipboard the link itself shows until
 * the next press. Closing the sheet is not a failure. Keyed by the project: another project starts
 * without a status.
 */
export function ViewerShare({ title, url }: ShareData) {
  const [status, setStatus] = useState<ShareStatusValue | null>(null)
  const [shown, setShown] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const show = (value: ShareStatusValue) => {
    window.clearTimeout(timer.current)
    setStatus(value)
    setShown(true)
    // The link stays until the next press: it is there to be copied by hand
    if (value.kind === 'copied') {
      timer.current = window.setTimeout(() => setShown(false), rootTime('--share-status-time'))
    }
  }

  const copy = () => {
    if (clipboardMethod(navigator) === 'text') {
      show({ kind: 'link', url })
      return
    }
    navigator.clipboard
      .writeText(url)
      .then(() => show({ kind: 'copied' }))
      .catch(() => show({ kind: 'link', url }))
  }

  const onClick = () => {
    const data = { title, url }
    window.clearTimeout(timer.current)
    setShown(false)
    if (shareMethod(navigator, data) !== 'share') {
      copy()
      return
    }
    navigator.share(data).catch((error: unknown) => {
      if (shareRefusal(error) === 'fallback') copy()
    })
  }

  return (
    <>
      <ShareStatus value={status} shown={shown} />
      <ShareButton onClick={onClick} />
    </>
  )
}
