import type { Media, Project } from '@/payload-types'
import { asMedia, isImage } from './media'
import { plural } from './plural'
import { paragraphs } from './text'
import { mediaBadge, REEL_RATIO, showableVideos, type ReelTile } from './works'
import {
  formatPrice,
  projectViewHref,
  toViewerItem,
  type ViewerFrame,
  type ViewerItem,
  type ViewerItemRow,
} from './workView'

/**
 * Page of a complex project (works v2 §3.1–§3.3): heading, zone chips, the masonry of its frames
 * (item after item) with its own videos among them, «О проекте». Kept free of Payload imports.
 */

/** Fields of a project the page reads (`select` of the query). */
export type WorkProjectRow = Pick<
  Project,
  | 'id'
  | 'title'
  | 'slug'
  | 'place'
  | 'city'
  | 'year'
  | 'complex'
  | 'cover'
  | 'about'
  | 'price'
  | 'designer'
  | 'videos'
  | 'hidden'
  | 'meta'
>

/** A frame of the project in the masonry: a link to the view at it. */
export type FrameTile = {
  kind: 'frame'
  /** `f-<frame key>`. */
  key: string
  /** The photo, or the poster of a video. */
  image: Media
  /** Height / width (the masonry's ratio). */
  ratio: number
  featured: false
  href: string
  /** Title of the frame's item (the zone badge). */
  zone: string
  /** Index of the frame in the view. */
  frame: number
}

export type GalleryTile = FrameTile | ReelTile

/** A chip of a zone: the view from the first frame of the item. */
export type ProjectZone = { id: number; title: string; count: number; href: string }

/** «О проекте»: no part — no block. */
export type ProjectAbout = { text: string[]; price: string | null; designer: string | null }

export type WorkProject = {
  id: number
  slug: string
  title: string
  /** «6 зон», «13 фото + 3 видео», «ЖК Уно, Москва, 2025» (empty parts left out). */
  meta: string[]
  zones: ProjectZone[]
  /** Visible items by id (the panels of the view). */
  items: Record<number, ViewerItem>
  /** Frames of the view: item after item, photos then videos of each. */
  frames: ViewerFrame[]
  gallery: GalleryTile[]
  about: ProjectAbout | null
  cover: Media | null
  /** SEO fields (plugin-seo). */
  seo: WorkProjectRow['meta']
  /** First paragraph of «О проекте»: the description fallback. */
  description: string | null
}

/** Places of the project's videos among the frames (§3.3); the rest go to the end. */
export const REEL_PLACES = [0, 6, 12] as const

/** «1 зона», «3 зоны», «6 зон». */
export const zonesCount = (n: number): string => `${n} ${plural(n, ['зона', 'зоны', 'зон'])}`

/** Meta of the heading: zones, media, «место, город, год»; empty parts are left out. */
export function projectMeta(
  project: Pick<WorkProjectRow, 'place' | 'city' | 'year'>,
  zones: number,
  photos: number,
  videos: number,
): string[] {
  const where = [
    project.place?.trim(),
    project.city?.trim(),
    project.year ? String(project.year) : '',
  ]
    .filter(Boolean)
    .join(', ')
  return [zones ? zonesCount(zones) : '', mediaBadge(photos, videos), where].filter(Boolean)
}

/**
 * Tiles of the masonry: the frames in their order, the project's videos at REEL_PLACES (counted
 * by the frames before them), the rest at the end.
 */
export function projectGallery(
  slug: string,
  frames: readonly ViewerFrame[],
  items: Readonly<Record<number, ViewerItem>>,
  reels: readonly ReelTile[],
): GalleryTile[] {
  const counts = new Map<number, number>()
  const tiles: GalleryTile[] = frames.map((frame, index) => {
    const photo = (counts.get(frame.owner) ?? 0) + 1
    counts.set(frame.owner, photo)
    return {
      kind: 'frame',
      key: `f-${frame.key}`,
      image: frame.image,
      ratio: 1 / frame.ratio,
      featured: false,
      href: projectViewHref({ slug, id: frame.owner, photo }),
      zone: items[frame.owner]?.title ?? '',
      frame: index,
    }
  })
  const placed: GalleryTile[] = [...tiles]
  const tail: ReelTile[] = []
  reels.forEach((reel, k) => {
    const place = REEL_PLACES[k]
    if (place === undefined || place > tiles.length) tail.push(reel)
    else {
      // Counted by the frames: shift by the reels already placed before
      placed.splice(place + k, 0, reel)
    }
  })
  return [...placed, ...tail]
}

/** «О проекте» of a project: null when it has no text, price or designer. */
export function projectAbout(
  project: Pick<WorkProjectRow, 'about' | 'price' | 'designer'>,
): ProjectAbout | null {
  const about = {
    text: paragraphs(project.about),
    price: formatPrice(project.price),
    designer: project.designer?.trim() || null,
  }
  return about.text.length || about.price || about.designer ? about : null
}

/**
 * View-model of the page of a project, or null: a hidden or not complex project, no visible item
 * with frames. `items` — the project's items in the editor's order.
 */
export function toWorkProject(
  project: WorkProjectRow | null | undefined,
  items: readonly ViewerItemRow[],
): WorkProject | null {
  if (!project || project.hidden || !project.complex || !project.slug) return null
  const ref = {
    id: project.id,
    title: project.title,
    slug: project.slug,
    complex: project.complex,
    hidden: project.hidden,
  }
  const visible = items.flatMap((row) => {
    const item = toViewerItem({ ...row, project: ref } as ViewerItemRow)
    return item ? [item] : []
  })
  if (!visible.length) return null

  const byId = Object.fromEntries(visible.map((item) => [item.id, item]))
  const frames = visible.flatMap((item) => item.frames)
  const reels: ReelTile[] = showableVideos(project.videos).map((video) => ({
    kind: 'reel',
    key: `r-p-${project.id}-${video.id}`,
    title: project.title,
    type: null,
    image: asMedia(video.poster),
    ratio: REEL_RATIO,
    featured: false,
  }))
  const photos = frames.filter((f) => f.kind === 'photo').length
  const videos = frames.length - photos + reels.length
  const cover = asMedia(project.cover)
  const about = projectAbout(project)

  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    meta: projectMeta(project, visible.length, photos, videos),
    zones: visible.map((item) => ({
      id: item.id,
      title: item.title,
      count: item.frames.length,
      href: projectViewHref({ slug: project.slug, id: item.id }),
    })),
    items: byId,
    frames,
    gallery: projectGallery(project.slug, frames, byId, reels),
    about,
    cover: cover && isImage(cover) ? cover : null,
    seo: project.meta,
    description: about?.text[0] ?? null,
  }
}
