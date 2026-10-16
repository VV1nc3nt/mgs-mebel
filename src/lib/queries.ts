import { unstable_cache } from 'next/cache'
import { draftMode } from 'next/headers'
import { connection } from 'next/server'
import type { DataFromGlobalSlug, Where } from 'payload'

import type { Catalog, News, Salon, Setting } from '@/payload-types'

import type { LayoutInput, SettingsInput } from './chrome'
import { getPayloadClient } from './payload'
import { getPreviewUser } from './preview'
import { collectionTag, globalTag, newsTag, type PAGE_GLOBALS } from './revalidate'
import { isProjectSlug, toViewerProject, type ProjectRecord, type ViewerProject } from './viewer'
import {
  ALL_WORKS,
  HOME_WORKS_LIMIT,
  REELS,
  WORK_FILTERS,
  WORKS_FEED_FILTERS,
  WORKS_PAGE_SIZE,
  toFeedWork,
  workPanels,
  type ProjectRow,
  type WorkPanel,
  type WorksCounts,
  type WorksFeedFilter,
  type WorksFeedPage,
} from './works'

const layoutCached = unstable_cache(
  async (): Promise<LayoutInput> => {
    const payload = await getPayloadClient()
    return payload.findGlobal({ slug: 'layout', depth: 0 })
  },
  ['global:layout'],
  { tags: [globalTag('layout')] },
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
  { tags: [globalTag('settings')] },
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

export type DesignerManagerData = NonNullable<Setting['designerManager']>

// The manager of the «Дизайнерам» page: its own entry, so the header and footer data
// (getSettings) stay without the photo. `url` is computed from `filename` (and `prefix` with S3).
const MANAGER_PHOTO_SIZE = { url: true, filename: true, width: true, height: true } as const

const designerManagerCached = unstable_cache(
  async (): Promise<DesignerManagerData> => {
    const payload = await getPayloadClient()
    const { designerManager } = await payload.findGlobal({
      slug: 'settings',
      depth: 1,
      select: { designerManager: true },
      populate: {
        media: {
          alt: true,
          url: true,
          filename: true,
          prefix: true,
          mimeType: true,
          width: true,
          height: true,
          focalX: true,
          focalY: true,
          sizes: { thumb: MANAGER_PHOTO_SIZE, card: MANAGER_PHOTO_SIZE },
        },
      },
    })
    return designerManager ?? {}
  },
  ['global:settings:designer-manager'],
  { tags: [globalTag('settings')] },
)

/** Manager for designers («Дизайнерам»: cooperation): photo, name, position, phone, messengers. */
export async function getDesignerManager(): Promise<DesignerManagerData> {
  await connection()
  return designerManagerCached()
}

/** Globals of site pages (README §6): drafts with autosave, read through getPageGlobal. */
export type PageSlug = (typeof PAGE_GLOBALS)[number]

export type PageData<S extends PageSlug> = DataFromGlobalSlug<S>

// Published version only: read as an anonymous visitor (`overrideAccess: false`, no user), so the
// global's read access (`_status = published`) applies even if the main row is not published.
const readPublished = async <S extends PageSlug>(slug: S): Promise<PageData<S>> => {
  const payload = await getPayloadClient()
  return payload.findGlobal({ slug, depth: 1, overrideAccess: false })
}

// One cache entry and one tag per page: the global's hooks expire `global:<slug>` on publishing.
const pageCache = new Map<PageSlug, () => Promise<unknown>>()

const pageCached = <S extends PageSlug>(slug: S): Promise<PageData<S>> => {
  let cached = pageCache.get(slug)
  if (!cached) {
    cached = unstable_cache(() => readPublished(slug), ['global:page', slug], {
      tags: [globalTag(slug)],
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
  { tags: [globalTag('stats')] },
)

/** Statistics shared by the home and «О нас» pages. */
export async function getStats() {
  await connection()
  return statsCached()
}

export type NewsSlide = Pick<
  News,
  'id' | 'title' | 'slug' | 'date' | 'lead' | 'cover' | 'coverVideo'
>

const latestNewsCached = unstable_cache(
  async (limit: number): Promise<NewsSlide[]> => {
    const payload = await getPayloadClient()
    // As an anonymous visitor: the collection's read access lets through published news only.
    const { docs } = await payload.find({
      collection: 'news',
      where: { _status: { equals: 'published' } },
      sort: '-date',
      limit,
      depth: 1,
      draft: false,
      overrideAccess: false,
      select: { title: true, slug: true, date: true, lead: true, cover: true, coverVideo: true },
    })
    return docs
  },
  ['collection:news:latest'],
  { tags: [collectionTag('news')] },
)

/** The latest published news, newest first (home slider). */
export async function getLatestNews(limit: number): Promise<NewsSlide[]> {
  await connection()
  return latestNewsCached(limit)
}

export type NewsArticle = Pick<News, 'id' | 'title' | 'slug' | 'date' | 'lead' | 'cover' | 'meta'>

/**
 * A published news item by its slug, or null (unknown slug or draft only): the page answers 404.
 * Drafts are not shown even in draft mode until the full news page gets Live Preview.
 */
export async function getNewsBySlug(slug: string): Promise<NewsArticle | null> {
  await connection()
  // One cache entry per slug, so a news item can be revalidated by `news:<slug>`.
  return unstable_cache(
    async (): Promise<NewsArticle | null> => {
      const payload = await getPayloadClient()
      const { docs } = await payload.find({
        collection: 'news',
        where: { slug: { equals: slug }, _status: { equals: 'published' } },
        limit: 1,
        depth: 1,
        draft: false,
        overrideAccess: false,
        select: { title: true, slug: true, date: true, lead: true, cover: true, meta: true },
      })
      return docs[0] ?? null
    },
    ['collection:news:slug', slug],
    { tags: [collectionTag('news'), newsTag(slug)] },
  )()
}

// A video can only be the first slide, so «has a video» means a video project.
const worksWhere = (filter: WorksFeedFilter): Where | undefined =>
  filter === ALL_WORKS
    ? undefined
    : filter === REELS
      ? { 'slides.type': { equals: 'video' } }
      : { category: { equals: filter } }

const homeWorksCached = unstable_cache(
  async (): Promise<WorkPanel[]> => {
    const payload = await getPayloadClient()
    const find = async (where: Where | undefined): Promise<ProjectRow[]> => {
      const { docs } = await payload.find({
        collection: 'projects',
        where,
        // «На главной» first, then by the editor's order
        sort: ['-featured', 'order', '-createdAt'],
        limit: HOME_WORKS_LIMIT,
        depth: 1,
        overrideAccess: false,
        select: { title: true, slug: true, category: true, slides: true },
      })
      return docs
    }
    const lists = await Promise.all(
      WORK_FILTERS.map(async ({ key }) => [key, await find(worksWhere(key))] as const),
    )
    return workPanels(Object.fromEntries(lists))
  },
  ['collection:projects:home'],
  { tags: [collectionTag('projects')] },
)

/** Home «Наши работы»: up to 4 previews per chip, chips without works left out. */
export async function getHomeWorks(): Promise<WorkPanel[]> {
  await connection()
  return homeWorksCached()
}

// Media fields the feed cards and Open Graph read. `url` is computed from `filename` (and `prefix`
// with S3), so those are selected too.
const WORK_MEDIA_SIZE = { url: true, filename: true, width: true, height: true } as const

const worksPageCached = unstable_cache(
  async (filter: WorksFeedFilter, page: number): Promise<WorksFeedPage> => {
    const payload = await getPayloadClient()
    const { docs, hasNextPage } = await payload.find({
      collection: 'projects',
      where: worksWhere(filter),
      // The editor's order; the id keeps pages stable when order and date are equal
      sort: ['order', '-createdAt', '-id'],
      limit: WORKS_PAGE_SIZE,
      page,
      depth: 1,
      overrideAccess: false,
      select: { title: true, slug: true, category: true, slides: true },
      populate: {
        media: {
          alt: true,
          url: true,
          filename: true,
          prefix: true,
          mimeType: true,
          width: true,
          height: true,
          focalX: true,
          focalY: true,
          sizes: { thumb: WORK_MEDIA_SIZE, card: WORK_MEDIA_SIZE, og: WORK_MEDIA_SIZE },
        },
      },
    })
    return { items: docs.map(toFeedWork), hasMore: hasNextPage }
  },
  ['collection:projects:feed'],
  { tags: [collectionTag('projects')] },
)

/** A page of the works feed (12 cards) for «все», reels or a category. */
export async function getWorksPage(filter: WorksFeedFilter, page: number): Promise<WorksFeedPage> {
  await connection()
  return worksPageCached(filter, page)
}

const worksCountsCached = unstable_cache(
  async (): Promise<WorksCounts> => {
    const payload = await getPayloadClient()
    const counts = await Promise.all(
      WORKS_FEED_FILTERS.map(async (filter) => {
        const { totalDocs } = await payload.count({
          collection: 'projects',
          where: worksWhere(filter),
          overrideAccess: false,
        })
        return [filter, totalDocs] as const
      }),
    )
    return Object.fromEntries(counts) as WorksCounts
  },
  ['collection:projects:counts'],
  { tags: [collectionTag('projects')] },
)

/** Works per filter («все», reels, categories): the counter and the chips that have works. */
export async function getWorksCounts(): Promise<WorksCounts> {
  await connection()
  return worksCountsCached()
}

export type ProjectListItem = { slug: string; title: string }

// Every project in the order of the feed «все»: the slugs a project page may have, and the
// ItemList of /works.
const projectListCached = unstable_cache(
  async (): Promise<ProjectListItem[]> => {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'projects',
      sort: ['order', '-createdAt', '-id'],
      pagination: false,
      depth: 0,
      overrideAccess: false,
      select: { slug: true, title: true },
    })
    return docs.map((doc) => ({ slug: doc.slug, title: doc.title }))
  },
  ['collection:projects:list'],
  { tags: [collectionTag('projects')] },
)

/** All projects in the order of the feed «все»: slug and title (JSON-LD ItemList of /works). */
export async function getProjectList(): Promise<ProjectListItem[]> {
  await connection()
  return projectListCached()
}

// The viewer shows frames full-screen: the `hero` size (1920) on top of the feed's ones.
const PROJECT_MEDIA = {
  alt: true,
  url: true,
  filename: true,
  prefix: true,
  mimeType: true,
  width: true,
  height: true,
  focalX: true,
  focalY: true,
  sizes: {
    thumb: WORK_MEDIA_SIZE,
    card: WORK_MEDIA_SIZE,
    hero: WORK_MEDIA_SIZE,
    og: WORK_MEDIA_SIZE,
  },
} as const

/** A project of the viewer with its SEO fields and its place in the feed order. */
export type ProjectPageData = {
  project: ViewerProject
  meta: ProjectRecord['meta']
  sort: Pick<ProjectRecord, 'id' | 'order' | 'createdAt'>
}

/**
 * A project by its slug, or null (the page answers 404). An unknown slug is answered from the
 * list of slugs before the per-slug cache, so made-up URLs leave no cache entries.
 */
export async function getProjectBySlug(slug: string): Promise<ProjectPageData | null> {
  await connection()
  if (!isProjectSlug(slug) || !(await projectListCached()).some((item) => item.slug === slug)) return null
  return unstable_cache(
    async (): Promise<ProjectPageData | null> => {
      const payload = await getPayloadClient()
      const { docs } = await payload.find({
        collection: 'projects',
        where: { slug: { equals: slug } },
        limit: 1,
        depth: 1,
        overrideAccess: false,
        select: {
          title: true,
          slug: true,
          category: true,
          place: true,
          area: true,
          duration: true,
          description: true,
          slides: true,
          meta: true,
          order: true,
          createdAt: true,
        },
        populate: { media: PROJECT_MEDIA },
      })
      const doc = docs[0]
      if (!doc) return null
      return {
        project: toViewerProject(doc),
        meta: doc.meta,
        sort: { id: doc.id, order: doc.order, createdAt: doc.createdAt },
      }
    },
    ['collection:projects:slug', slug],
    { tags: [collectionTag('projects')] },
  )()
}

/**
 * Projects before this one in the order of the feed «все» (`order, -createdAt, -id`): its 0-based
 * position. An empty `order` sorts last (Postgres, ascending).
 */
export const projectsBefore = ({ id, order, createdAt }: ProjectPageData['sort']): Where => {
  const sameOrder: Where =
    order == null ? { order: { exists: false } } : { order: { equals: order } }
  return {
    or: [
      ...(order == null ? [{ order: { exists: true } }] : [{ order: { less_than: order } }]),
      { and: [sameOrder, { createdAt: { greater_than: createdAt } }] },
      { and: [sameOrder, { createdAt: { equals: createdAt } }, { id: { greater_than: id } }] },
    ],
  }
}

/** 0-based position of a project in the feed «все». */
export async function getProjectPosition(sort: ProjectPageData['sort']): Promise<number> {
  await connection()
  return unstable_cache(
    async (): Promise<number> => {
      const payload = await getPayloadClient()
      const { totalDocs } = await payload.count({
        collection: 'projects',
        where: projectsBefore(sort),
        overrideAccess: false,
      })
      return totalDocs
    },
    ['collection:projects:position', String(sort.id), String(sort.order), sort.createdAt],
    { tags: [collectionTag('projects')] },
  )()
}

export type SalonPin = Pick<
  Salon,
  'id' | 'name' | 'address' | 'phone' | 'metro' | 'location' | 'order'
>

const salonsCached = unstable_cache(
  async (): Promise<SalonPin[]> => {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'salons',
      sort: 'order',
      pagination: false,
      depth: 0,
      overrideAccess: false,
      select: { name: true, address: true, phone: true, metro: true, location: true, order: true },
    })
    return docs
  },
  ['collection:salons:pins'],
  { tags: [collectionTag('salons')] },
)

