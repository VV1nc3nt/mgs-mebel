'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { Messenger } from '@/lib/chrome'
import type { SalonPin } from '@/lib/queries'
import { cn } from '@/lib/cn'
import { segmentOverlayGroup, segmentOverlayItem } from '@/components/ui/segmentStyles'
import { SalonMapSlot } from './SalonMapSlot'
import { SalonPanel } from './SalonPanel'

export function HomeSalonMap({
  salons,
  ctaLabel,
  messengers,
}: {
  salons: SalonPin[]
  ctaLabel?: string | null
  messengers: Messenger[]
}) {
  const [activeId, setActiveId] = useState(salons[0]?.id)
  const [open, setOpen] = useState(true)
  const current = salons.find((salon) => salon.id === activeId) ?? salons[0]
  if (!current) return null
  return (
    <SalonMapSlot
      salons={salons}
      activeId={current.id}
      onPick={(id) => {
        setActiveId(id)
        setOpen(true)
      }}
    >
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
      <SalonPanel
        salon={current}
        ctaLabel={ctaLabel}
        messengers={messengers}
        open={open}
        onOpenChange={setOpen}
      />
    </SalonMapSlot>
  )
}
