import type { Media, Project } from '@/payload-types'
import { asMedia, videoSource, type VideoSource } from './media'
import { projectCategoryLabel } from './projectCategories'
import { seoTitle } from './seo'
import { WORKS_PAGE_SIZE } from './works'

/**
 * Project viewer (README §6.4 «Просмотр проекта»): the view-model of a project and the pure
 * decisions of its navigation — frames, projects, swipes, the end of the feed.
 */

/** Fields of a project the viewer and the project page read (`select` of the query). */
export type ProjectRecord = Pick<
  Project,
  | 'id'
  | 'title'
  | 'slug'
  | 'category'
  | 'place'
  | 'area'
  | 'duration'
  | 'description'
  | 'slides'
  | 'meta'
  | 'order'
  | 'createdAt'
>

export type ViewerFrame = {
  kind: 'photo' | 'video'
  /** The photo, or the poster of a video. */
  image: Media | null
  /** Video file (played from the viewer's next step); null for a photo. */
  video: VideoSource | null
  /** Video length from the admin, s; null — from the file. */
  duration: number | null
}

export type ViewerProject = {
  id: number
  slug: string
  href: string
  title: string
  /** <title> of the project page: the SEO title or the project title, with the brand. */
  documentTitle: string
  /** Category label. */
  category: string
  place: string | null
  /** «42 м²», «4 недели», «видео + фото»; empty ones left out. */
  facts: string[]
  description: string | null
  frames: ViewerFrame[]
}

/** The works list the viewer opens over. */
export const WORKS_PATH = '/works'

export const projectHref = (slug: string) => `${WORKS_PATH}/${slug}`

type Slides = ProjectRecord['slides']

export const toViewerFrames = (slides: Slides): ViewerFrame[] =>
  (slides ?? []).flatMap((slide): ViewerFrame[] => {
    if (slide.type === 'video') {
      const image = asMedia(slide.poster)
      const video = videoSource(slide.file)
      if (!image && !video) return []
      return [{ kind: 'video', image, video, duration: slide.duration ?? null }]
    }
    const image = asMedia(slide.file)
    return image ? [{ kind: 'photo', image, video: null, duration: null }] : []
  })

/** Media fact: «видео + фото», «видео» or «N фото». */
export const mediaFact = (frames: readonly Pick<ViewerFrame, 'kind'>[]): string | null => {
  const photos = frames.filter((frame) => frame.kind === 'photo').length
  const video = frames.some((frame) => frame.kind === 'video')
  if (video) return photos ? 'видео + фото' : 'видео'
  return photos ? `${photos} фото` : null
}

/** «42 м²» (a fraction with a comma), nothing for an empty area. */
export const areaFact = (area: number | null | undefined): string | null =>
  typeof area === 'number' && area > 0 ? `${area.toLocaleString('ru-RU')} м²` : null

/** Chips of facts under the title: area, duration as typed, media. */
export const projectFacts = (
  project: Pick<ProjectRecord, 'area' | 'duration'>,
  frames: readonly Pick<ViewerFrame, 'kind'>[],
): string[] =>
  [areaFact(project.area), project.duration?.trim() || null, mediaFact(frames)].filter(
    (fact): fact is string => Boolean(fact),
  )

export function toViewerProject(project: ProjectRecord): ViewerProject {
  const frames = toViewerFrames(project.slides)
  return {
    id: project.id,
    slug: project.slug,
    href: projectHref(project.slug),
    title: project.title,
    documentTitle: seoTitle(project.meta?.title || project.title),
    category: projectCategoryLabel(project.category) ?? '',
    place: project.place?.trim() || null,
    facts: projectFacts(project, frames),
    description: project.description?.trim() || null,
    frames,
  }
}

/** «категория · место», or the category alone. */
export const projectSubtitle = ({ category, place }: Pick<ViewerProject, 'category' | 'place'>) =>
  [category, place].filter(Boolean).join(' · ')

/** «3 / 30»: the project's place in the current filter and the filter's total. */
export const viewerCounter = (index: number, total: number) => `${index + 1} / ${total}`

/** Slug as the slug field makes it: lowercase latin, digits, single dashes. */
export const isProjectSlug = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= 200 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)

