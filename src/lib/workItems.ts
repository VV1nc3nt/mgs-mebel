import { workTypeLabel } from './workTypes'

type Titled = { title?: string | null; type?: string | null }

/** Title of an item on the site: its own, else the type («Кухня»). */
export const itemTitle = ({ title, type }: Titled): string =>
  title?.trim() || workTypeLabel(type) || ''

/**
 * Caption of an item in the admin lists and pickers: «Кухня — Квартира в тёплых тонах» in a
 * project, the title alone for a separate work («Кухня в загородный дом»).
 */
export const itemLabel = (item: Titled, projectTitle?: string | null): string => {
  const title = itemTitle(item)
  const project = projectTitle?.trim()
  return project ? `${title} — ${project}` : title
}
