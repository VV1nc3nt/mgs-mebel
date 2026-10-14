'use server'

import { getWorksCounts, getWorksPage } from '@/lib/queries'
import { parseFilter } from '@/lib/segmentFilter'
import {
  ALL_WORKS,
  EMPTY_FEED_PAGE,
  WORKS_FEED_FILTERS,
  feedPage,
  type WorksFeedPage,
} from '@/lib/works'

/**
 * Next page of the works feed (infinite scroll, filter change). The input comes from the client:
 * an unknown category is «все», a page that is not an integer from 1 to the last page of the
 * filter answers empty before the cache, so no request creates an empty cache entry.
 */
export async function loadProjects(input: {
  page: unknown
  category: unknown
}): Promise<WorksFeedPage> {
  const category = parseFilter(
    typeof input?.category === 'string' ? input.category : null,
    WORKS_FEED_FILTERS,
    ALL_WORKS,
  )
  const counts = await getWorksCounts()
  const page = feedPage(input?.page, counts[category])
  return page ? getWorksPage(category, page) : EMPTY_FEED_PAGE
}
