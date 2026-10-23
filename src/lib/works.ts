import type { Item, Media, Project } from '@/payload-types'
import { asMedia, isImage, isVideo, type MediaValue } from './media'
import { tileRatio } from './masonry'
import { plural } from './plural'
import { itemTitle } from './workItems'
import { itemViewHref } from './workView'
import {
  COMPLEX,
  REELS,
  WORK_FEEDS,
  workTypeLabel,
  type WorkFeed,
  type WorkType,
} from './workTypes'

/** Fields of a project the feeds read (`select` of the query), in the editor's order. */
export type ProjectRow = Pick<
  Project,
  'id' | 'title' | 'slug' | 'place' | 'complex' | 'cover' | 'videos' | 'featured' | 'hidden'
>

/** Fields of an item the feeds read, in the editor's order. */
export type ItemRow = Pick<
  Item,
  'id' | 'title' | 'type' | 'project' | 'place' | 'photos' | 'videos' | 'featured' | 'hidden'
>

type TileBase = {
  /** Unique within a feed: `p-1`, `i-3`, `r-i-3-12`. */
  key: string
  /** Cover photo or video poster; null — an empty surface. */
  image: Media | null
  /** Height / width of the tile (the image's own; reels 16 / 9). */
  ratio: number
  featured: boolean
}

/** «Комплекс»: a project, a link to its page. */
export type ProjectTile = TileBase & {
  kind: 'project'
  title: string
  place: string | null
  href: string
  photos: number
  videos: number
}

/** A type feed: an item, a link to its view (`itemViewHref`). */
export type ItemTile = TileBase & {
  kind: 'item'
  id: number
  href: string
  title: string
  place: string | null
  type: WorkType
  photos: number
  videos: number
}

/** REELS: a video of a project or of an item (its type is the zone badge). */
export type ReelTile = TileBase & {
  kind: 'reel'
  /** Project or item the video belongs to (accessible name of the tile). */
  title: string
  type: WorkType | null
}

export type WorkTile = ProjectTile | ItemTile | ReelTile

export type WorkFeeds = Record<WorkFeed, WorkTile[]>

/** Tiles per feed: the chip numbers, the same whichever feed is open. */
export type WorkCounts = Record<WorkFeed, number>

/** A reel is 9:16. */
export const REEL_RATIO = 16 / 9

const images = (values: readonly MediaValue[] | null | undefined): Media[] =>
  (values ?? []).filter(isImage)

/** Videos the site can show: a populated video with a populated image poster. */
export const showableVideos = (values: readonly MediaValue[] | null | undefined): Media[] =>
  (values ?? []).filter(isVideo).filter((video) => isImage(video.poster))

const relId = (value: ItemRow['project']): number | null =>
  value && typeof value === 'object' ? value.id : (value ?? null)

const ratioOf = (media: Media | null) => tileRatio(media?.width, media?.height)

/** «13 фото + 3 видео», «13 фото», «3 видео». */
export const mediaBadge = (photos: number, videos: number): string =>
  [photos && `${photos} фото`, videos && `${videos} видео`].filter(Boolean).join(' + ')

/** Counter at the H1: «6 проектов», «12 работ», «10 видео». */
export const worksCount = (n: number, feed: WorkFeed): string => {
  const forms: [string, string, string] =
    feed === COMPLEX
      ? ['проект', 'проекта', 'проектов']
      : feed === REELS
        ? ['видео', 'видео', 'видео']
        : ['работа', 'работы', 'работ']
  return `${n} ${plural(n, forms)}`
}

/** The visible part of the data: shown projects, visible items, the items of each shown project. */
function visibleWorks(projects: readonly ProjectRow[], items: readonly ItemRow[]) {
  const shown = projects.filter((p) => !p.hidden)
  const shownIds = new Set(shown.map((p) => p.id))
  const hiddenIds = new Set(projects.filter((p) => p.hidden).map((p) => p.id))
  const visibleItems = items.filter((item) => {
    if (item.hidden) return false
    const project = relId(item.project)
    return project === null || !hiddenIds.has(project)
  })
  const byProject = new Map<number, ItemRow[]>()
  for (const item of visibleItems) {
    const project = relId(item.project)
    if (project !== null && shownIds.has(project)) {
      byProject.set(project, [...(byProject.get(project) ?? []), item])
    }
  }
  return { shown, visibleItems, byProject }
}

