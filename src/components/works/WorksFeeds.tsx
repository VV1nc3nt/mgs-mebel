'use client'

import { useCallback, useMemo, useRef } from 'react'

import { loadWorkFeed } from '@/app/(frontend)/works/actions'
import { PageHeading } from '@/components/app/PageHeading'
import { FeedChips } from '@/components/ui/FeedChips'
import { useFeedSwitch } from '@/hooks/useFeedSwitch'
import { useFeedWave } from '@/hooks/useFeedWave'
import { useSegmentFilter } from '@/hooks/useSegmentFilter'
import { useWorkView, type InitialView } from '@/hooks/useWorkView'
import type { Messenger } from '@/lib/chrome'
import { worksCount, type WorkCounts, type WorkTile } from '@/lib/works'
import type { WorkFeed } from '@/lib/workTypes'
import { typeFeedHref } from '@/lib/workView'
import { WorkViewContext, type WorkViewApi } from './WorkViewContext'
import { WorkViewer } from './WorkViewer'
import { WorksGrid } from './WorksGrid'

type Props = {
  label?: string | null
  title?: string | null
  /** Feeds that have tiles, in the design's order. */
  chips: readonly { value: WorkFeed; label: string }[]
  counts: WorkCounts
  /** «Комплекс», or the first chip when it has no projects. */
  fallback: WorkFeed
  /** The feed in the URL, rendered on the server. */
  initial: { feed: WorkFeed; tiles: WorkTile[] }
  /** Tiles whose images are preloaded (the first row). */
  priority: number
  /** The item of `?item=`, rendered open on the server; null — not visible. */
  initialView: InitialView | null
  /** «Цена актуальна на …» of the view's panel. */
  priceDate: string | null
  /** The view's CTA: no messengers — no button. */
  messengers: Messenger[]
}

/**
 * Heading with the counter, the feed chips and the masonry of «Наши работы» (design: works v2 §2).
 * The feed is in `?category=` (replaceState), so the server renders it; a chip changes the feed in
 * place: the tiles of a feed come through the `loadWorkFeed` Server Action once and stay in memory.
 * The change is a wave: the old tiles fade out, the new ones in the viewport rise one by one, each
 * when its image is ready (at most --motion-feed-wait after its turn). Reduced motion — at once.
 */
export function WorksFeeds({
  label,
  title,
  chips,
  counts,
  fallback,
  initial,
  priority,
  initialView,
  priceDate,
  messengers,
}: Props) {
  const { value, select } = useSegmentFilter({
    param: 'category',
    values: chips.map((chip) => chip.value),
    fallback,
  })
  const view = useWorkView(initialView)
  const viewItem = view.item
  const listRef = useRef<HTMLUListElement>(null)
  const { shown, leaving, show } = useFeedSwitch<WorkFeed, WorkTile[]>({
    initial: { key: initial.feed, value: initial.tiles },
    // The feed of the URL; under the view of an item — its type (back / forward to an item of
    // another feed, a direct visit before the URL has the category)
    want: viewItem?.type ?? value,
    load: loadWorkFeed,
    onFail: select,
  })
  useFeedWave(listRef, shown.generation)

  // Another feed: the chip and the URL at once; the old tiles fade out while the new ones load
  const choose = (feed: WorkFeed) => {
    if (feed === value) return
    select(feed)
    show(feed)
  }

  const api = useMemo<WorkViewApi>(
    () => ({ open: view.open, intent: view.intent, cancelIntent: view.cancelIntent }),
    [view.open, view.intent, view.cancelIntent],
  )
  // Closed: the focus back on the tile of the item (also after a direct visit), in the next frame —
  // once the feed is no longer inert and invisible
  const returnFocus = useCallback((id: number) => {
    requestAnimationFrame(() => {
      const link = listRef.current?.querySelector<HTMLElement>(`a[href$="item=${id}"]`)
      link?.focus({ preventScroll: true })
    })
  }, [])

  return (
    <WorkViewContext.Provider value={api}>
      {/* Under the view: inert (out of the tab order and of screen readers), then invisible */}
      <div
        inert={viewItem !== null}
        data-covered={viewItem ? '' : undefined}
        className="work-view-under"
      >
        <PageHeading
          label={label}
          title={title}
          aside={
            <p aria-live="polite" className="pb-1.5 text-body font-semibold text-text-4">
              {worksCount(counts[value], value)}
            </p>
          }
        />
        <FeedChips
          label="Категории работ"
          items={chips}
          value={value}
          counts={counts}
          onChoose={choose}
        />
        <WorksGrid
          tiles={shown.value}
          leaving={leaving}
          // Only the list rendered on the server: a later feed loads on a click, not for the LCP
          priority={shown.generation === 0 ? priority : 0}
          listRef={listRef}
        />
      </div>
      {viewItem && (
        <WorkViewer
          // A new item — a new view (its own start frame and state)
          key={viewItem.id}
          frames={viewItem.frames}
          owners={{ [viewItem.id]: viewItem }}
          start={view.photo}
          onIndex={view.setPhoto}
          onClose={view.close}
          closeHref={typeFeedHref(viewItem.type)}
          onClosed={() => returnFocus(viewItem.id)}
          priceDate={priceDate}
          messengers={messengers}
        />
      )}
    </WorkViewContext.Provider>
  )
}
