'use client'

import { useLayoutEffect, useRef, useState } from 'react'

import { loadWorkFeed } from '@/app/(frontend)/works/actions'
import { PageHeading } from '@/components/app/PageHeading'
import { FilterChip } from '@/components/ui/FilterChip'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useSegmentFilter } from '@/hooks/useSegmentFilter'
import { rootTime } from '@/hooks/useShareStatus'
import { worksCount, type WorkCounts, type WorkTile } from '@/lib/works'
import type { WorkFeed } from '@/lib/workTypes'
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
}

type Shown = { feed: WorkFeed; tiles: WorkTile[]; generation: number }

/** A tile with any part inside the viewport. */
const inViewport = (el: Element) => {
  const { top, bottom } = el.getBoundingClientRect()
  return bottom > 0 && top < window.innerHeight
}

/**
 * Heading with the counter, the feed chips and the masonry of «Наши работы» (design: works v2 §2).
 * The feed is in `?category=` (replaceState), so the server renders it; a chip changes the feed in
 * place: the tiles of a feed come through the `loadWorkFeed` Server Action once and stay in memory.
 * The change is a wave: the old tiles fade out, the new ones in the viewport rise one by one, each
 * when its image is ready (at most --motion-works-wait after its turn). Reduced motion — at once.
 */
export function WorksFeeds({ label, title, chips, counts, fallback, initial, priority }: Props) {
  const { value, select } = useSegmentFilter({
    param: 'category',
    values: chips.map((chip) => chip.value),
    fallback,
  })
  const reducedMotion = useReducedMotion()
  const [shown, setShown] = useState<Shown>({ ...initial, generation: 0 })
  const [leaving, setLeaving] = useState(false)
  const cache = useRef(new Map<WorkFeed, WorkTile[]>([[initial.feed, initial.tiles]]))
  const requestRef = useRef(0)
  const listRef = useRef<HTMLUListElement>(null)
  // `select` of the latest render: the one of a click knows only the value before it
  const selectRef = useRef(select)
  useLayoutEffect(() => {
    selectRef.current = select
  }, [select])

  // Another feed: the chip and the URL at once; the old tiles fade out while the new ones load
  const choose = (feed: WorkFeed) => {
    if (feed === value) return
    select(feed)
    const id = ++requestRef.current
    if (feed === shown.feed) {
      // Back to the shown feed before the other one came: that request is dropped
      setLeaving(false)
      return
    }
    const cached = cache.current.get(feed)
    const tiles = cached ? Promise.resolve(cached) : loadWorkFeed(feed)
    const out = reducedMotion ? 0 : rootTime('--motion-works-out')
    if (out) setLeaving(true)
    const faded = new Promise((resolve) => window.setTimeout(resolve, out))
    Promise.all([tiles, faded])
      .then(([next]) => {
        if (id !== requestRef.current) return
        cache.current.set(feed, next)
        setLeaving(false)
        setShown((s) => ({ feed, tiles: next, generation: s.generation + 1 }))
      })
      .catch(() => {
        if (id !== requestRef.current) return
        // The feed stays as it was, and so does the chip
        setLeaving(false)
        selectRef.current(shown.feed)
      })
  }

  // New tiles in the viewport wait hidden (before the first paint) and rise in turn
  useLayoutEffect(() => {
    const list = listRef.current
    if (!shown.generation || !list || reducedMotion) return
    const stagger = rootTime('--motion-works-stagger')
    const wait = rootTime('--motion-works-wait')
    const timers: number[] = []
    const cleanups: (() => void)[] = []
    const visible = [...list.children].filter(inViewport) as HTMLElement[]
    visible.forEach((tile, i) => {
      tile.dataset.wave = 'wait'
      const rise = () => {
        if (tile.dataset.wave !== 'wait') return
        // Applied in the next frame, so the hidden state is painted and the transition runs
        timers.push(window.requestAnimationFrame(() => (tile.dataset.wave = 'in')))
      }
      timers.push(
        window.setTimeout(() => {
          const image = tile.querySelector('img')
          if (!image || image.complete) return rise()
          image.addEventListener('load', rise, { once: true })
          image.addEventListener('error', rise, { once: true })
          cleanups.push(() => {
            image.removeEventListener('load', rise)
            image.removeEventListener('error', rise)
          })
          timers.push(window.setTimeout(rise, wait))
        }, stagger * i),
      )
    })
    return () => {
      timers.forEach((t) => {
        window.clearTimeout(t)
        window.cancelAnimationFrame(t)
      })
      cleanups.forEach((fn) => fn())
      for (const tile of visible) delete tile.dataset.wave
    }
  }, [shown.generation, reducedMotion])

  return (
    <>
      <PageHeading
        label={label}
        title={title}
        aside={
          <p aria-live="polite" className="pb-1.5 text-body font-semibold text-text-4">
            {worksCount(counts[value], value)}
          </p>
        }
      />
      {/* Vertical padding keeps the chips' focus ring inside the scroller */}
      <div
        role="group"
        aria-label="Категории работ"
        className="page-container no-scrollbar flex gap-2 overflow-x-auto pt-6 pb-5 md:flex-wrap md:overflow-visible"
      >
        {chips.map((chip) => (
          <FilterChip
            key={chip.value}
            size={44}
            selected={chip.value === value}
            count={counts[chip.value]}
            onClick={() => choose(chip.value)}
          >
            {chip.label}
          </FilterChip>
        ))}
      </div>
      <WorksGrid
        tiles={shown.tiles}
        leaving={leaving}
        // Only the list rendered on the server: a later feed loads on a click, not for the LCP
        priority={shown.generation === 0 ? priority : 0}
        listRef={listRef}
      />
    </>
  )
}
