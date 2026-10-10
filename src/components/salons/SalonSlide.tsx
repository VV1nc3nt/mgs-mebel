import { Play } from 'lucide-react'
import Image from 'next/image'
import { useState, type FocusEvent } from 'react'

import { BgVideoPlayer } from '@/components/ui/BgVideoPlayer'
import { cn } from '@/lib/cn'
import { imageSizes } from '@/lib/media'
import type { SalonView } from '@/lib/salons'

type Props = {
  salon: SalonView
  /** Position in the slider, from 1, and the number of salons: «{k} из {N}». */
  position: number
  count: number
  /** The salon shown on the map. */
  selected: boolean
  /** Its video plays (the active card, or the one under the pointer / keyboard focus). */
  playing: boolean
  /** The LCP image of the page: the first card's photo. */
  priority?: boolean
  onSelect: () => void
  /** Pointer over the card or keyboard focus on it: true; gone: false. */
  onHotChange: (hot: boolean) => void
}

const SIZES = imageSizes({ base: '82vw', md: '44vw', xl: '25vw' })

/**
 * Salon card of the «Салоны» slider (design: salons v2 §3): photo, video over it, name and address.
 * A stretched button selects the salon; it carries both rings on one radius — the selected one
 * inside, the focus outline outside — so a focused selected card shows both.
 */
export function SalonSlide({
  salon,
  position,
  count,
  selected,
  playing,
  priority = false,
  onSelect,
  onHotChange,
}: Props) {
  const [shown, setShown] = useState(false)
  const titleId = `salon-${salon.id}-title`
  const addressId = `salon-${salon.id}-address`

  const onFocus = (event: FocusEvent<HTMLButtonElement>) => {
    if (event.currentTarget.matches(':focus-visible')) onHotChange(true)
  }

  return (
    <div
      role="group"
      aria-roledescription="слайд"
      aria-label={`${position} из ${count}`}
      className="w-salon-slide shrink-0 snap-start md:w-salon-slide-md xl:w-auto"
    >
      <article
        onPointerEnter={() => onHotChange(true)}
        onPointerLeave={() => onHotChange(false)}
        className="relative aspect-3/4"
      >
        <div className="absolute inset-0 isolate overflow-hidden rounded-media bg-surface">
          {salon.poster && (
            <Image
              src={salon.poster.src}
              alt={salon.poster.alt}
              fill
              sizes={SIZES}
              preload={priority}
              fetchPriority={priority ? 'high' : undefined}
              className="object-cover"
              style={{ objectPosition: salon.poster.position }}
            />
          )}
          {salon.video && (
            <BgVideoPlayer
              {...salon.video}
              active={playing}
              lazySrc
              hideOnPause
              onPlayingChange={setShown}
            />
          )}
          <div className="absolute inset-0 bg-overlay-salon" />
          {salon.video && (
            <span
              aria-hidden="true"
              className={cn(
                'absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-bg/60 backdrop-blur-soft transition-opacity duration-300',
                shown && 'opacity-0',
              )}
            >
              <Play className="size-2.75 fill-current" />
            </span>
          )}
        </div>
        <div className="absolute inset-x-5 bottom-5 flex flex-col gap-2">
          <h3 id={titleId} className="text-h3 text-balance">
            {salon.name}
          </h3>
          <p id={addressId} className="text-body-xs text-text-2">
            {salon.address}
          </p>
        </div>
        <button
          type="button"
          aria-pressed={selected}
          aria-labelledby={titleId}
          aria-describedby={addressId}
          onClick={onSelect}
          onFocus={onFocus}
          onBlur={() => onHotChange(false)}
          className={cn(
            'absolute inset-0 cursor-pointer rounded-media transition-shadow duration-200',
            selected && 'inset-ring-2 inset-ring-accent',
          )}
        />
      </article>
    </div>
  )
}
