'use client'

import { useLayoutEffect, useRef, useState } from 'react'

import { loadNews } from '@/app/(frontend)/news/actions'
import { Button } from '@/components/ui/Button'
import { FeedChips } from '@/components/ui/FeedChips'
import { useFeedSwitch } from '@/hooks/useFeedSwitch'
import { useFeedWave } from '@/hooks/useFeedWave'
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

/** The loaded list of a tab. */
type Feed = {
  /** Cards in list order, without duplicates. */
  items: NewsCardData[]
  /** Last loaded page. */
  page: number
  /** More pages after the loaded ones. */
  hasMore: boolean
}

const firstPage = async (filter: NewsFilter): Promise<Feed> => ({
  ...(await loadNews({ page: 1, type: filter })),
  page: 1,
})

/**
 * Tabs, the news grid and «Показать ещё» (README §6.7). The tab is in `?type=`, so the server
 * renders its first page. Another tab is a wave, as on the works page: the old cards fade out,
 * the first page of the tab comes through the `loadNews` Server Action; a tab keeps its whole
 * loaded list, so going back to it makes no request. The button loads the next page; a response
 * to a request that is no longer the latest (another tab, a newer page) is dropped, a failed one
 * keeps the button: a click retries. A failed tab change keeps the tab and the list as they were.
 */
export function NewsFeed({ tabs, counts, initial }: Props) {
  const { value, select } = useSegmentFilter({
    param: 'type',
    values: tabs.map((tab) => tab.value),
    fallback: ALL_NEWS,
  })
  const listRef = useRef<HTMLUListElement>(null)
  const { shown, leaving, show, update, requestedKey } = useFeedSwitch<NewsFilter, Feed>({
    initial: {
      key: initial.filter,
      value: { items: initial.items, page: 1, hasMore: initial.hasMore },
    },
    want: value,
    load: firstPage,
    onFail: select,
  })
  // «Показать ещё» adds cards to the shown list: no new generation, no wave
  useFeedWave(listRef, shown.generation)
  // The tab whose next page is loading; set right away, so a second click in the same frame sees it
  const [more, setMore] = useState<NewsFilter | null>(null)
  const moreRef = useRef<NewsFilter | null>(null)
  const requestRef = useRef(0)
  // Index of the first card of a page being loaded by the button: focused once it is rendered
  const focusFrom = useRef<number | null>(null)

  const setLoading = (filter: NewsFilter | null) => {
    moreRef.current = filter
    setMore(filter)
  }

  const choose = (filter: NewsFilter) => {
    if (filter === value) return
    select(filter)
    show(filter)
  }

  const loadMore = async () => {
    const { key, value: feed } = shown
    // The page of this tab is loading already, or another tab is on its way
    if (moreRef.current === key || !feed.hasMore || requestedKey() !== key) return
    const id = ++requestRef.current
    focusFrom.current = feed.items.length
    setLoading(key)
    try {
      const result = await loadNews({ page: feed.page + 1, type: key })
      if (id !== requestRef.current) return
      setLoading(null)
      // Another tab meanwhile: the late page is dropped
      if (requestedKey() !== key) {
        focusFrom.current = null
        return
      }
      update(key, (f) => ({
        items: appendNews(f.items, result.items),
        page: f.page + 1,
        hasMore: result.hasMore,
      }))
    } catch {
      if (id !== requestRef.current) return
      // The button stays: a click loads the page again
      focusFrom.current = null
      setLoading(null)
    }
  }

  const { items, hasMore } = shown.value
  const loading = more === shown.key

  // The first card of the page just loaded gets the focus (the button may be gone: last page)
  useLayoutEffect(() => {
    const from = focusFrom.current
    if (from === null || items.length <= from) return
    focusFrom.current = null
    listRef.current?.querySelectorAll<HTMLElement>(':scope > li > a')[from]?.focus()
  }, [items])

  // As many skeletons as cards are coming: the grid does not jump when they arrive
  const skeletons = loading
    ? Math.max(0, Math.min(NEWS_PAGE_SIZE, counts[shown.key] - items.length))
    : 0

  return (
    <>
      <FeedChips
        label="Тип новостей"
        items={tabs}
        value={value}
        counts={counts}
        onChoose={choose}
      />
      <ul
        ref={listRef}
        data-news-list=""
        data-wave={leaving ? 'out' : undefined}
        aria-busy={loading ? true : undefined}
        className="page-container grid feed-wave grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
      >
        {items.map((item, i) => (
          <li key={item.id}>
            <NewsCard item={item} priority={shown.generation === 0 && i === 0} />
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
      {hasMore && (
        <div className="page-container flex justify-center pt-6">
          <Button variant="outline" size={52} width="mobile-full" onClick={loadMore}>
            Показать ещё
          </Button>
        </div>
      )}
    </>
  )
}
