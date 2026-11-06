import { HomeSalonMap } from '@/components/salons/HomeSalonMap'

import { SectionHeading } from '@/components/ui/SectionHeading'
import type { Messenger } from '@/lib/chrome'
import type { SalonPin } from '@/lib/queries'
import type { SectionSalons } from '@/payload-types'

type Props = {
  section: Partial<SectionSalons> | undefined
  /** Salons in the editor's order; the card shows the first one. */
  salons: SalonPin[]
  /** Card button label from the «Салоны» page. */
  ctaLabel?: string | null
  /** Messengers of the card button, in order; none — no button. */
  messengers: Messenger[]
  /** Prefix of the heading ids: one per page (`home-…`, `about-…`). */
  idPrefix?: string
}

/**
 * «#Фирменные салоны» (README §6.1 п.5): map with pins, card of the first salon,
 * «Карта / Список» (the list is the «Салоны» page). No salons — no section.
 */
export function SalonsSection({ section, salons, ctaLabel, messengers, idPrefix = 'home' }: Props) {
  const headingId = `${idPrefix}-salons-title`
  const first = salons[0]
  if (!first) return null
  const title = section?.title?.trim()

  return (
    <section
      aria-labelledby={title ? headingId : undefined}
      aria-label={title ? undefined : (section?.label ?? undefined)}
      className="flex flex-col gap-heading pt-section xl:pt-section-xl"
    >
      <SectionHeading
        label={section?.label}
        title={title}
        id={headingId}
        className="page-container"
      />
      <div className="page-container">
        <HomeSalonMap salons={salons} ctaLabel={ctaLabel} messengers={messengers} />
      </div>
    </section>
  )
}
