import Link from 'next/link'

import { SalonMapSlot } from '@/components/salons/SalonMapSlot'
import { SalonPanel } from '@/components/salons/SalonPanel'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { segmentOverlayGroup, segmentOverlayItem } from '@/components/ui/segmentStyles'
import type { Messenger } from '@/lib/chrome'
import { cn } from '@/lib/cn'
import type { SalonPin } from '@/lib/queries'
import type { SectionSalons } from '@/payload-types'

type Props = {
  section: Partial<SectionSalons> | undefined
  /** Salons in the editor's order; the card shows the first one. */
  salons: SalonPin[]
  /** Card button label from the «Салоны» page. */
  ctaLabel?: string | null
  action: Messenger | undefined
}

const HEADING_ID = 'home-salons-title'

/**
 * «#Фирменные салоны» (README §6.1 п.5): map with pins, card of the first salon,
 * «Карта / Список» (the list is the «Салоны» page). No salons — no section.
 */
export function SalonsSection({ section, salons, ctaLabel, action }: Props) {
  const first = salons[0]
  if (!first) return null
  const title = section?.title?.trim()

  return (
    <section
      aria-labelledby={title ? HEADING_ID : undefined}
      aria-label={title ? undefined : (section?.label ?? undefined)}
      className="flex flex-col gap-heading pt-section xl:pt-section-xl"
    >
      <SectionHeading
        label={section?.label}
        title={title}
        id={HEADING_ID}
        className="page-container"
      />
      <div className="page-container">
        <SalonMapSlot salons={salons} activeId={first.id}>
          <div
            role="group"
            aria-label="Вид: карта или список"
            className={cn('absolute top-4 right-4', segmentOverlayGroup)}
          >
            <span aria-current="true" className={segmentOverlayItem(true)}>
              Карта
            </span>
            <Link href="/salons" className={segmentOverlayItem(false)}>
              Список
            </Link>
          </div>
          <SalonPanel salon={first} ctaLabel={ctaLabel} action={action} />
        </SalonMapSlot>
      </div>
    </section>
  )
}
