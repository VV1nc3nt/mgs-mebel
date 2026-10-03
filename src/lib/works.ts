import type { Media, Project } from '@/payload-types'
import { asMedia } from './media'
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

export function toWorkPreview(project: ProjectRow): WorkPreview {
  const first = project.slides?.[0]
  const kind = first?.type === 'video' ? 'video' : 'photo'
  return {
    id: project.id,
    title: project.title,
    category: projectCategoryLabel(project.category) ?? '',
    href: `/works?category=${project.category}`,
    image: asMedia(kind === 'video' ? first?.poster : first?.file),
    kind,
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
