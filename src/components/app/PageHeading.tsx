import { SectionLabel } from '@/components/ui/SectionLabel'

type Props = {
  label?: string | null
  title?: string | null
  lead?: string | null
  /** H2 where the page has another H1 (a project page: the project title in the viewer). */
  as?: 'h1' | 'h2'
}

/**
 * Heading of an inner page without a hero (salons, catalogs; works and news next): section
 * label, H1 (or H2) and lead. Empty parts are left out.
 */
export function PageHeading({ label, title, lead, as: Heading = 'h1' }: Props) {
  return (
    <div className="page-container flex flex-col gap-2.5 pt-7 xl:pt-18">
      {label && <SectionLabel>{label}</SectionLabel>}
      {title && <Heading className="text-h1 md:text-h1-md xl:text-h1-xl">{title}</Heading>}
      {lead && <p className="text-body text-text-3">{lead}</p>}
    </div>
  )
}
