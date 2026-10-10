'use client'

import { useEffect, useRef, useState, type Ref } from 'react'

import { Button } from '@/components/ui/Button'
import type { Messenger } from '@/lib/chrome'
import type { SalonPin } from '@/lib/queries'
import { SalonCard } from './SalonCard'

type Props = {
  salon: Pick<SalonPin, 'name' | 'address' | 'phone'>
  ctaLabel?: string | null
  messengers: Messenger[]
  /** Controlled mode (the «Салоны» page): the card is open; without it the panel keeps its own state. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** The card's name, focusable from code. */
  titleRef?: Ref<HTMLHeadingElement>
}

/**
 * Salon card over the map with × → «Показать салон» and back. Focus follows the toggle,
 * so keyboard users stay on the control that brings the other state back.
 */
export function SalonPanel({
  salon,
  ctaLabel,
  messengers,
  open: openProp,
  onOpenChange,
  titleRef,
}: Props) {
  const [openState, setOpenState] = useState(true)
  const open = openProp ?? openState
  const toggled = useRef(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const showRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    // Only after × or «Показать салон»: not on mount and not when the page opens the card.
    if (!toggled.current) return
    toggled.current = false
    ;(open ? closeRef : showRef).current?.focus()
  }, [open])

  const toggle = (next: boolean) => {
    toggled.current = true
    setOpenState(next)
    onOpenChange?.(next)
  }

  return open ? (
    <SalonCard
      salon={salon}
      ctaLabel={ctaLabel}
      messengers={messengers}
      onClose={() => toggle(false)}
      closeRef={closeRef}
      titleRef={titleRef}
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
