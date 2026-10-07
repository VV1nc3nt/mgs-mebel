import type { About, Catalog, News, Project, Stat } from '@/payload-types'

import { getPayloadClient } from '@/lib/payload'

export type UiKitData = {
  news: News[]
  newsCount: { all: number; news: number; new: number } | null
  /** «О нас»: a single hero and the history (the home page has the hero scene instead). */
  hero: About['hero'] | null
  history: About['history'] | null
  mission: About['mission'] | null
  stats: NonNullable<Stat['items']>
  /** Works per category; `reels` — projects that start with a video. */
  workCounts: Partial<Record<Project['category'] | 'reels', number>>
  catalogCounts: Partial<Record<Catalog['category'] | 'all', number>>
}

const EMPTY: UiKitData = {
  news: [],
  newsCount: null,
  hero: null,
  history: null,
  mission: null,
  stats: [],
  workCounts: {},
  catalogCounts: {},
}

const countBy = <K extends string>(keys: K[]) =>
  keys.reduce<Partial<Record<K, number>>>(
    (acc, key) => ({ ...acc, [key]: (acc[key] ?? 0) + 1 }),
    {},
  )

/**
 * Demo content from the seed. Without a database or seed the primitives get empty values and
 * must degrade gracefully: the page never fails because of data.
 */
export async function getUiKitData(): Promise<UiKitData> {
  try {
    const payload = await getPayloadClient()
    const published = { _status: { equals: 'published' } } as const
    const [news, newsTotal, onlyNews, about, stats, projects, catalogs] = await Promise.all([
      payload.find({ collection: 'news', where: published, sort: '-date', limit: 3, depth: 1 }),
      payload.count({ collection: 'news', where: published }),
      payload.count({
        collection: 'news',
        where: { and: [published, { type: { equals: 'news' } }] },
      }),
      payload.findGlobal({ slug: 'about', depth: 1 }),
      payload.findGlobal({ slug: 'stats', depth: 0 }),
      payload.find({
        collection: 'projects',
        depth: 0,
        pagination: false,
        select: { category: true, slides: true },
      }),
      payload.find({
        collection: 'catalogs',
        depth: 0,
        pagination: false,
        select: { category: true },
      }),
    ])
    return {
      news: news.docs,
      newsCount: {
        all: newsTotal.totalDocs,
        news: onlyNews.totalDocs,
        new: newsTotal.totalDocs - onlyNews.totalDocs,
      },
      hero: about.hero,
      history: about.history,
      mission: about.mission,
      stats: stats.items ?? [],
      workCounts: {
        ...countBy(projects.docs.map((p) => p.category)),
        reels: projects.docs.filter((p) => p.slides?.[0]?.type === 'video').length,
      },
      catalogCounts: {
        ...countBy(catalogs.docs.map((c) => c.category)),
        all: catalogs.docs.length,
      },
    }
  } catch (error) {
    console.warn('ui-kit: demo data unavailable, rendering empty states', error)
    return EMPTY
  }
}
