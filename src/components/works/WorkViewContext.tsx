'use client'

import { createContext, useContext, type MouseEvent } from 'react'

import { Action, type ActionLinkProps } from '@/components/ui/Action'
import { parseItemId } from '@/lib/workView'

/** The view of an item around the feed: tiles open it in place and fetch its data ahead. */
export type WorkViewApi = {
  /** `from` — the link clicked (the focus goes back to it on close). */
  open: (id: number, href: string, from?: HTMLElement) => void
  intent: (id: number) => void
  cancelIntent: () => void
}

export const WorkViewContext = createContext<WorkViewApi | null>(null)

/** Plain left click: a modified one (new tab, window) stays a link. */
const plainClick = (event: MouseEvent) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey

const itemOf = (href: string): number | null =>
  parseItemId(new URL(href, 'http://local').searchParams.get('item'))

/**
 * Link of an item tile to its view (`itemViewHref`): a plain click opens the view in place,
 * hover or touch fetches its data ahead; a new tab, no script or no view around (the home page)
 * — the link itself. Same props as Action's link (MediaCard renders it in its place).
 */
export function WorkViewLink({
  href,
  onClick,
  onPointerEnter,
  onPointerLeave,
  onTouchStart,
  ...rest
}: ActionLinkProps) {
  const view = useContext(WorkViewContext)
  const id = itemOf(href)
  if (!view || id === null) return <Action href={href} onClick={onClick} {...rest} />
  return (
    <Action
      href={href}
      {...rest}
      onPointerEnter={(event) => {
        onPointerEnter?.(event)
        if (event.pointerType === 'mouse') view.intent(id)
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event)
        view.cancelIntent()
      }}
      onTouchStart={(event) => {
        onTouchStart?.(event)
        view.intent(id)
      }}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented || !plainClick(event)) return
        event.preventDefault()
        view.cancelIntent()
        view.open(id, href, event.currentTarget)
      }}
    />
  )
}
