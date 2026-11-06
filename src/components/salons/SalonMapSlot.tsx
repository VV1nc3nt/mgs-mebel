import type { ReactNode } from 'react'

import { salonMapHref, type MapSalon } from '@/lib/salonMap'
import { SalonMap } from './SalonMap'

type Props = {
  salons: MapSalon[]
  activeId: number | undefined
  onPick?: (id: number) => void
  hidden?: boolean
  children?: ReactNode
}

/** Shared fixed-height shell: server-rendered content survives an unavailable external map. */
export function SalonMapSlot({ salons, activeId, onPick, hidden = false, children }: Props) {
  const current = salons.find((salon) => salon.id === activeId)
  const href = current && salonMapHref(current.location)
  return (
    <div
      data-salon-map-slot
      className="relative isolate h-map overflow-hidden rounded-media bg-map-bg md:h-tall-md xl:h-tall-xl"
    >
      <div className="absolute inset-0 isolate" hidden={hidden} inert={hidden}>
        <SalonMap salons={salons} activeId={activeId} onPick={onPick} />
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-3 left-3 inline-flex min-h-11 max-w-2/5 items-center text-body-xs font-semibold text-text underline underline-offset-4"
          >
            Открыть в Картах
          </a>
        )}
      </div>
      {children}
    </div>
  )
}
