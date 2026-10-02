import { unstable_cache } from 'next/cache'
import { draftMode } from 'next/headers'
import { connection } from 'next/server'
import type { DataFromGlobalSlug } from 'payload'

import type { LayoutInput, SettingsInput } from './chrome'
import { getPayloadClient } from './payload'
import { getPreviewUser } from './preview'

// Until step 9: replace the time-based revalidate with revalidateTag from the globals' hooks.
const REVALIDATE_SECONDS = 60

const layoutCached = unstable_cache(
  async (): Promise<LayoutInput> => {
    const payload = await getPayloadClient()
    return payload.findGlobal({ slug: 'layout', depth: 0 })
  },
  ['global:layout'],
  { tags: ['global:layout'], revalidate: REVALIDATE_SECONDS },
)

// Local API skips field access, so the technical tab (consultant widget code) and the designer
// manager are cut off by `select` before anything is cached or rendered.
const settingsCached = unstable_cache(
  async (): Promise<SettingsInput> => {
    const payload = await getPayloadClient()
    const { contacts, messengers } = await payload.findGlobal({
      slug: 'settings',
      depth: 0,
      select: { contacts: true, messengers: true },
    })
    return { contacts, messengers }
  },
  ['global:settings:public'],
  { tags: ['global:settings'], revalidate: REVALIDATE_SECONDS },
)

/**
 * Header, menu, dock and footer texts. `connection()` makes every caller render per request,
 * so `pnpm build` never reaches the database.
 */
export async function getLayout(): Promise<LayoutInput> {
  await connection()
  return layoutCached()
}

/** Public contacts and messenger links only. */
export async function getSettings(): Promise<SettingsInput> {
  await connection()
  return settingsCached()
}

/** Globals of site pages (README §6): drafts with autosave, read through getPageGlobal. */
export type PageSlug =
  'home' | 'about' | 'salonsPage' | 'worksPage' | 'catalogsPage' | 'designers' | 'newsPage'

export type PageData<S extends PageSlug> = DataFromGlobalSlug<S>

// Published version only: read as an anonymous visitor (`overrideAccess: false`, no user), so the
// global's read access (`_status = published`) applies even if the main row is not published.
const readPublished = async <S extends PageSlug>(slug: S): Promise<PageData<S>> => {
  const payload = await getPayloadClient()
  return payload.findGlobal({ slug, depth: 1, overrideAccess: false })
}

// One cache entry and one tag per page: step 9 revalidates a page by `global:<slug>`.
const pageCache = new Map<PageSlug, () => Promise<unknown>>()

const pageCached = <S extends PageSlug>(slug: S): Promise<PageData<S>> => {
  let cached = pageCache.get(slug)
  if (!cached) {
    cached = unstable_cache(() => readPublished(slug), ['global:page', slug], {
      tags: [`global:${slug}`],
      revalidate: REVALIDATE_SECONDS,
    })
    pageCache.set(slug, cached)
  }
  return cached() as Promise<PageData<S>>
}

/**
 * Page global with its media (depth 1). Visitors get the published version from the cache.
 * In draft mode (Live Preview, /preview) an editor with a valid admin session gets the latest
 * draft straight from the database; anybody else still gets the published version.
 */
export async function getPageGlobal<S extends PageSlug>(slug: S): Promise<PageData<S>> {
  await connection()
  if ((await draftMode()).isEnabled && (await getPreviewUser())) {
    const payload = await getPayloadClient()
    return payload.findGlobal({ slug, depth: 1, draft: true })
  }
  return pageCached(slug)
}

const statsCached = unstable_cache(
  async () => {
    const payload = await getPayloadClient()
    return payload.findGlobal({ slug: 'stats', depth: 0 })
  },
  ['global:stats'],
  { tags: ['global:stats'], revalidate: REVALIDATE_SECONDS },
)

/** Statistics shared by the home and «О нас» pages. */
export async function getStats() {
  await connection()
  return statsCached()
}
