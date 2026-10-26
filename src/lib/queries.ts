import { unstable_cache } from 'next/cache'
import { draftMode } from 'next/headers'
import { connection } from 'next/server'
import type { DataFromGlobalSlug, Where } from 'payload'
import { cache } from 'react'

import type { Catalog, News, Salon, Setting } from '@/payload-types'

import type { LayoutInput, SettingsInput } from './chrome'
import {
  isLegalShown,
  LEGAL_DOCS,
  LEGAL_KEYS,
  legalLinks,
  type LegalKey,
  type LegalLinks,
  type LegalSlug,
} from './legal'
import { getPayloadClient } from './payload'
import { getPreviewUser } from './preview'
import { collectionTag, globalTag, newsTag, type PAGE_GLOBALS } from './revalidate'
import { isSlug } from './slugify'
import {
  ALL_NEWS,
  NEWS_FEED_FILTERS,
  NEWS_PAGE_SIZE,
  toNewsCard,
  type NewsCounts,
  type NewsFilter,
  type NewsPage,
} from './news'
import {
  buildWorks,
  projectHref,
  visibleItemTypes,
  workPanels,
  type ProjectIndexEntry,
  type WorkFeeds,
  type WorkPanel,
  type WorksData,
} from './works'
import { parseItemId, toViewerItem, type ViewerItem, type ViewerItemRow } from './workView'
import { toWorkProject, type WorkProject, type WorkProjectRow } from './workProject'

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

// Links of a Lexical text (news body, legal documents): the address needs the slug only; an item —
// its id (its visibility and type come from the works feeds, their own cache: an edit of the works
// expires no text). A news not readable as published stays an id: its text without a link.
const TEXT_LINKS_POPULATE = {
  news: { slug: true },
  projects: { slug: true },
  items: { type: true },
} as const

// A legal text links to news by their slug: publishing, unpublishing or renaming a news expires it.
const LEGAL_SLUGS: ReadonlySet<PageSlug> = new Set(LEGAL_KEYS.map((key) => LEGAL_DOCS[key].slug))
const pageRead = (slug: PageSlug) =>
  LEGAL_SLUGS.has(slug)
    ? { populate: TEXT_LINKS_POPULATE, tags: [globalTag(slug), collectionTag('news')] }
    : { populate: undefined, tags: [globalTag(slug)] }

// Published version only: read as an anonymous visitor (`overrideAccess: false`, no user), so the
// global's read access (`_status = published`) applies even if the main row is not published.
const readPublished = async <S extends PageSlug>(slug: S): Promise<PageData<S>> => {
  const payload = await getPayloadClient()
  return payload.findGlobal({
    slug,
    depth: 1,
    overrideAccess: false,
    populate: pageRead(slug).populate,
  }) as Promise<PageData<S>>
}

// One cache entry per page: the global's hooks expire `global:<slug>` on publishing.
const pageCache = new Map<PageSlug, () => Promise<unknown>>()

