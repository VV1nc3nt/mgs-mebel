import { SectionHeading } from '@/components/ui/SectionHeading'
import { capabilityCount } from '@/lib/designers'
import type { Designer } from '@/payload-types'
import { CapabilityCard } from './CapabilityCard'

type Props = {
  /** `capabilities` of the designers global. */
  capabilities: Designer['capabilities'] | undefined
  idPrefix?: string
}

/**
 * «#возможности» (designers v2 §2.2): label, H2 and the counter, then the cards — a scroll-snap
 * strip on mobile, 2 columns on tablet, 3 on desktop. Cards without a title are left out; none —
 * no section.
 */
export function CapabilitiesSection({ capabilities, idPrefix = 'designers' }: Props) {
  const items = (capabilities?.items ?? []).filter((item) => item.title?.trim())
  if (!items.length) return null
  const titleId = `${idPrefix}-capabilities-title`

  return (
    <section
      aria-labelledby={capabilities?.title ? titleId : undefined}
      className="flex flex-col gap-heading pt-16 xl:pt-section-xl"
    >
      <div className="page-container flex items-end justify-between gap-3">
        <SectionHeading label={capabilities?.label} title={capabilities?.title} id={titleId} />
        <p className="shrink-0 pb-1 text-body-xs font-semibold text-text-4">
          {capabilityCount(items.length)}
        </p>
      </div>
      {/* Focusable: the mobile strip scrolls with the keyboard too */}
      <ul
        tabIndex={0}
        aria-labelledby={capabilities?.title ? titleId : undefined}
        className="page-container no-scrollbar flex snap-x snap-mandatory scroll-pl-gutter gap-2.5 overflow-x-auto md:grid md:grid-cols-2 md:overflow-visible xl:grid-cols-3"
      >
        {items.map((item, i) => (
          <li key={item.id ?? i} className="shrink-0 basis-capability-card snap-start md:min-w-0">
            <CapabilityCard item={item} index={i} />
          </li>
        ))}
      </ul>
    </section>
  )
}
