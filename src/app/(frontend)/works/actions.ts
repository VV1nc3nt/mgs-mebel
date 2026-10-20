'use server'

import { getWorkFeeds } from '@/lib/queries'
import type { WorkTile } from '@/lib/works'
import { WORK_FEED_VALUES, type WorkFeed } from '@/lib/workTypes'

/**
 * Tiles of a feed of the works page (chip change). The input comes from the client: an unknown
 * feed answers empty before the cache. Every feed comes from one cache entry (all the works).
 */
export async function loadWorkFeed(feed: unknown): Promise<WorkTile[]> {
  if (typeof feed !== 'string' || !WORK_FEED_VALUES.includes(feed as WorkFeed)) return []
  return (await getWorkFeeds())[feed as WorkFeed]
}
