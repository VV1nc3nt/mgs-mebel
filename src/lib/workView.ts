import type { Item, Media, Project } from '@/payload-types'
import { asMedia, isImage, isVideo, videoSource, type MediaValue, type VideoSource } from './media'
import { paragraphs } from './text'
import { itemTitle } from './workItems'
import { isWorkType, workTypeCta, type WorkType } from './workTypes'

/**
 * View of an item of «Наши работы» (works v2 §3.4): its address, the frames (photos, then videos)
 * and the panel. Kept free of Payload imports, so client components and unit tests can use it.
 */

export const WORKS_PATH = '/works'

/** `?item=` and `?photo=` of the works page. */
export const ITEM_PARAM = 'item'
export const PHOTO_PARAM = 'photo'

/**
 * Address of the view of an item: its feed, the item and the frame (from 1; the first is not
 * written). One builder for the tiles, the home page, Live Preview and links in news texts.
 */
export const itemViewHref = ({
  type,
  id,
  photo = 1,
}: {
  type: string
  id: number | string
  photo?: number
}): string => {
  const params = new URLSearchParams({ category: type, [ITEM_PARAM]: String(id) })
  if (photo > 1) params.set(PHOTO_PARAM, String(photo))
  return `${WORKS_PATH}?${params}`
}

/** A project page: `/works/<slug>`. */
export const projectHrefOf = (slug: string): string => `${WORKS_PATH}/${slug}`

/**
 * Address of the view on a project page (works v2 §3.4): the item and its frame (from 1; the
 * first is not written) over the page of the project.
 */
export const projectViewHref = ({
  slug,
  id,
  photo = 1,
}: {
  slug: string
  id: number | string
  photo?: number
}): string => {
  const params = new URLSearchParams({ [ITEM_PARAM]: String(id) })
  if (photo > 1) params.set(PHOTO_PARAM, String(photo))
  return `${projectHrefOf(slug)}?${params}`
}

/**
 * Live Preview of a project: a visible complex one with visible items — its page; another visible
 * one — the view of its first visible item; new, hidden or without visible items — /works.
 */
export const projectPreviewPath = (
  project: { slug?: string | null; complex?: boolean | null; hidden?: boolean | null } | null,
  first: { id: number; type: string } | null,
): string => {
  if (!project?.slug || project.hidden || !first) return WORKS_PATH
  return project.complex ? projectHrefOf(project.slug) : itemViewHref(first)
}

/** The feed of an item type (where × of its view leads without script). */
export const typeFeedHref = (type: string): string =>
  `${WORKS_PATH}?${new URLSearchParams({ category: type })}`

/** An id of an item: a whole positive number in its decimal form, else null. */
export const parseItemId = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value > 0 ? value : null
  if (typeof value !== 'string' || !/^[1-9]\d{0,15}$/.test(value)) return null
  const id = Number(value)
  return Number.isSafeInteger(id) ? id : null
}

/** Frame of `?photo=` as an index (0-based): out of 1…count, or not a number — the first. */
export const parsePhoto = (value: unknown, count: number): number => {
  const n = typeof value === 'string' && /^\d{1,6}$/.test(value) ? Number(value) : NaN
  return n >= 1 && n <= count ? n - 1 : 0
}

type Search = { get: (name: string) => string | null }

/** `?item=` and `?photo=` of an address (raw photo: the count is known once the item is). */
export const readItemView = (search: Search): { item: number | null; photo: string | null } => ({
  item: parseItemId(search.get(ITEM_PARAM)),
  photo: search.get(PHOTO_PARAM),
})

/** A frame of a view: a photo, or a video over its poster; `owner` — its item (a panel). */
export type ViewerFrame = {
  /**
   * Unique within the view, whatever media repeat: `p-<item>-<n>` / `v-<item>-<n>` (n — the place
   * among the item's photos / videos).
   */
  key: string
  owner: number
  kind: 'photo' | 'video'
  /** The photo, or the poster of the video. */
  image: Media
  video: VideoSource | null
  /** Width / height (the image's own; a video's poster). */
  ratio: number
}

export type ViewerSpec = { label: string; value: string }

/** Panel and frames of an item. */
export type ViewerItem = {
  id: number
  type: WorkType
  title: string
  /** Paragraphs of the description. */
  text: string[]
  specs: ViewerSpec[]
  /** «1 250 000 ₽», null — no price block. */
  price: string | null
  cta: string
  /** Visible complex project: «Весь проект →». */
  project: { slug: string; title: string } | null
  frames: ViewerFrame[]
}