/**
 * Feeds of the works page from the visible data, in the editor's order:
 * «Комплекс» — projects marked so with at least one visible item; a type — its items; REELS —
 * per project its own videos, then its items' videos, then the videos of separate works.
 * A hidden project hides its items and videos; a video without a poster is left out.
 */
export function buildFeeds(projects: readonly ProjectRow[], items: readonly ItemRow[]): WorkFeeds {
  const { shown, visibleItems, byProject } = visibleWorks(projects, items)
  const projectOf = new Map(shown.map((p) => [p.id, p]))

  const feeds = Object.fromEntries(
    WORK_FEEDS.map(({ value }) => [value, []]),
  ) as unknown as WorkFeeds

  for (const project of shown) {
    const own = byProject.get(project.id) ?? []
    if (!project.complex || !own.length) continue
    const image = asMedia(project.cover) ?? images(own[0]?.photos)[0] ?? null
    feeds[COMPLEX].push({
      kind: 'project',
      key: `p-${project.id}`,
      title: project.title,
      place: project.place?.trim() || null,
      href: `/works/${project.slug}`,
      image,
      ratio: ratioOf(image),
      featured: Boolean(project.featured),
      photos: own.reduce((n, item) => n + images(item.photos).length, 0),
      videos:
        showableVideos(project.videos).length +
        own.reduce((n, item) => n + showableVideos(item.videos).length, 0),
    })
  }

  for (const item of visibleItems) {
    const project = projectOf.get(relId(item.project) ?? -1)
    const image = images(item.photos)[0] ?? null
    feeds[item.type].push({
      kind: 'item',
      key: `i-${item.id}`,
      id: item.id,
      href: itemViewHref({ type: item.type, id: item.id }),
      title: itemTitle(item),
      place: (project ? project.place : item.place)?.trim() || null,
      type: item.type,
      image,
      ratio: ratioOf(image),
      featured: Boolean(item.featured),
      photos: images(item.photos).length,
      videos: showableVideos(item.videos).length,
    })
  }

  const reel =
    (owner: string, title: string, type: WorkType | null, featured: boolean) =>
    (video: Media): ReelTile => ({
      kind: 'reel',
      key: `r-${owner}-${video.id}`,
      title,
      type,
      image: asMedia(video.poster),
      ratio: REEL_RATIO,
      featured,
    })
  const itemReels = (item: ItemRow) =>
    showableVideos(item.videos).map(
      reel(`i-${item.id}`, itemTitle(item), item.type, Boolean(item.featured)),
    )
  for (const project of shown) {
    feeds[REELS].push(
      ...showableVideos(project.videos).map(
        reel(`p-${project.id}`, project.title, null, Boolean(project.featured)),
      ),
      ...(byProject.get(project.id) ?? []).flatMap(itemReels),
    )
  }
  feeds[REELS].push(
    ...visibleItems.filter((item) => relId(item.project) === null).flatMap(itemReels),
  )

  return feeds
}

/**
 * A visible project with at least one visible item: what its address answers without reading
 * the project — its page (complex) or the view of its first item (308).
 */
export type ProjectIndexEntry = {
  id: number
  slug: string
  title: string
  complex: boolean
  /** Its first visible item in the editor's order. */
  first: { id: number; type: WorkType }
}

/** Visible projects that have visible items, in the editor's order (works v2 §3). */
export function buildProjectIndex(
  projects: readonly ProjectRow[],
  items: readonly ItemRow[],
): ProjectIndexEntry[] {
  const { shown, byProject } = visibleWorks(projects, items)
  return shown.flatMap((project) => {
    const first = byProject.get(project.id)?.[0]
    return first && project.slug
      ? [
          {
            id: project.id,
            slug: project.slug,
            title: project.title,
            complex: Boolean(project.complex),
            first: { id: first.id, type: first.type },
          },
        ]
      : []
  })
}

