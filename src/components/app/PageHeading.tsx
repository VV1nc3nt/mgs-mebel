import type { ReactNode } from 'react'

import { SectionLabel } from '@/components/ui/SectionLabel'
import { cn } from '@/lib/cn'

type Props = {
  label?: string | null
  title?: string | null
  lead?: string | null
  /** Next to the H1 on the right, under it on mobile (the works counter). */
  aside?: ReactNode
  /** Long words in the H1 (legal documents: «конфиденциальности» is wider than 390): hyphenated. */
  hyphenate?: boolean
}

/**
 * Heading of an inner page without a hero (salons, catalogs, works, news): section label, H1 and
 * lead. Empty parts are left out.
 */
export function PageHeading({ label, title, lead, aside, hyphenate }: Props) {
  const heading = title && (
    <h1
      className={cn(
        'text-h1 md:text-h1-md xl:text-h1-xl',
        hyphenate && 'wrap-break-word hyphens-auto',
      )}
    >
      {title}
    </h1>
  )

  return (
    <div className="page-container flex flex-col gap-2.5 pt-7 xl:pt-18">
      {label && <SectionLabel>{label}</SectionLabel>}
      {aside ? (
        // Design (works): wraps under the H1 on mobile, bottom-aligned with it otherwise
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          {heading}
          {aside}
        </div>
      ) : (
        heading
      )}
      {lead && <p className="text-body text-text-3">{lead}</p>}
    </div>
  )
}