/** Fields of an item the view reads (`select` of the query). */
export type ViewerItemRow = Pick<
  Item,
  | 'id'
  | 'title'
  | 'type'
  | 'project'
  | 'photos'
  | 'videos'
  | 'description'
  | 'specs'
  | 'extraSpecs'
  | 'price'
  | 'ctaLabel'
  | 'hidden'
>

export type ViewerProjectRow = Pick<Project, 'id' | 'title' | 'slug' | 'complex' | 'hidden'>

/** Ratio of a portrait reel when a poster has no size. */
export const VIDEO_FALLBACK_RATIO = 9 / 16
/** Ratio of a photo without a size (4:5, the tiles' fallback). */
export const PHOTO_FALLBACK_RATIO = 4 / 5

const ratioOf = (media: Media | null, fallback: number): number =>
  media?.width && media.height && media.width > 0 && media.height > 0
    ? media.width / media.height
    : fallback

/** «1 250 000 ₽» with no-break spaces (works v2 §3.3); null without a price. */
export const formatPrice = (price: number | null | undefined): string | null =>
  typeof price === 'number' && Number.isFinite(price) && price >= 0
    ? `${price.toLocaleString('ru-RU').replace(/\s/g, ' ')} ₽`
    : null

const SPEC_LABELS = [
  ['korpus', 'Корпус'],
  ['fasady', 'Фасады'],
  ['furn', 'Фурнитура'],
] as const

/** Rows of the specs table: the three fixed ones, then the extra; empty rows are left out. */
export const specRows = ({
  specs,
  extraSpecs,
}: Pick<ViewerItemRow, 'specs' | 'extraSpecs'>): ViewerSpec[] =>
  [
    ...SPEC_LABELS.map(([name, label]) => ({ label, value: specs?.[name] ?? '' })),
    ...(extraSpecs ?? []).map((row) => ({ label: row.label ?? '', value: row.value ?? '' })),
  ]
    .map(({ label, value }) => ({ label: label.trim(), value: value.trim() }))
    .filter(({ label, value }) => label && value)

/** Label of the CTA: the item's own, else «Хочу такую же» / «Хочу такой же» by its type. */
export const ctaLabel = (item: Pick<ViewerItemRow, 'ctaLabel' | 'type'>): string =>
  item.ctaLabel?.trim() || workTypeCta(item.type)

const projectOf = (value: ViewerItemRow['project']): ViewerProjectRow | null =>
  value && typeof value === 'object' ? (value as ViewerProjectRow) : null

/** Frames of an item: its photos, then its videos that have a poster (as `showableVideos`). */
export const itemFrames = (
  item: Pick<ViewerItemRow, 'id' | 'photos' | 'videos'>,
): ViewerFrame[] => [
  ...(item.photos ?? []).filter(isImage).map((photo, n): ViewerFrame => ({
    key: `p-${item.id}-${n}`,
    owner: item.id,
    kind: 'photo',
    image: photo,
    video: null,
    ratio: ratioOf(photo, PHOTO_FALLBACK_RATIO),
  })),
  ...((item.videos ?? []) as MediaValue[]).filter(isVideo).flatMap((video, n): ViewerFrame[] => {
    const poster = asMedia(video.poster)
    const source = videoSource(video)
    return poster && isImage(poster) && source
      ? [
          {
            key: `v-${item.id}-${n}`,
            owner: item.id,
            kind: 'video',
            image: poster,
            video: source,
            ratio: ratioOf(poster, VIDEO_FALLBACK_RATIO),
          },
        ]
      : []
  }),
]

/**
 * View-model of an item for the view, or null: a hidden item, an item of a hidden project, no
 * frames. The project (populated) gives «Весь проект →» when it is visible and complex.
 */
export function toViewerItem(row: ViewerItemRow | null | undefined): ViewerItem | null {
  if (!row || row.hidden || !isWorkType(row.type)) return null
  const project = projectOf(row.project)
  if (project?.hidden) return null
  const frames = itemFrames(row)
  if (!frames.length) return null
  return {
    id: row.id,
    type: row.type,
    title: itemTitle(row),
    text: paragraphs(row.description),
    specs: specRows(row),
    price: formatPrice(row.price),
    cta: ctaLabel(row),
    project: project?.complex && project.slug ? { slug: project.slug, title: project.title } : null,
    frames,
  }
}

/** Frames of a view in the order of a list that starts at `start` and goes round. */
export const rotate = <T>(list: readonly T[], start: number): T[] =>
  list.length ? [...list.slice(start), ...list.slice(0, start)] : []

