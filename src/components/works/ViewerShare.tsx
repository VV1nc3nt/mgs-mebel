'use client'

import { Share2 } from 'lucide-react'
import type { MouseEventHandler } from 'react'

import { SHARE_COPIED, useShareStatus, type ShareStatusValue } from '@/hooks/useShareStatus'
import { shareMethod, shareRefusal, type ShareData } from '@/lib/share'

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

/**
 * «Поделиться» and its status (README §6.4): the share sheet with the title and the absolute link
 * (no text); without one, or when it fails, the link goes to the clipboard and «Ссылка
 * скопирована» shows for --share-status-time; without the clipboard the link itself shows until
 * the next press. Closing the sheet is not a failure. Keyed by the project: another project starts
 * without a status.
 */
export function ViewerShare({ title, url }: ShareData) {
  const { status, shown, hide, copy } = useShareStatus()

  const onClick = () => {
    const data = { title, url }
    hide()
    if (shareMethod(navigator, data) !== 'share') {
      copy(url)
      return
    }
    navigator.share(data).catch((error: unknown) => {
      if (shareRefusal(error) === 'fallback') copy(url)
    })
  }

  return (
    <>
      <ShareStatus value={status} shown={shown} />
      <ShareButton onClick={onClick} />
    </>
  )
}
