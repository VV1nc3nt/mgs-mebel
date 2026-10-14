'use client'

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { loadProjects } from '@/app/(frontend)/works/actions'
import { appendWorks, type FeedWork, type WorksFeedFilter } from '@/lib/works'

export type WorksFeedState = {
  /** Filter of the loaded list. */
  filter: WorksFeedFilter
  /** Loaded cards in feed order, without duplicates. */
  items: FeedWork[]
  /** More pages after the loaded ones. */
  hasMore: boolean
  /** `reset` — the first page of a new filter, `more` — the next page; null — idle. */
  loading: 'reset' | 'more' | null
  /** The last request failed: no automatic retry until `loadMore` is called again. */
  failed: boolean
  /** Number of filter changes: 0 while the list is the one rendered on the server. */
  generation: number
}

export type WorksFeed = WorksFeedState & {
  /** Next page of the current filter; no-op while loading or at the end. */
  loadMore: () => void
  /** The list from the beginning for another filter. */
  reset: (filter: WorksFeedFilter) => void
}

const WorksFeedContext = createContext<WorksFeed | null>(null)

type Props = {
  /** First page rendered on the server. */
  initial: { filter: WorksFeedFilter; items: FeedWork[]; hasMore: boolean }
  children: ReactNode
}

/**
 * State of the works feed: the loaded list, its filter and paging. Pages come from the
 * `loadProjects` Server Action; a response to a request that is no longer the latest (another
 * filter, a newer page) is dropped. The list is also what the project viewer pages through.
 */
export function WorksFeedProvider({ initial, children }: Props) {
  const [state, setState] = useState<WorksFeedState & { page: number }>({
    ...initial,
    page: 1,
    loading: null,
    failed: false,
    generation: 0,
  })
  // The latest state for the callbacks; set right away by them too, so a second call in the
  // same frame sees the request already started
  const stateRef = useRef(state)
  useLayoutEffect(() => {
    stateRef.current = state
  }, [state])
  const requestRef = useRef(0)

  const fetchPage = useCallback(async (filter: WorksFeedFilter, page: number) => {
    const id = ++requestRef.current
    try {
      const result = await loadProjects({ page, category: filter })
      if (id !== requestRef.current) return
      setState((s) => ({
        ...s,
        filter,
        page,
        items: page === 1 ? result.items : appendWorks(s.items, result.items),
        hasMore: result.hasMore,
        loading: null,
      }))
    } catch {
      if (id !== requestRef.current) return
      setState((s) => ({ ...s, loading: null, failed: true }))
    }
  }, [])

  const loadMore = useCallback(() => {
    const s = stateRef.current
    if (s.loading || !s.hasMore) return
    const next = { ...s, loading: 'more' as const, failed: false }
    stateRef.current = next
    setState(next)
    void fetchPage(s.filter, s.page + 1)
  }, [fetchPage])

  const reset = useCallback(
    (filter: WorksFeedFilter) => {
      const s = stateRef.current
      const next = {
        ...s,
        filter,
        items: [],
        page: 0,
        hasMore: true,
        loading: 'reset' as const,
        failed: false,
        generation: s.generation + 1,
      }
      stateRef.current = next
      setState(next)
      void fetchPage(filter, 1)
    },
    [fetchPage],
  )

  const value = useMemo<WorksFeed>(() => {
    const { page: _page, ...rest } = state
    return { ...rest, loadMore, reset }
  }, [state, loadMore, reset])

  return <WorksFeedContext value={value}>{children}</WorksFeedContext>
}

/** The works feed around the component (WorksFeed, the project viewer). */
export function useWorksFeed(): WorksFeed {
  const feed = useContext(WorksFeedContext)
  if (!feed) throw new Error('useWorksFeed must be used inside WorksFeedProvider')
  return feed
}