/** Salons for the map and the salon card, in the editor's order. */
export async function getSalons(): Promise<SalonPin[]> {
  await connection()
  return salonsCached()
}

export type SalonCardData = Pick<
  Salon,
  'id' | 'name' | 'address' | 'phone' | 'hours' | 'location' | 'poster' | 'reviewVideo' | 'order'
>

// Media fields the cards, JSON-LD and Open Graph read: poster sizes, focal point, video file.
// `url` is computed from `filename` (and `prefix` with S3), so those are selected too.
const SALON_MEDIA_SIZE = { url: true, filename: true, width: true, height: true } as const

const salonCardsCached = unstable_cache(
  async (): Promise<SalonCardData[]> => {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'salons',
      sort: 'order',
      pagination: false,
      depth: 1,
      overrideAccess: false,
      select: {
        name: true,
        address: true,
        phone: true,
        hours: true,
        location: true,
        poster: true,
        reviewVideo: true,
        order: true,
      },
      populate: {
        media: {
          alt: true,
          url: true,
          filename: true,
          prefix: true,
          mimeType: true,
          width: true,
          height: true,
          focalX: true,
          focalY: true,
          sizes: { card: SALON_MEDIA_SIZE, hero: SALON_MEDIA_SIZE, og: SALON_MEDIA_SIZE },
        },
      },
    })
    return docs
  },
  ['collection:salons:cards'],
  { tags: [collectionTag('salons')] },
)

