'use client'

import { useRouter } from 'next/navigation'
import type { MouseEvent } from 'react'

import { Action } from '@/components/ui/Action'
import { HIT_AREA_Y } from '@/components/ui/hitArea'
import { cn } from '@/lib/cn'
import { previousRoute } from '@/lib/routeHistory'
import { ITEM_PARAM, PHOTO_PARAM, WORKS_PATH } from '@/lib/workView'

/** Plain left click: a modified one (new tab, window) stays a link. */
const plainClick = (event: MouseEvent) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey

/**
 * «← Все работы» of a project page (works v2 §3.1): came from the feed — back to it (the feed and
 * its scroll as they were); came from the view of an item over the feed («Весь проект →») — that
 * feed without the view (back would open the view again); else, and without script, a link.
 */
export function BackToWorks() {
  const router = useRouter()
  const onClick = (event: MouseEvent) => {
    const from = previousRoute()
    if (!plainClick(event) || from?.pathname !== WORKS_PATH) return
    event.preventDefault()
    const params = new URLSearchParams(from.search)
    if (!params.has(ITEM_PARAM)) return window.history.back()
    params.delete(ITEM_PARAM)
    params.delete(PHOTO_PARAM)
    const query = params.toString()
    router.push(query ? `${WORKS_PATH}?${query}` : WORKS_PATH)
  }
  return (
    <Action
      href={WORKS_PATH}
      onClick={onClick}
      className={cn(
        'relative flex min-h-label w-fit items-center gap-2.5 text-label text-accent uppercase',
        HIT_AREA_Y,
      )}
    >
      <span aria-hidden="true" className="h-px w-6 shrink-0 bg-accent" />
      <span>
        <span aria-hidden="true">← </span>Все работы
      </span>
    </Action>
  )
}
