import type { Home, News, Stat } from '@/payload-types'

import { getPayloadClient } from '@/lib/payload'

export type UiKitData = {
  news: News[]
  newsCount: { all: number; news: number; new: number } | null
  history: Home['history'] | null
  stats: NonNullable<Stat['items']>
}

const EMPTY: UiKitData = { news: [], newsCount: null, history: null, stats: [] }

/**
 * Demo content from the seed. Without a database or seed the primitives get empty values and
 * must degrade gracefully: the page never fails because of data.
 */
export async function getUiKitData(): Promise<UiKitData> {
  try {
    const payload = await getPayloadClient()
    const published = { _status: { equals: 'published' } } as const
    const [news, newsTotal, onlyNews, home, stats] = await Promise.all([
      payload.find({ collection: 'news', where: published, sort: '-date', limit: 3, depth: 1 }),
      payload.count({ collection: 'news', where: published }),
      payload.count({
        collection: 'news',
        where: { and: [published, { type: { equals: 'news' } }] },
      }),
      payload.findGlobal({ slug: 'home', depth: 1 }),
      payload.findGlobal({ slug: 'stats', depth: 0 }),
    ])
    return {
      news: news.docs,
      newsCount: {
        all: newsTotal.totalDocs,
        news: onlyNews.totalDocs,
        new: newsTotal.totalDocs - onlyNews.totalDocs,
      },
      history: home.history,
      stats: stats.items ?? [],
    }
  } catch (error) {
    console.warn('ui-kit: demo data unavailable, rendering empty states', error)
    return EMPTY
  }
}
