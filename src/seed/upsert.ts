import type {
  CollectionSlug,
  GlobalSlug,
  Payload,
  RequiredDataFromCollectionSlug,
  Where,
} from 'payload'

import { isSame } from './compare'
import type { SeedStats } from './stats'

/** Every seed call: bypass access control, tell hooks this is a seed (no revalidation). */
export const seedOptions = {
  overrideAccess: true,
  context: { seed: true, disableRevalidate: true },
} as const

/** Create the document, or update it only if the seed data differs from what is stored. */
export const upsertDoc = async <S extends CollectionSlug>(
  payload: Payload,
  stats: SeedStats,
  collection: S,
  where: Where,
  data: RequiredDataFromCollectionSlug<S>,
): Promise<number> => {
  const { docs } = await payload.find({
    collection,
    where,
    limit: 1,
    depth: 0,
    draft: true,
    pagination: false,
    ...seedOptions,
  })
  const existing = docs[0] as { id: number } | undefined
  if (!existing) {
    const doc = await payload.create({ collection, data, depth: 0, ...seedOptions })
    stats.add(collection, 'created')
    return doc.id as number
  }
  if (isSame(existing, data)) {
    stats.add(collection, 'skipped')
    return existing.id
  }
  // Full create data is a valid update; TS cannot relate the two types for a generic slug.
  await payload.update({
    collection,
    id: existing.id,
    data: data as never,
    depth: 0,
    ...seedOptions,
  })
  stats.add(collection, 'updated')
  return existing.id
}

/**
 * Writes a global unless it already matches. Globals with drafts (pages) are written as the
 * published version, and re-published when the stored one is not (e.g. right after drafts
 * were enabled, or an editor's unpublished change).
 */
export const upsertGlobal = async (
  payload: Payload,
  stats: SeedStats,
  slug: GlobalSlug,
  data: Record<string, unknown>,
): Promise<void> => {
  const drafts = Boolean(payload.globals.config.find((g) => g.slug === slug)?.versions?.drafts)
  const existing = await payload.findGlobal({ slug, depth: 0, ...seedOptions })
  const published = !drafts || (existing as { _status?: string })._status === 'published'
  if (published && isSame(existing, data)) {
    stats.add(slug, 'skipped')
    return
  }
  await payload.updateGlobal({
    slug,
    data: drafts ? { ...data, _status: 'published' } : data,
    draft: false,
    depth: 0,
    ...seedOptions,
  })
  stats.add(slug, 'updated')
}
