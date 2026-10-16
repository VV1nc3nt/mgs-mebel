'use server'

import { ALL_NEWS, EMPTY_NEWS_PAGE, NEWS_FEED_FILTERS, newsPage, type NewsPage } from '@/lib/news'
import { getNewsCounts, getNewsPage } from '@/lib/queries'
import { parseFilter } from '@/lib/segmentFilter'

/**
 * Page of the news list («Показать ещё», tab change). The input comes from the client: an unknown
 * type is «все», a page that is not an integer from 1 to the last page of the tab answers empty
 * before the cache, so no request creates an empty cache entry.
 */
export async function loadNews(input: { page: unknown; type: unknown }): Promise<NewsPage> {
  const type = parseFilter(
    typeof input?.type === 'string' ? input.type : null,
    NEWS_FEED_FILTERS,
    ALL_NEWS,
  )
  const counts = await getNewsCounts()
  const page = newsPage(input?.page, counts[type])
  return page ? getNewsPage(type, page) : EMPTY_NEWS_PAGE
}
