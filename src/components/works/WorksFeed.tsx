'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, type MouseEvent } from 'react'

import { SegmentFilter, type SegmentItem } from '@/components/ui/SegmentFilter'
import { useProjectViewer } from '@/hooks/useProjectViewer'
import { useSegmentFilter } from '@/hooks/useSegmentFilter'
import { cn } from '@/lib/cn'
import {
  ALL_WORKS,
  FEED_PRELOAD_MARGIN,
  FEED_PRELOAD_PX,
  WORKS_PAGE_SIZE,
  worksCount,
  type WorksCounts,
  type WorksFeedFilter,
} from '@/lib/works'
import { slugFromPath, WORKS_PATH } from '@/lib/viewer'
import { WorkCard } from './WorkCard'
import { useWorksFeed } from './WorksFeedProvider'

type Props = {
  /** «все» and the filters that have works. */
  chips: readonly SegmentItem<WorksFeedFilter>[]
  counts: WorksCounts
  /** The first row loads with priority (LCP); not under an open viewer. */
  priority?: boolean
}

// One row of skeletons while the next page loads: 3 / 4 / 6 columns
const ROW_SKELETONS = ['', '', '', 'hidden md:block', 'hidden xl:block', 'hidden xl:block']
// The first page of another filter: a whole page in place of the list
const PAGE_SKELETONS = Array.from({ length: WORKS_PAGE_SIZE }, () => '')
// Cards of the first row on every width: the LCP image is among them
const PRIORITY_CARDS = 3

/** Plain left click: a modified one (new tab, window, download) stays a link. */
const plainClick = (event: MouseEvent) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey

/**
 * «Наши работы» (README §6.4): sticky filter bar with the counter and the infinite grid of works.
 * The filter is in `?category=`, so the server renders the first page of it; another filter
 * starts the list over, the next page loads when the end of the grid comes near. A card opens
 * the project viewer over the list. State — WorksFeedProvider around it (WorksView).
 */
export function WorksFeed({ chips, counts, priority = true }: Props) {
  const viewer = useProjectViewer()
  // On /works/<slug> (viewer open) the URL has no filter: the list keeps its own
  const frozen = usePathname() !== WORKS_PATH
  const { value, select, sentinelRef, barRef } = useSegmentFilter({
    param: 'category',
    values: chips.map((chip) => chip.value),
    fallback: ALL_WORKS,
    frozen,
  })
  const feed = useWorksFeed()
  const { filter, items, hasMore, loading, failed, generation, loadMore, reset } = feed
  const endRef = useRef<HTMLDivElement>(null)

  // Another filter after hydration: the list starts over. The server rendered the filter of the
  // URL, so there is no request on mount.
  useEffect(() => {
    if (value !== filter) reset(value)
  }, [value, filter, reset])

  const switching = value !== filter || loading === 'reset'

  // The next page when the end of the grid is near. After every load the end is checked again:
  // the observer only reports changes, and a tall screen may still show the end.
  useEffect(() => {
    const end = endRef.current
    if (!end || !hasMore || loading || switching) return
    const near = () => end.getBoundingClientRect().top < window.innerHeight + FEED_PRELOAD_PX
    if (!failed && near()) {
      loadMore()
      return
    }
    // After a failed load the observer's first report is the current state, not a scroll
    let skip = failed
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !skip) loadMore()
        skip = false
      },
      { rootMargin: FEED_PRELOAD_MARGIN },
    )
    observer.observe(end)
    return () => observer.disconnect()
  }, [items.length, hasMore, loading, failed, switching, loadMore])

  const skeletons = switching ? PAGE_SKELETONS : loading === 'more' ? ROW_SKELETONS : []

  // A card opens the viewer without leaving the list (its link works without JS and in a new tab)
  const onCardClick = (event: MouseEvent<HTMLUListElement>) => {
    if (!plainClick(event) || !(event.target instanceof Element)) return
    const link = event.target.closest('a')
    const slug = link && slugFromPath(link.getAttribute('href') ?? '')
    if (!slug) return
    event.preventDefault()
    viewer.open(slug)
  }

  return (
    <div className="mt-2">
      <div ref={sentinelRef} aria-hidden="true" />
      <SegmentFilter
        ref={barRef}
        items={chips}
        value={value}
        onChange={select}
        label="Категории работ"
        sticky
        count={worksCount(counts[value], value)}
      />
      {/* Clicks of the card links (keyboard Enter too) are caught on the list, before next/link */}
      <ul
        data-works-feed=""
        onClickCapture={onCardClick}
        aria-busy={loading ? true : undefined}
        className="page-container grid grid-cols-3 gap-1.5 pt-3.5 md:grid-cols-4 md:gap-2 xl:grid-cols-6 xl:gap-2.5"
      >
        {!switching &&
          items.map((work, i) => (
            <li key={work.id}>
              <WorkCard
                work={work}
                variant="feed"
                priority={priority && generation === 0 && i < PRIORITY_CARDS}
              />
            </li>
          ))}
        {skeletons.map((visibility, i) => (
          <li
            key={`skeleton-${i}`}
            aria-hidden="true"
            data-skeleton=""
            className={cn('aspect-9/16 skeleton-pulse rounded-thumb bg-surface', visibility)}
          />
        ))}
      </ul>
      <div ref={endRef} aria-hidden="true" />
      {!hasMore && !switching && items.length > 0 && (
        <p className="page-container pt-8 text-center text-body-xs text-text-4">
          Вы посмотрели все работы
        </p>
      )}
    </div>
  )
}
