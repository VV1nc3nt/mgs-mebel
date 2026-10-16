'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { loadNews } from '@/app/(frontend)/news/actions'
import { Button } from '@/components/ui/Button'
import { FilterChip } from '@/components/ui/FilterChip'
import { useSegmentFilter } from '@/hooks/useSegmentFilter'
import {
  ALL_NEWS,
  NEWS_PAGE_SIZE,
  appendNews,
  type NewsCardData,
  type NewsCounts,
  type NewsFilter,
} from '@/lib/news'
import { NewsCard } from './NewsCard'

type Props = {
  /** «все» and the types that have news. */
  tabs: readonly { value: NewsFilter; label: string }[]
  counts: NewsCounts
  /** The first page of the tab in the URL, rendered on the server. */
  initial: { filter: NewsFilter; items: NewsCardData[]; hasMore: boolean }
}

type State = {
  /** Tab of the loaded list. */
  filter: NewsFilter
  /** Loaded cards in list order, without duplicates. */
  items: NewsCardData[]
  /** Last loaded page; 0 — the first page of the tab has not come yet. */
  page: number
  /** More pages after the loaded ones (or the first page still to load). */
  hasMore: boolean
  /** `reset` — the first page of another tab, `more` — the next page; null — idle. */
  loading: 'reset' | 'more' | null
  /** Number of tab changes: 0 while the list is the one rendered on the server. */
  generation: number
}

/**
 * Tabs, the news grid and «Показать ещё» (README §6.7). The tab is in `?type=`, so the server
 * renders its first page; another tab starts the list over, the button loads the next page
 * through the `loadNews` Server Action. A response to a request that is no longer the latest
 * (another tab, a newer page) is dropped. A failed load keeps the button: a click retries.
 */
export function NewsFeed({ tabs, counts, initial }: Props) {
  const { value, select } = useSegmentFilter({
    param: 'type',
    values: tabs.map((tab) => tab.value),
    fallback: ALL_NEWS,
  })
  const [state, setState] = useState<State>({ ...initial, page: 1, loading: null, generation: 0 })
  // The latest state for the callbacks; set right away by them too, so a second click in the
  // same frame sees the request already started
  const stateRef = useRef(state)
  useLayoutEffect(() => {
    stateRef.current = state
  }, [state])
  const requestRef = useRef(0)
  const listRef = useRef<HTMLUListElement>(null)
  // Index of the first card of a page being loaded by the button: focused once it is rendered
  const focusFrom = useRef<number | null>(null)

  const fetchPage = useCallback(async (filter: NewsFilter, page: number) => {
    const id = ++requestRef.current
    try {
      const result = await loadNews({ page, type: filter })
      if (id !== requestRef.current) return
      setState((s) => ({
        ...s,
        page,
        items: page === 1 ? result.items : appendNews(s.items, result.items),
        hasMore: result.hasMore,
        loading: null,
      }))
    } catch {
      if (id !== requestRef.current) return
      // The button stays (or appears in place of the skeletons): a click loads the page again
      focusFrom.current = null
      setState((s) => ({ ...s, hasMore: true, loading: null }))
    }
  }, [])

  const update = (next: State) => {
    stateRef.current = next
    setState(next)
  }

  const loadMore = () => {
    const s = stateRef.current
    if (s.loading || !s.hasMore) return
    // After a failed first page of a tab the button loads that page
    if (s.page > 0) focusFrom.current = s.items.length
    update({ ...s, loading: s.page > 0 ? 'more' : 'reset' })
    void fetchPage(s.filter, s.page + 1)
  }

  const reset = useCallback(
    (filter: NewsFilter) => {
      const s = stateRef.current
      focusFrom.current = null
      const next: State = {
        filter,
        items: [],
        page: 0,
        hasMore: true,
        loading: 'reset',
        generation: s.generation + 1,
      }
      stateRef.current = next
      setState(next)
      void fetchPage(filter, 1)
    },
    [fetchPage],
  )

  // Another tab after hydration: the list starts over. The server rendered the tab of the URL,
  // so there is no request on mount.
  useEffect(() => {
    if (value !== state.filter) reset(value)
  }, [value, state.filter, reset])

  // The first card of the page just loaded gets the focus (the button may be gone: last page)
  useLayoutEffect(() => {
    const from = focusFrom.current
    if (from === null || state.loading || state.items.length <= from) return
    focusFrom.current = null
    listRef.current?.querySelectorAll<HTMLElement>(':scope > li > a')[from]?.focus()
  }, [state.items, state.loading])

  const { filter, items, hasMore, loading, generation } = state
  const switching = value !== filter || loading === 'reset'
  // As many skeletons as cards are coming: the grid does not jump when they arrive
  const skeletons = switching
    ? Math.min(NEWS_PAGE_SIZE, counts[value])
    : loading === 'more'
      ? Math.max(0, Math.min(NEWS_PAGE_SIZE, counts[filter] - items.length))
      : 0

  return (
    <div className="mt-6">
      {/* Vertical padding keeps the tabs' 44 hit area inside the scroller */}
      <div
        role="group"
        aria-label="Тип новостей"
        className="page-container no-scrollbar flex gap-2 overflow-x-auto py-0.5"
      >
        {tabs.map((tab) => (
          <FilterChip
            key={tab.value}
            selected={tab.value === value}
            count={counts[tab.value]}
            onClick={() => select(tab.value)}
          >
            {tab.label}
          </FilterChip>
        ))}
      </div>
      <ul
        ref={listRef}
        data-news-list=""
        aria-busy={loading ? true : undefined}
        className="page-container grid grid-cols-1 gap-3 pt-6 md:grid-cols-2 xl:grid-cols-3"
      >
        {!switching &&
          items.map((item, i) => (
            <li key={item.id}>
              <NewsCard item={item} priority={generation === 0 && i === 0} />
            </li>
          ))}
        {Array.from({ length: skeletons }, (_, i) => (
          <li
            key={`skeleton-${i}`}
            aria-hidden="true"
            data-skeleton=""
            className="h-news-tile skeleton-pulse rounded-media bg-surface"
          />
        ))}
      </ul>
      {hasMore && !switching && (
        <div className="page-container flex justify-center pt-6">
          <Button variant="outline" size={52} width="mobile-full" onClick={loadMore}>
            Показать ещё
          </Button>
        </div>
      )}
    </div>
  )
}
