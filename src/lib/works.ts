import type { Media, Project } from '@/payload-types'
import { asMedia } from './media'
import { plural } from './plural'
import {
  projectCategoryLabel,
  projectCategoryOptions,
  type ProjectCategory,
} from './projectCategories'

/** «reels»: projects with a video, a filter of the feed rather than a category. */
export const REELS = 'reels'

export type WorkFilter = typeof REELS | ProjectCategory

/** Home and works page chips in the order of the design: reels, then the categories. */
export const WORK_FILTERS: readonly { key: WorkFilter; label: string }[] = [
  { key: REELS, label: 'reels' },
  ...projectCategoryOptions.map(({ value, label }) => ({ key: value, label })),
]

/** The chip selected on the home page when it has works. */
export const DEFAULT_WORK_FILTER: WorkFilter = 'complex'

/** Previews per chip on the home page (README §6.1 п.6). */
export const HOME_WORKS_LIMIT = 4

/** Fields of a project the previews read (`select` of the query). */
export type ProjectRow = Pick<Project, 'id' | 'title' | 'slug' | 'category' | 'slides'>

export type WorkPreview = {
  id: number
  title: string
  /** Label of the project's own category, also in the reels panel. */
  category: string
  href: string
  /** First frame: the video poster or the first photo. */
  image: Media | null
  /** Video project (▶) or photos only (carousel icon). */
  kind: 'video' | 'photo'
}

export type WorkPanel = { key: WorkFilter; label: string; works: WorkPreview[] }

/** First frame of a project: the video poster or the first photo, and whether it is a video. */
const firstFrame = (project: ProjectRow): Pick<WorkPreview, 'image' | 'kind'> => {
  const first = project.slides?.[0]
  const kind = first?.type === 'video' ? 'video' : 'photo'
  return { image: asMedia(kind === 'video' ? first?.poster : first?.file), kind }
}

export function toWorkPreview(project: ProjectRow): WorkPreview {
  return {
    id: project.id,
    title: project.title,
    category: projectCategoryLabel(project.category) ?? '',
    // The project page: the viewer open on it over the feed
    href: `/works/${project.slug}`,
    ...firstFrame(project),
  }
}

/** Panels in chip order; a chip without works is not shown. */
export function workPanels(
  byFilter: Partial<Record<WorkFilter, ProjectRow[]>>,
  limit = HOME_WORKS_LIMIT,
): WorkPanel[] {
  return WORK_FILTERS.flatMap(({ key, label }) => {
    const works = (byFilter[key] ?? []).slice(0, limit).map(toWorkPreview)
    return works.length ? [{ key, label, works }] : []
  })
}

/** «Комплекс» if it has works, else the first chip that has. */
export const initialWorkFilter = (panels: WorkPanel[]): WorkFilter | undefined =>
  panels.find((panel) => panel.key === DEFAULT_WORK_FILTER)?.key ?? panels[0]?.key

/** «все»: the whole feed, no parameter in the URL. */
export const ALL_WORKS = 'all'

export type WorksFeedFilter = typeof ALL_WORKS | WorkFilter

/** Every value the feed accepts, in chip order. */
export const WORKS_FEED_FILTERS: readonly WorksFeedFilter[] = [
  ALL_WORKS,
  ...WORK_FILTERS.map(({ key }) => key),
]

/** Works per feed page: 12 fills whole rows at 3, 4 and 6 columns. */
export const WORKS_PAGE_SIZE = 12

/** Hard upper bound of a requested page (input of the Server Action). */
export const WORKS_MAX_PAGE = 1000

/** The next page starts loading this far (px) before the end of the grid (design: 300). */
export const FEED_PRELOAD_PX = 300

/** IntersectionObserver margin of the feed end: the zone below the viewport. */
export const FEED_PRELOAD_MARGIN = `0px 0px ${FEED_PRELOAD_PX}px 0px`

/** Works per filter: `all`, reels and every category. */
export type WorksCounts = Record<WorksFeedFilter, number>

/** Card of the works feed: the project page link and its first frame. */
export type FeedWork = WorkPreview & { slug: string }

export function toFeedWork(project: ProjectRow): FeedWork {
  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    category: projectCategoryLabel(project.category) ?? '',
    href: `/works/${project.slug}`,
    ...firstFrame(project),
  }
}

export type WorksFeedPage = { items: FeedWork[]; hasMore: boolean }

export const EMPTY_FEED_PAGE: WorksFeedPage = { items: [], hasMore: false }

/** Chips of the feed: «все», then reels and the categories that have works. */
export const worksChips = (counts: WorksCounts): { value: WorksFeedFilter; label: string }[] =>
  counts[ALL_WORKS] > 0
    ? [
        { value: ALL_WORKS, label: 'все' },
        ...WORK_FILTERS.filter(({ key }) => counts[key] > 0).map(({ key, label }) => ({
          value: key,
          label,
        })),
      ]
    : []

/** Counter under the bar: «30 работ», «12 работ · комплекс», «20 работ · reels». */
export const worksCount = (n: number, filter: WorksFeedFilter): string => {
  const count = `${n} ${plural(n, ['работа', 'работы', 'работ'])}`
  const label = WORK_FILTERS.find(({ key }) => key === filter)?.label
  return label ? `${count} · ${label.toLowerCase()}` : count
}

/**
 * Valid page of the feed, or null: an integer from 1 to WORKS_MAX_PAGE that starts within the
 * filter's works. A page past the end costs no query and no cache entry.
 */
export const feedPage = (page: unknown, total: number): number | null =>
  typeof page === 'number' &&
  Number.isInteger(page) &&
  page >= 1 &&
  page <= WORKS_MAX_PAGE &&
  (page - 1) * WORKS_PAGE_SIZE < total
    ? page
    : null

/** New cards of a page without the ones already in the feed (by id). */
export const appendWorks = (items: readonly FeedWork[], next: readonly FeedWork[]): FeedWork[] => {
  const ids = new Set(items.map((work) => work.id))
  return [...items, ...next.filter((work) => !ids.has(work.id))]
}