const pageCached = <S extends PageSlug>(slug: S): Promise<PageData<S>> => {
  let cached = pageCache.get(slug)
  if (!cached) {
    cached = unstable_cache(() => readPublished(slug), ['global:page', slug], {
      tags: pageRead(slug).tags,
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
    return payload.findGlobal({
      slug,
      depth: 1,
      draft: true,
      populate: pageRead(slug).populate,
    }) as Promise<PageData<S>>
  }
  return pageCached(slug)
}

export type LegalDoc = PageData<LegalSlug>

/**
 * A legal document with its page: a title and some text, else null (the page answers 404). Read
 * like any page global (drafts to an editor in draft mode); React `cache` — the page and its
 * metadata read it once per request.
 */
export const getLegalDoc = cache(async (key: LegalKey): Promise<LegalDoc | null> => {
  const doc = await getPageGlobal(LEGAL_DOCS[key].slug)
  return isLegalShown(doc) ? doc : null
})

/**
 * Links to the legal documents that have a page (footer, cookie notice): the published version
 * only, in draft mode too — a draft is never linked. The same cache entries as the pages
 * (`global:<slug>` of each document).
 */
export async function getLegalLinks(): Promise<LegalLinks> {
  await connection()
  const docs = await Promise.all(LEGAL_KEYS.map((key) => pageCached(LEGAL_DOCS[key].slug)))
  return legalLinks(Object.fromEntries(LEGAL_KEYS.map((key, i) => [key, docs[i]])))
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

export type NewsArticle = Pick<
  News,
  | 'id'
  | 'title'
  | 'slug'
  | 'type'
  | 'date'
  | 'lead'
  | 'cover'
  | 'body'
  | 'readingTime'
  | 'meta'
  | 'updatedAt'
>

// Media of the article: the cover (page, Open Graph) and the photos of the body blocks.
const ARTICLE_MEDIA_SIZE = { url: true, filename: true, width: true, height: true } as const

const ARTICLE_QUERY = {
  collection: 'news',
  limit: 1,
  depth: 1,
  select: {
    title: true,
    slug: true,
    type: true,
    date: true,
    lead: true,
    cover: true,
    body: true,
    readingTime: true,
    meta: true,
    updatedAt: true,
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
      sizes: {
        thumb: ARTICLE_MEDIA_SIZE,
        card: ARTICLE_MEDIA_SIZE,
        hero: ARTICLE_MEDIA_SIZE,
        og: ARTICLE_MEDIA_SIZE,
      },
    },
    ...TEXT_LINKS_POPULATE,
  },
} as const

const findArticle = async (slug: string, draft: boolean): Promise<NewsArticle | null> => {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    ...ARTICLE_QUERY,
    ...(draft
      ? // The latest version, published or not; the caller is an editor (getPreviewUser)
        { where: { slug: { equals: slug } }, draft: true }
      : // As an anonymous visitor: the collection's read access lets through published news only
        {
          where: { slug: { equals: slug }, _status: { equals: 'published' } },
          draft: false,
          overrideAccess: false,
        }),
  })
  return (docs[0] as NewsArticle | undefined) ?? null
}

/**
 * A news item by its slug, or null (the page answers 404). Visitors get the published version from
 * the cache: one entry per slug, expired by `news:<slug>`. In draft mode an editor with a valid
 * admin session gets the latest version straight from the database, a never published one too.
 * React `cache`: the page and its metadata read it once per request (the slug is the only key).
 */
export const getNewsBySlug = cache(async (slug: string): Promise<NewsArticle | null> => {
  await connection()
  // A made-up address leaves no cache entry
  if (!isSlug(slug)) return null
  if ((await draftMode()).isEnabled && (await getPreviewUser())) return findArticle(slug, true)
  return unstable_cache(() => findArticle(slug, false), ['collection:news:article', slug], {
    tags: [collectionTag('news'), newsTag(slug)],
  })()
})

// Published news of a tab: «все» or one type.
const newsWhere = (filter: NewsFilter): Where =>
  filter === ALL_NEWS
    ? { _status: { equals: 'published' } }
    : { _status: { equals: 'published' }, type: { equals: filter } }

// Newest first; the id keeps pages stable when dates are equal
const NEWS_SORT = ['-date', '-id']

// Media fields the news cards and Open Graph read. `url` is computed from `filename` (and `prefix`
// with S3), so those are selected too.
const NEWS_MEDIA_SIZE = { url: true, filename: true, width: true, height: true } as const

const newsPageCached = unstable_cache(
  async (filter: NewsFilter, page: number): Promise<NewsPage> => {
    const payload = await getPayloadClient()
    // As an anonymous visitor: the collection's read access lets through published news only.
    const { docs, hasNextPage } = await payload.find({
      collection: 'news',
      where: newsWhere(filter),
      sort: NEWS_SORT,
      limit: NEWS_PAGE_SIZE,
      page,
      depth: 1,
      draft: false,
      overrideAccess: false,
      select: { title: true, slug: true, type: true, date: true, lead: true, cover: true },
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
          sizes: { thumb: NEWS_MEDIA_SIZE, card: NEWS_MEDIA_SIZE, og: NEWS_MEDIA_SIZE },
        },
      },
    })
    return { items: docs.map(toNewsCard), hasMore: hasNextPage }
  },
  ['collection:news:feed'],
  { tags: [collectionTag('news')] },
)