/** A group of the list of a view (< 1280): the frames of an item (indexes in the view), then its panel. */
export type ViewGroup = { owner: number; frames: number[] }

/**
 * The list of a view below 1280, item by item: the item of the start frame first — from that
 * frame round, then the other items in their order round, each from its first frame.
 */
export function viewGroups(frames: readonly ViewerFrame[], start: number): ViewGroup[] {
  const groups: ViewGroup[] = []
  frames.forEach((frame, i) => {
    const last = groups.at(-1)
    if (last?.owner === frame.owner) last.frames.push(i)
    else groups.push({ owner: frame.owner, frames: [i] })
  })
  const from = frames[start] ? start : 0
  const k = groups.findIndex((group) => group.frames.includes(from))
  if (k < 0) return []
  const first = groups[k]!
  return rotate(groups, k).map((group) =>
    group === first
      ? { ...group, frames: rotate(group.frames, group.frames.indexOf(from)) }
      : group,
  )
}

/** «2 / 5»: the frame's number among the frames of its item. */
export const frameCounter = (frames: readonly ViewerFrame[], index: number): string => {
  const frame = frames[index]
  if (!frame) return ''
  const own = frames.filter((f) => f.owner === frame.owner)
  return `${own.indexOf(frame) + 1} / ${own.length}`
}

/** Index in the frames of a view of the item's frame `photo` (0-based); -1 — not there. */
export const frameAt = (frames: readonly ViewerFrame[], owner: number, photo = 0): number => {
  const first = frames.findIndex((f) => f.owner === owner)
  if (first < 0) return -1
  const own = frames.filter((f) => f.owner === owner).length
  return first + Math.min(Math.max(photo, 0), own - 1)
}

/** The item of a frame of a view and the frame's place among the item's frames (0-based). */
export const framePlace = (
  frames: readonly ViewerFrame[],
  index: number,
): { owner: number; photo: number } | null => {
  const frame = frames[index]
  if (!frame) return null
  return {
    owner: frame.owner,
    photo: frames.slice(0, index).filter((f) => f.owner === frame.owner).length,
  }
}

/**
 * Places of the strip (≥ 1280) kept in the DOM around the current frame: the current one and two
 * on each side (neighbours in view, the next ones ready); one frame — itself, two — one each side.
 */
export const stripPlaces = (count: number): number[] =>
  count <= 1 ? [0] : count === 2 ? [-1, 0, 1] : [-2, -1, 0, 1, 2]

const RATIO_DIGITS = 4

/** Width of a frame of the strip in CSS (`work-view-slide`): its ratio × the strip height, capped. */
const slideWidth = (ratio: number) =>
  `min(100cqh * ${Number(ratio.toFixed(RATIO_DIGITS))}, var(--viewer-slide-max))`

/**
 * Left edge of the frame `place` steps from the current one, from the strip's centre: a calc()
 * of the widths in between (their ratios) and the gaps — the server renders the strip in place.
 */
export function slideOffset(ratioAt: (place: number) => number, place: number): string {
  if (place === 0) return `calc(${slideWidth(ratioAt(0))} / -2)`
  const dir = Math.sign(place)
  const parts = [`${slideWidth(ratioAt(0))} / 2`, 'var(--viewer-gap)']
  for (let step = 1; step < Math.abs(place); step++) {
    parts.push(slideWidth(ratioAt(dir * step)), 'var(--viewer-gap)')
  }
  return dir > 0
    ? `calc(${parts.join(' + ')})`
    : `calc(-1 * (${parts.join(' + ')} + ${slideWidth(ratioAt(place))}))`
}

/** ←/→ on the bar of a video: seconds per press. */
export const SEEK_STEP = 5

/** Share of `part` in `whole`, kept in 0…1; 0 when `whole` is unknown. */
export function progressShare(part: number, whole: number): number {
  if (!Number.isFinite(whole) || whole <= 0 || !Number.isFinite(part)) return 0
  return Math.min(Math.max(part / whole, 0), 1)
}

/** «1:05» of a video time; «0:00» while unknown. */
export function formatTime(seconds: number): string {
  const total = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/**
 * A refused `play()`: AbortError is an interruption by `pause()`; with sound it is the autoplay
 * policy — try again muted; muted — the video cannot play.
 */
export const playRefusal = (
  error: unknown,
  muted: boolean,
): 'ignore' | 'retry-muted' | 'fallback' =>
  (error as Error | null)?.name === 'AbortError' ? 'ignore' : muted ? 'fallback' : 'retry-muted'