/** Where a visible project leads: its page (complex), else the view of its first item. */
export const projectHref = (entry: ProjectIndexEntry): string =>
  entry.complex
    ? `/works/${entry.slug}`
    : itemViewHref({ type: entry.first.type, id: entry.first.id })

/** Feeds and the index of projects: one cache entry, one read of the data. */
export type WorksData = { feeds: WorkFeeds; projects: ProjectIndexEntry[] }

export const buildWorks = (
  projects: readonly ProjectRow[],
  items: readonly ItemRow[],
): WorksData => ({
  feeds: buildFeeds(projects, items),
  projects: buildProjectIndex(projects, items),
})

/** Visible projects by id: where links to them from news texts lead. */
export const visibleProjectHrefs = (projects: readonly ProjectIndexEntry[]): Map<number, string> =>
  new Map(projects.map((entry) => [entry.id, projectHref(entry)]))

/** Visible items by id: their type (links to their views from news texts). */
export const visibleItemTypes = (feeds: WorkFeeds): Map<number, WorkType> =>
  new Map(
    Object.values(feeds)
      .flat()
      .flatMap((tile) => (tile.kind === 'item' ? [[tile.id, tile.type] as const] : [])),
  )

export const feedCounts = (feeds: WorkFeeds): WorkCounts =>
  Object.fromEntries(WORK_FEEDS.map(({ value }) => [value, feeds[value].length])) as WorkCounts

/** Chips of /works: feeds that have tiles, in the design's order. */
export const feedChips = (counts: WorkCounts) => WORK_FEEDS.filter(({ value }) => counts[value] > 0)

/** Previews per chip on the home page (README §6.1 п.6). */
export const HOME_WORKS_LIMIT = 4

export type WorkPreview = {
  key: string
  title: string
  /** Label of the tile's type («кухня»), «комплекс» for a project. */
  category: string
  href: string
  image: Media | null
  /** With a video (▶) or photos only (carousel icon). */
  kind: 'video' | 'photo'
  /** Leads to a project page (fetched ahead on an intent). */
  project?: true
}

export type WorkPanel = { key: WorkFeed; label: string; works: WorkPreview[] }

const feedHref = (feed: WorkFeed) => (feed === COMPLEX ? '/works' : `/works?category=${feed}`)

/** Home preview of a tile: a project leads to its page, an item to its view, a reel to REELS. */
export const toWorkPreview = (tile: WorkTile): WorkPreview => {
  switch (tile.kind) {
    case 'project':
      return {
        key: tile.key,
        title: tile.title,
        category: 'Комплекс',
        href: tile.href,
        image: tile.image,
        kind: tile.videos ? 'video' : 'photo',
        project: true,
      }
    case 'item':
      return {
        key: tile.key,
        title: tile.title,
        category: workTypeLabel(tile.type) ?? '',
        href: tile.href,
        image: tile.image,
        kind: tile.videos ? 'video' : 'photo',
      }
    case 'reel':
      return {
        key: tile.key,
        title: tile.title,
        category: workTypeLabel(tile.type) ?? '',
        href: feedHref(REELS),
        image: tile.image,
        kind: 'video',
      }
  }
}

/** Home panels in chip order, up to 4 tiles each: «На главной» first, then the editor's order. */
export function workPanels(feeds: WorkFeeds, limit = HOME_WORKS_LIMIT): WorkPanel[] {
  return WORK_FEEDS.flatMap(({ value, label: feedLabel }) => {
    // Home chips are lowercase (CSS); «reels» keeps its lowercase text too
    const label = value === REELS ? 'reels' : feedLabel
    const tiles = feeds[value]
    const ordered = [...tiles.filter((t) => t.featured), ...tiles.filter((t) => !t.featured)]
    const works = ordered.slice(0, limit).map(toWorkPreview)
    return works.length ? [{ key: value, label, works }] : []
  })
}

/** «Комплекс» if it has works, else the first chip that has. */
export const initialWorkFilter = (panels: WorkPanel[]): WorkFeed | undefined =>
  panels.find((panel) => panel.key === COMPLEX)?.key ?? panels[0]?.key
