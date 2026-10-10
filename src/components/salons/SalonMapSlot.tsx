import type { ReactNode } from 'react'

import type { SalonPin } from '@/lib/queries'

type Props = {
  salons: Pick<SalonPin, 'id' | 'name' | 'location'>[]
  /** Salon of the open card: its pin is the active one. */
  activeId: SalonPin['id'] | undefined
  /** Layer over the map: view switch, salon card. */
  children?: ReactNode
}

// Pins of the placeholder, as in the design: two grey ones and the active lime one.
const GREY_PINS = [
  { x: '22%', y: '18%' },
  { x: '70%', y: '26%' },
]
const ACTIVE_PIN = { x: '45%', y: '20%' }

/**
 * Static map placeholder (design: home): street lines and pins, decorative, not clickable.
 * No viewBox: user units are pixels, so the pins keep their size at any width.
 */
function MapPlaceholder() {
  return (
    <svg aria-hidden="true" className="absolute inset-0 size-full">
      <defs>
        <pattern
          id="salon-map-lines"
          width="1"
          height="65"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(32)"
        >
          <rect y="62" width="1" height="3" className="fill-map-line" />
        </pattern>
        <pattern
          id="salon-map-lines-2"
          width="1"
          height="96"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-58)"
        >
          <rect y="94" width="1" height="2" className="fill-map-line-2" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#salon-map-lines)" />
      <rect width="100%" height="100%" fill="url(#salon-map-lines-2)" />
      {GREY_PINS.map(({ x, y }) => (
        <g key={x}>
          <circle cx={x} cy={y} r="9" className="fill-pin/20" />
          <circle cx={x} cy={y} r="5" className="fill-pin" />
        </g>
      ))}
      <circle cx={ACTIVE_PIN.x} cy={ACTIVE_PIN.y} r="26" className="fill-accent/8" />
      <circle cx={ACTIVE_PIN.x} cy={ACTIVE_PIN.y} r="16" className="fill-accent/20" />
      <circle cx={ACTIVE_PIN.x} cy={ACTIVE_PIN.y} r="8" className="fill-accent" />
    </svg>
  )
}

/**
 * Map block of the salons (README §6.1 п.5, §6.3): 500 / 560 / 640 high.
 * Step 8 replaces the placeholder with the Yandex map (client-only, next/dynamic ssr:false)
 * that takes the same props.
 */
export function SalonMapSlot({ children }: Props) {
  return (
    <div className="relative h-map overflow-hidden rounded-media bg-map-bg md:h-tall-md xl:h-tall-xl">
      <MapPlaceholder />
      {children}
    </div>
  )
}
