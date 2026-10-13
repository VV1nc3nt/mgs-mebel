'use client'

import { useEffect, useRef, useState } from 'react'

import { HIT_AREA_Y } from '@/components/ui/hitArea'
import { SegmentFilter } from '@/components/ui/SegmentFilter'
import { useHoverCapable } from '@/hooks/useHoverCapable'
import { useSnapSlider } from '@/hooks/useSnapSlider'
import type { Messenger } from '@/lib/chrome'
import { cn } from '@/lib/cn'
import type { SalonView } from '@/lib/salons'
import { SalonList } from './SalonList'
import { SalonMapSlot } from './SalonMapSlot'
import { SalonPanel } from './SalonPanel'
import { SalonSlide } from './SalonSlide'

type View = 'map' | 'list'

type Props = {
  /** At least one salon, in the editor's order. */
  salons: SalonView[]
  /** Salon card button label (`salonsPage.map.cardCtaLabel`). */
  ctaLabel?: string | null
  messengers: Messenger[]
  /** After the count in the list (`salonsPage.map.listCaption`). */
  listCaption?: string | null
}

const VIEWS = [
  { value: 'map', label: 'Карта' },
  { value: 'list', label: 'Списком' },
] as const

/**
 * Salon cards and the map of the «Салоны» page (design: salons v2 §3–4): one selected salon for
 * the slider, its segments, the list and the card over the map; a pick from any of them selects it
 * everywhere and opens the card again. A card video plays on hover / keyboard focus with a mouse,
 * otherwise on the selected card.
 */
export function SalonsExplorer({ salons, ctaLabel, messengers, listCaption }: Props) {
  const [view, setView] = useState<View>('map')
  const [cardOpen, setCardOpen] = useState(true)
  const [hot, setHot] = useState<number | null>(null)
  const hoverCapable = useHoverCapable()
  // A swipe selects the salon it rests on and opens its card over the map again
  const { track, active, goTo, onScroll, onScrollEnd } = useSnapSlider({
    onScrollSelect: () => setCardOpen(true),
  })
  const titleRef = useRef<HTMLHeadingElement>(null)
  const focusTitle = useRef(false)
  const count = salons.length
  const current = salons[active] ?? salons[0]

  // Unknown until hydrated: no video starts loading before the playback mode is known.
  const playingIndex = hoverCapable === null ? null : hoverCapable ? hot : active

  useEffect(() => {
    if (!focusTitle.current) return
    focusTitle.current = false
    titleRef.current?.focus()
  }, [view, active, cardOpen])

  const select = (index: number) => {
    goTo(index)
    setCardOpen(true)
  }

  const pickFromList = (index: number) => {
    focusTitle.current = true
    setView('map')
    select(index)
  }

  const setHotFor = (index: number) => (on: boolean) =>
    setHot((prev) => (on ? index : prev === index ? null : prev))

  return (
    <>
      <section
        aria-roledescription="карусель"
        aria-labelledby="salons-cards-title"
        className="flex flex-col gap-3 pt-6"
      >
        <h2 id="salons-cards-title" className="sr-only">
          Салоны
        </h2>
        {/* py-1 −my-1: room for the outside focus ring, which the scrolling track would clip.
            Cards snap by the start on mobile, by the center on tablet: with 44 % cards the last two
            would both snap to the end of the track, and the third could not be reached. */}
        <div
          ref={track}
          onScroll={onScroll}
          onScrollEnd={onScrollEnd}
          className="page-container -my-1 no-scrollbar flex snap-x snap-mandatory scroll-pl-gutter gap-3 overflow-x-auto py-1 md:scroll-px-gutter-md xl:grid xl:grid-cols-4 xl:overflow-visible"
        >
          {salons.map((salon, i) => (
            <SalonSlide
              key={salon.id}
              salon={salon}
              position={i + 1}
              count={count}
              selected={i === active}
              playing={i === playingIndex}
              priority={i === 0}
              onSelect={() => select(i)}
              onHotChange={setHotFor(i)}
            />
          ))}
        </div>
        {count > 1 && (
          <div className="page-container flex gap-1.5 xl:hidden">
            {salons.map((salon, i) => (
              <button
                key={salon.id}
                type="button"
                aria-label={`Показать салон ${salon.name}`}
                aria-current={i === active ? 'true' : undefined}
                onClick={() => select(i)}
                className={cn('relative flex h-5 flex-1 cursor-pointer items-center', HIT_AREA_Y)}
              >
                <span
                  className={cn(
                    'h-0.75 w-full rounded-xs transition-colors duration-200',
                    i === active ? 'bg-accent' : 'bg-text/25',
                  )}
                />
              </button>
            ))}
          </div>
        )}
      </section>
      <section aria-labelledby="salons-map-title" className="page-container pt-4 xl:pt-6">
        <h2 id="salons-map-title" className="sr-only">
          Салоны на карте
        </h2>
        <SalonMapSlot salons={salons} activeId={current.id}>
          {view === 'map' ? (
            <SalonPanel
              salon={current}
              ctaLabel={ctaLabel}
              messengers={messengers}
              open={cardOpen}
              onOpenChange={setCardOpen}
              titleRef={titleRef}
            />
          ) : (
            <SalonList
              salons={salons}
              active={active}
              caption={listCaption}
              onPick={pickFromList}
            />
          )}
          <div className="absolute top-4 right-4">
            <SegmentFilter
              variant="overlay"
              items={VIEWS}
              value={view}
              onChange={setView}
              label="Вид: карта или список"
            />
          </div>
        </SalonMapSlot>
      </section>
    </>
  )
}