/** The project of a viewer URL (`/works/<slug>`), or null. */
export const slugFromPath = (pathname: string): string | null => {
  const match = /^\/works\/([^/]+)$/.exec(pathname)
  return match && isProjectSlug(match[1]) ? match[1] : null
}

/** Feed page (1-based) of a project at this 0-based position. */
export const pageOf = (position: number) => Math.floor(position / WORKS_PAGE_SIZE) + 1

/** Where the viewer is: the project's index in the loaded feed and its frame. */
export type ViewerPosition = { index: number; frame: number }

export type ViewerBounds = {
  /** Frames of the current project; null while they load. */
  frames: number | null
  /** Projects loaded in the feed. */
  length: number
  /** More pages of the feed after the loaded ones. */
  hasMore: boolean
}

export type ViewerMove =
  | { type: 'frame'; frame: number }
  | { type: 'project'; index: number }
  /** The next project is not loaded yet: load the next page, then go. */
  | { type: 'load' }
  | { type: 'close' }
  | { type: 'none' }

const NONE: ViewerMove = { type: 'none' }

/** ↑ / ↓, wheel: the neighbouring project; nothing before the first or after the whole feed. */
export function jumpProject(
  { index }: ViewerPosition,
  dir: 1 | -1,
  { length, hasMore }: ViewerBounds,
): ViewerMove {
  const next = index + dir
  if (next < 0) return NONE
  if (next < length) return { type: 'project', index: next }
  return hasMore ? { type: 'load' } : NONE
}

/** Tap on the right, →: the next frame; after the last one the next project, at the very end — close. */
export function nextFrame(position: ViewerPosition, bounds: ViewerBounds): ViewerMove {
  if (bounds.frames === null) return NONE
  if (position.frame < bounds.frames - 1) return { type: 'frame', frame: position.frame + 1 }
  if (position.index + 1 >= bounds.length && !bounds.hasMore) return { type: 'close' }
  return jumpProject(position, 1, bounds)
}

/** Tap on the left, ←: the previous frame; before the first one the previous project. */
export function prevFrame(position: ViewerPosition, bounds: ViewerBounds): ViewerMove {
  if (bounds.frames === null) return NONE
  if (position.frame > 0) return { type: 'frame', frame: position.frame - 1 }
  return jumpProject(position, -1, bounds)
}

/** A vertical swipe at least this long (px) changes the project. */
export const SWIPE_DELTA = 60

/** Swipe up — the next project (1), down — the previous (−1); horizontal or short — 0. */
export function swipeStep({ dx, dy }: { dx: number; dy: number }): 1 | -1 | 0 {
  if (Math.abs(dy) <= SWIPE_DELTA || Math.abs(dy) <= Math.abs(dx)) return 0
  return dy < 0 ? 1 : -1
}

/** A swipe: projects like ↑ / ↓, but down on the first project closes the viewer. */
export function swipeMove(position: ViewerPosition, dir: 1 | -1, bounds: ViewerBounds): ViewerMove {
  if (dir === -1 && position.index === 0) return { type: 'close' }
  return jumpProject(position, dir, bounds)
}

/** Load the next page while at most this many projects are left after the current one. */
export const PRELOAD_PROJECTS = 2

export const shouldLoadMore = (index: number, length: number, hasMore: boolean) =>
  hasMore && length - 1 - index <= PRELOAD_PROJECTS

/**
 * A step to a project that was not loaded yet: go once the feed has it, keep waiting while the
 * page loads, otherwise give up — a failed or empty load leaves the viewer where it is, and the
 * next gesture tries again.
 */
export function pendingStep(
  target: number,
  { length, loading }: { length: number; loading: boolean },
): 'go' | 'drop' | 'wait' {
  if (target < length) return 'go'
  return loading ? 'wait' : 'drop'
}

/** A scrollable box (the expanded description) can still scroll in this direction (1 down). */
export const canScrollInside = (
  {
    scrollTop,
    scrollHeight,
    clientHeight,
  }: { scrollTop: number; scrollHeight: number; clientHeight: number },
  dir: 1 | -1,
): boolean => (dir > 0 ? scrollTop + clientHeight < scrollHeight - 1 : scrollTop > 0)