/** A page of the news list (6 cards) for «все» or one type. */
export async function getNewsPage(filter: NewsFilter, page: number): Promise<NewsPage> {
  await connection()
  return newsPageCached(filter, page)
}

const newsCountsCached = unstable_cache(
  async (): Promise<NewsCounts> => {
    const payload = await getPayloadClient()
    const counts = await Promise.all(
      NEWS_FEED_FILTERS.map(async (filter) => {
        const { totalDocs } = await payload.count({
          collection: 'news',
          where: newsWhere(filter),
          overrideAccess: false,
        })
        return [filter, totalDocs] as const
      }),
    )
    return Object.fromEntries(counts) as NewsCounts
  },
  ['collection:news:counts'],
  { tags: [collectionTag('news')] },
)

/** Published news per tab («все», news, new): the counters and the tabs that have news. */
export async function getNewsCounts(): Promise<NewsCounts> {
  await connection()
  return newsCountsCached()
}

export type NewsListItem = { slug: string; title: string }

const newsListCached = unstable_cache(
  async (): Promise<NewsListItem[]> => {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'news',
      where: newsWhere(ALL_NEWS),
      sort: NEWS_SORT,
      pagination: false,
      depth: 0,
      draft: false,
      overrideAccess: false,
      select: { slug: true, title: true },
    })
    return docs.map((doc) => ({ slug: doc.slug, title: doc.title }))
  },
  ['collection:news:list'],
  { tags: [collectionTag('news')] },
)

/** All published news in the order of the list «все»: slug and title (ItemList of /news). */
export async function getNewsList(): Promise<NewsListItem[]> {
  await connection()
  return newsListCached()
}

// Media fields the work tiles read. `url` is computed from `filename` (and `prefix` with S3), so
// those are selected too; `poster` — a video's tile in REELS (populated one level deeper).
const WORK_MEDIA_SIZE = { url: true, filename: true, width: true, height: true } as const
const WORK_MEDIA = {
  alt: true,
  url: true,
  filename: true,
  prefix: true,
  mimeType: true,
  width: true,
  height: true,
  focalX: true,
  focalY: true,
  poster: true,
  sizes: { thumb: WORK_MEDIA_SIZE, card: WORK_MEDIA_SIZE },
} as const

// The editor's order (drag-and-drop in the admin), then the newest; the id breaks the last ties
const WORK_SORT = ['_order', '-createdAt', '-id']

const worksTags = [collectionTag('projects'), collectionTag('items')]

const worksDataCached = unstable_cache(
  async (): Promise<WorksData> => {
    const payload = await getPayloadClient()
    const [projects, items] = await Promise.all([
      payload.find({
        collection: 'projects',
        sort: WORK_SORT,
        pagination: false,
        depth: 2,
        overrideAccess: false,
        select: {
          title: true,
          slug: true,
          place: true,
          complex: true,
          cover: true,
          videos: true,
          featured: true,
          hidden: true,
        },
        populate: { media: WORK_MEDIA },
      }),
      payload.find({
        collection: 'items',
        sort: WORK_SORT,
        pagination: false,
        depth: 2,
        overrideAccess: false,
        select: {
          title: true,
          type: true,
          project: true,
          place: true,
          photos: true,
          videos: true,
          featured: true,
          hidden: true,
        },
        populate: { media: WORK_MEDIA, projects: { title: true } },
      }),
    ])
    return buildWorks(projects.docs, items.docs)
  },
  // v2: the entry carries the index of projects next to the feeds
  ['collection:works:feeds:v2'],
  { tags: worksTags },
)

/** Every feed of the works page: visible tiles in the editor's order. */
export async function getWorkFeeds(): Promise<WorkFeeds> {
  await connection()
  return (await worksDataCached()).feeds
}

/**
 * Visible projects with visible items (the same cache entry as the feeds): what a project
 * address answers is known before any cache of the project is made.
 */
export async function getProjectIndex(): Promise<ProjectIndexEntry[]> {
  await connection()
  return (await worksDataCached()).projects
}

