import type { Media, News } from '@/payload-types'
import { formatDate } from './date'
import { asMedia } from './media'
import { newsTypeLabel, newsTypeOptions, type NewsType } from './newsTypes'

/** «все»: every news item, no parameter in the URL. */
export const ALL_NEWS = 'all'

export type NewsFilter = typeof ALL_NEWS | NewsType

/** Tabs of the news page in the order of the design (README §6.7). */
export const NEWS_TABS: readonly { value: NewsFilter; label: string }[] = [
  { value: ALL_NEWS, label: 'все' },
  { value: 'news', label: 'новости' },
  { value: 'new', label: 'новинки' },
]

/** Every value the list accepts. */
export const NEWS_FEED_FILTERS: readonly NewsFilter[] = [
  ALL_NEWS,
  ...newsTypeOptions.map(({ value }) => value),
]

/** News per page: 6 fills whole rows at 1, 2 and 3 columns. */
export const NEWS_PAGE_SIZE = 6

/** Hard upper bound of a requested page (input of the Server Action). */
export const NEWS_MAX_PAGE = 1000

/** Published news per filter: `all` and every type. */
export type NewsCounts = Record<NewsFilter, number>

/** Fields of a news item the list reads (`select` of the query). */
export type NewsRow = Pick<News, 'id' | 'title' | 'slug' | 'type' | 'date' | 'lead' | 'cover'>

/** Card of the news list: no body, no cover video (the list shows the cover only). */
export type NewsCardData = {
  id: number
  slug: string
  href: string
  title: string
  lead: string
  /** `dd.MM.yyyy`, empty without a date. */
  date: string
  type: NewsType
  /** Label of the type from the collection's select: «Новость» / «Новинка». */
  tag: string
  cover: Media | null
}

export function toNewsCard(row: NewsRow): NewsCardData {
  return {
    id: row.id,
    slug: row.slug,
    href: `/news/${row.slug}`,
    title: row.title,
    lead: row.lead?.trim() ?? '',
    date: formatDate(row.date),
    type: row.type,
    tag: newsTypeLabel(row.type) ?? '',
    cover: asMedia(row.cover),
  }
}

export type NewsPage = { items: NewsCardData[]; hasMore: boolean }

export const EMPTY_NEWS_PAGE: NewsPage = { items: [], hasMore: false }

/** Tabs with news: «все», then the types that have some; no news at all — no tabs. */
export const newsTabs = (counts: NewsCounts): { value: NewsFilter; label: string }[] =>
  counts[ALL_NEWS] > 0
    ? NEWS_TABS.filter(({ value }) => value === ALL_NEWS || counts[value] > 0)
    : []

/**
 * Valid page of the list, or null: an integer from 1 to NEWS_MAX_PAGE that starts within the
 * filter's news. A page past the end costs no query and no cache entry.
 */
export const newsPage = (page: unknown, total: number): number | null =>
  typeof page === 'number' &&
  Number.isInteger(page) &&
  page >= 1 &&
  page <= NEWS_MAX_PAGE &&
  (page - 1) * NEWS_PAGE_SIZE < total
    ? page
    : null

/** New cards of a page without the ones already in the list (by id). */
export const appendNews = (
  items: readonly NewsCardData[],
  next: readonly NewsCardData[],
): NewsCardData[] => {
  const ids = new Set(items.map((item) => item.id))
  return [...items, ...next.filter((item) => !ids.has(item.id))]
}
