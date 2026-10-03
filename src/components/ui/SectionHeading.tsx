import { cn } from '@/lib/cn'
import { SectionLabel } from './SectionLabel'

type Props = {
  /** Section label from the CMS, without «#». */
  label?: string | null
  /** H2 of the section; an empty title leaves the label alone. */
  title?: string | null
  /** Id of the H2, for `aria-labelledby` of the section. */
  id?: string
  className?: string
}

/** Section head (README §5.1): «#label» and H2, 10 apart. Nothing without both. */
export function SectionHeading({ label, title, id, className }: Props) {
  if (!label && !title) return null
  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      {label && <SectionLabel>{label}</SectionLabel>}
      {title && (
        <h2 id={id} className="text-h2 text-balance md:text-h2-md xl:text-h2-xl">
          {title}
        </h2>
      )}
    </div>
  )
}