// Photos of the view are shown full screen: the optimizer's source is `hero` (1920), `card` (960)
// for the frames at the sides and the narrow screens.
const VIEW_MEDIA = {
  ...WORK_MEDIA,
  sizes: { ...WORK_MEDIA.sizes, hero: WORK_MEDIA_SIZE },
} as const

// Fields of an item its panel and frames read (the view of an item, the page of a project)
const VIEW_ITEM_SELECT = {
  title: true,
  type: true,
  photos: true,
  videos: true,
  description: true,
  specs: true,
  extraSpecs: true,
  price: true,
  ctaLabel: true,
  hidden: true,
} as const

const workItemCached = unstable_cache(
  async (id: number): Promise<ViewerItem | null> => {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'items',
      where: { id: { equals: id } },
      limit: 1,
      depth: 2,
      overrideAccess: false,
      select: { ...VIEW_ITEM_SELECT, project: true },
      populate: {
        media: VIEW_MEDIA,
        projects: { title: true, slug: true, complex: true, hidden: true },
      },
    })
    return toViewerItem(docs[0] as ViewerItemRow | undefined)
  },
  ['collection:works:item'],
  { tags: worksTags },
)

/**
 * An item for its view (works v2 §3.4): panel and frames, or null — not an id, no such item, a
 * hidden item or one of a hidden project. Cache entries of items are made for visible items only:
 * an id is first looked up among the items of the works feeds (their own cache, the same tags;
 * every visible item is in the feed of its type), so trying ids grows no cache. React `cache`:
 * the page and its metadata read it once.
 */
export const getWorkItem = cache(async (id: unknown): Promise<ViewerItem | null> => {
  await connection()
  const itemId = parseItemId(id)
  if (itemId === null) return null
  if (!visibleItemTypes(await getWorkFeeds()).has(itemId)) return null
  return workItemCached(itemId)
})

const workProjectCached = unstable_cache(
  async (id: number): Promise<WorkProject | null> => {
    const payload = await getPayloadClient()
    const [{ docs: projects }, { docs: items }] = await Promise.all([
      payload.find({
        collection: 'projects',
        where: { id: { equals: id } },
        limit: 1,
        depth: 2,
        overrideAccess: false,
        select: {
          title: true,
          slug: true,
          place: true,
          city: true,
          year: true,
          complex: true,
          cover: true,
          about: true,
          price: true,
          designer: true,
          videos: true,
          hidden: true,
          meta: true,
        },
        populate: { media: VIEW_MEDIA },
      }),
      payload.find({
        collection: 'items',
        where: { project: { equals: id } },
        sort: WORK_SORT,
        pagination: false,
        depth: 2,
        overrideAccess: false,
        // The project is set on each item by toWorkProject: not read here
        select: VIEW_ITEM_SELECT,
        populate: { media: VIEW_MEDIA },
      }),
    ])
    return toWorkProject(projects[0] as WorkProjectRow | undefined, items as ViewerItemRow[])
  },
  ['collection:works:project'],
  { tags: worksTags },
)

/** What a project address answers: its page, a redirect to its first item, or nothing (404). */
export type ProjectAnswer = { page: WorkProject } | { redirect: string } | null

/**
 * A project by its slug (works v2 §3): a visible complex one — its page; a visible one that is not
 * complex — the view of its first visible item (308); else null. The slug is looked up first in
 * the index of the works feeds (their own cache, the same tags): a cache entry of a project page
 * is made for visible complex projects only, so trying slugs grows no cache. React `cache`: the
 * page and its metadata read it once.
 */
export const getWorkProject = cache(async (slug: unknown): Promise<ProjectAnswer> => {
  await connection()
  if (!isSlug(slug)) return null
  const entry = (await getProjectIndex()).find((p) => p.slug === slug)
  if (!entry) return null
  if (!entry.complex) return { redirect: projectHref(entry) }
  const page = await workProjectCached(entry.id)
  return page ? { page } : null
})

/** Home «Наши работы»: up to 4 previews per chip, chips without works left out. */
export async function getHomeWorks(): Promise<WorkPanel[]> {
  return workPanels(await getWorkFeeds())
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
