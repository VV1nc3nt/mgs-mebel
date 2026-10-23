'use client'

import { ArrowUpRight } from 'lucide-react'
import { useCallback, useMemo, useRef, type ReactNode } from 'react'

import { useWorkView, type InitialView } from '@/hooks/useWorkView'
import type { Messenger } from '@/lib/chrome'
import type { GalleryTile, ProjectZone } from '@/lib/workProject'
import {
  frameAt,
  framePlace,
  parseItemId,
  projectHrefOf,
  type ViewerFrame,
  type ViewerItem,
} from '@/lib/workView'
import { WorkViewContext, WorkViewLink, type WorkViewApi } from './WorkViewContext'
import { WorkViewer } from './WorkViewer'
import { WorksGrid } from './WorksGrid'

type Props = {
  slug: string
  /** Back link, H1 and meta (server). */
  heading: ReactNode
  zones: ProjectZone[]
  tiles: GalleryTile[]
  /** Frames of the view: every frame of the project, item after item. */
  frames: ViewerFrame[]
  /** Visible items of the project by id: the panels, and the only items the address may open. */
  items: Record<number, ViewerItem>
  /** «О проекте» (server): < 768 under the gallery, from 768 over it. */
  about: ReactNode
  /** Content of the CTA tile (server); its place is in `tiles`. */
  cta: ReactNode
  /** Tiles whose image is preloaded (the first row). */
  priority: number
  /** The item of `?item=`, rendered open on the server; null — not of this project. */
  initialView: InitialView | null
  priceDate: string | null
  messengers: Messenger[]
}

const itemOf = (href: string): number | null =>
  parseItemId(new URL(href, 'http://local').searchParams.get('item'))

/**
 * The project page under its heading (works v2 §3.2–§3.4): zone chips, «О проекте», the masonry
 * of the frames with the CTA tile among them, and the view of the whole project over them — every frame item after
 * item, the panel of the current frame's item. A chip opens the view at the first frame of its
 * item, a tile at its frame; the address is `?item=&photo=` (pushState, then replaceState), the
 * data of every item is on the page.
 */
export function ProjectGallery({
  slug,
  heading,
  zones,
  tiles,
  frames,
  items,
  about,
  cta,
  priority,
  initialView,
  priceDate,
  messengers,
}: Props) {
  const view = useWorkView(initialView, { items })
  const viewItem = view.item
  const rootRef = useRef<HTMLDivElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  const { open, intent, cancelIntent, close, setFrame } = view
  const api = useMemo<WorkViewApi>(
    () => ({
      open: (id, href, from) => {
        openerRef.current = from ?? null
        open(id, href)
      },
      intent,
      cancelIntent,
    }),
    [open, intent, cancelIntent],
  )

  // Closed: the focus back on the chip or tile it was opened from; after a direct visit — on the
  // first tile of the item. In the next frame, once the page is no longer inert and invisible.
  const returnFocus = useCallback((id: number) => {
    requestAnimationFrame(() => {
      const opener = openerRef.current
      openerRef.current = null
      const tile = [
        ...(rootRef.current?.querySelectorAll<HTMLAnchorElement>('[data-works-grid] a[href]') ??
          []),
      ].find((link) => itemOf(link.href) === id)
      const target = opener?.isConnected ? opener : tile
      target?.focus({ preventScroll: true })
    })
  }, [])

  const onIndex = useCallback(
    (index: number) => {
      const place = framePlace(frames, index)
      if (place) setFrame(place.owner, place.photo)
    },
    [frames, setFrame],
  )

  return (
    <WorkViewContext.Provider value={api}>
      {/* Under the view: inert (out of the tab order and of screen readers), then invisible */}
      <div
        ref={rootRef}
        inert={viewItem !== null}
        data-covered={viewItem ? '' : undefined}
        className="work-view-under"
      >
        {heading}
        {/* Vertical padding keeps the chips' focus ring inside the scroller */}
        <ul className="page-container no-scrollbar flex gap-2 overflow-x-auto pt-6 pb-5 md:flex-wrap md:overflow-visible">
          {zones.map((zone) => (
            <li key={zone.id} className="shrink-0">
              <WorkViewLink
                href={zone.href}
                prefetch={false}
                className="inline-flex h-11 items-center gap-1.5 rounded-pill border border-border bg-surface pr-3.5 pl-4.5 text-button-s font-semibold whitespace-nowrap text-text transition-colors hover:bg-surface-3"
              >
                {zone.title}
                <span className="text-text-4">{zone.count}</span>
                <span
                  aria-hidden="true"
                  className="ml-1 flex size-5.5 items-center justify-center rounded-full bg-surface-3 text-accent"
                >
                  <ArrowUpRight className="size-3" />
                </span>
              </WorkViewLink>
            </li>
          ))}
        </ul>
        {/* One DOM order (about, gallery); below 768 «О проекте» stands under the gallery */}
        <div className="flex flex-col gap-3 md:gap-4">
          {about && <div className="order-2 empty:hidden md:order-none">{about}</div>}
          <div className="order-1">
            <WorksGrid tiles={tiles} priority={priority} cta={cta} />
          </div>
        </div>
      </div>
      {viewItem && (
        <WorkViewer
          // One view of the project: crossing into another item keeps it
          key="project"
          frames={frames}
          owners={items}
          start={Math.max(frameAt(frames, viewItem.id, view.photo), 0)}
          onIndex={onIndex}
          onClose={close}
          closeHref={projectHrefOf(slug)}
          onClosed={() => returnFocus(viewItem.id)}
          onProject={close}
          priceDate={priceDate}
          messengers={messengers}
        />
      )}
    </WorkViewContext.Provider>
  )
}
