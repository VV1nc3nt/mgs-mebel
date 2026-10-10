import { ArrowRight } from 'lucide-react'

import { cn } from '@/lib/cn'
import { plural } from '@/lib/plural'
import type { SalonView } from '@/lib/salons'

type Props = {
  salons: SalonView[]
  active: number
  /** After the count, e.g. «в Москве и области» (`salonsPage.map.listCaption`). */
  caption?: string | null
  onPick: (index: number) => void
}

const SALON_FORMS = ['салон', 'салона', 'салонов'] as const

/**
 * Salon list over the map (design: salons v2 §4): count, then a row per salon; a row selects the
 * salon and goes back to the map. A row is named by the salon name, the address describes it.
 */
export function SalonList({ salons, active, caption, onPick }: Props) {
  const count = `${salons.length} ${plural(salons.length, SALON_FORMS)}`

  return (
    <div className="absolute inset-0 no-scrollbar overflow-y-auto bg-surface-2 px-3 pt-18 pb-3 md:px-6">
      <p className="px-2 pb-3 text-caption font-normal text-text-4">
        {caption?.trim() ? `${count} ${caption.trim()}` : count}
      </p>
      <ul className="grid gap-2 md:grid-cols-2">
        {salons.map((salon, i) => {
          const selected = i === active
          const nameId = `salon-row-${salon.id}-name`
          const addressId = `salon-row-${salon.id}-address`
          return (
            <li key={salon.id}>
              <button
                type="button"
                aria-current={selected ? 'true' : undefined}
                aria-labelledby={nameId}
                aria-describedby={addressId}
                onClick={() => onPick(i)}
                className={cn(
                  'flex size-full cursor-pointer items-center gap-3.5 rounded-thumb-lg border p-4 text-left transition-colors',
                  selected
                    ? 'border-accent bg-surface-selected'
                    : 'border-border bg-surface hover:border-border-hover',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-full',
                    selected ? 'bg-accent/15' : 'bg-surface-3',
                  )}
                >
                  <span
                    className={cn('size-2.5 rounded-full', selected ? 'bg-accent' : 'bg-pin')}
                  />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span id={nameId} className="text-base/tight font-bold">
                    {salon.name}
                  </span>
                  <span id={addressId} className="text-body-xs text-text-3">
                    {salon.address}
                  </span>
                  {salon.phone && (
                    <span className="text-body-xs font-semibold text-text-2">{salon.phone}</span>
                  )}
                </span>
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-3"
                >
                  <ArrowRight className="size-3.5" />
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