/** Salons of the «Салоны» page with the card photo and video, in the editor's order. */
export async function getSalonCards(): Promise<SalonCardData[]> {
  await connection()
  return salonCardsCached()
}

export type CatalogData = Pick<
  Catalog,
  'id' | 'title' | 'category' | 'cover' | 'render' | 'pdf' | 'pages' | 'order'
>

// Media fields the cards and Open Graph read; `filesize` — the PDF size on the card. `url` is
// computed from `filename` (and `prefix` with S3), so those are selected too.
const CATALOG_MEDIA_SIZE = { url: true, filename: true, width: true, height: true } as const

const catalogsCached = unstable_cache(
  async (): Promise<CatalogData[]> => {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'catalogs',
      sort: 'order',
      pagination: false,
      depth: 1,
      overrideAccess: false,
      select: {
        title: true,
        category: true,
        cover: true,
        render: true,
        pdf: true,
        pages: true,
        order: true,
      },
      populate: {
        media: {
          alt: true,
          url: true,
          filename: true,
          prefix: true,
          mimeType: true,
          filesize: true,
          width: true,
          height: true,
          focalX: true,
          focalY: true,
          sizes: {
            thumb: CATALOG_MEDIA_SIZE,
            card: CATALOG_MEDIA_SIZE,
            hero: CATALOG_MEDIA_SIZE,
            og: CATALOG_MEDIA_SIZE,
          },
        },
      },
    })
    return docs
  },
  ['collection:catalogs'],
  { tags: [collectionTag('catalogs')] },
)

/** Catalogs of the «Каталоги» page with the cover, render and PDF, in the editor's order. */
export async function getCatalogs(): Promise<CatalogData[]> {
  await connection()
  return catalogsCached()
}
