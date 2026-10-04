'use client'

import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'
import type { Messenger } from '@/lib/chrome'
import type { SalonPin } from '@/lib/queries'
import { SalonCard } from './SalonCard'

type Props = {
  salon: SalonPin
  ctaLabel?: string | null
  action: Messenger | undefined
}

/**
 * Salon card over the map with × → «Показать салон» and back. Focus follows the toggle,
 * so keyboard users stay on the control that brings the other state back.
 */
export function SalonPanel({ salon, ctaLabel, action }: Props) {
  const [open, setOpen] = useState(true)
  const toggled = useRef(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const showRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    // Not on mount: the page must not steal focus.
    if (!toggled.current) return
    ;(open ? closeRef : showRef).current?.focus()
  }, [open])

  const toggle = (next: boolean) => {
    toggled.current = true
    setOpen(next)
  }

  return open ? (
    <SalonCard
      salon={salon}
      ctaLabel={ctaLabel}
      action={action}
      onClose={() => toggle(false)}
      closeRef={closeRef}
      className="absolute inset-x-3 bottom-3"
    />
  ) : (
    <Button
      ref={showRef}
      onClick={() => toggle(true)}
      variant="light"
      size={44}
      className="absolute bottom-3 left-3"
    >
      Показать салон
    </Button>
  )
}
