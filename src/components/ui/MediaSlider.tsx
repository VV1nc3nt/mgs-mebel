'use client'

import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'

import { useSnapSlider } from '@/hooks/useSnapSlider'
import { cn } from '@/lib/cn'
import { atEnd, atStart, clampIndex, counterParts } from '@/lib/slider'
import { BgVideoActiveProvider } from './BgVideoActive'
import { IconButton } from './IconButton'

/**
 * Card sizes, per breakpoint: exhibitions «О нас» — 86 % / 62 % / min(78 %, 1120) of the track,
 * 440 / 520 / 620 high (about v2 §2.7); projects «Дизайнерам» — 86 % · 4:5 / 80 % · 16:10 /
 * min(82 %, 1180) · 16:8 (designers v2 §2.3). The heading row: 24 / 16 between the heading and
 * the controls.
 */
const SIZE = {
  exhibition: {
    slide:
      'basis-expo-slide h-expo-card md:basis-expo-slide-md md:h-expo-card-md xl:basis-expo-slide-xl xl:h-expo-card-xl',
    head: 'gap-6',
  },
  project: {
    slide:
      'basis-project-slide aspect-4/5 md:basis-project-slide-md md:aspect-16/10 xl:basis-project-slide-xl xl:aspect-16/8',
    head: 'gap-4',
  },
} as const

export type MediaSliderSize = keyof typeof SIZE

type Props = {
  /** Cards rendered on the server, one per slide. */
  slides: ReactNode[]
  /** Section label, H2 and text. */
  heading: ReactNode
  /** Id of the H2: names the section and the track. */
  headingId: string
  size: MediaSliderSize
  /** Desktop: ← / → by one card, looking disabled at the ends. */
  arrows?: boolean
  /** «01 / 04» next to the heading. */
  counter?: boolean
  /** Below the track, under 1280: one bar per card, the active one lime. */
  progress?: boolean
  /** Names of the arrows, e.g. «Предыдущая выставка». */
  prevLabel?: string
  nextLabel?: string
  className?: string
}

/**
 * Media slider (about v2 §2.7, designers v2 §2.3): cards on a native scroll-snap track, the next
 * one showing at the edge; the active card is the one the track rests on (useSnapSlider), and only
 * its background videos play (BgVideoActiveProvider: a card left pauses and resumes where it was;
 * the others have no source until they are first active). The first card is active on the server
 * and on hydration. One card — no arrows, counter or progress; none — nothing.
 */
export function MediaSlider({
  slides,
  heading,
  headingId,
  size,
  arrows = false,
  counter = false,
  progress = false,
  prevLabel = 'Назад',
  nextLabel = 'Вперёд',
  className,
}: Props) {
  const { track, active, goTo, onScroll, onScrollEnd } = useSnapSlider()
  const count = slides.length
  if (!count) return null
  const controls = count > 1
  const [current, total] = counterParts(active, count)

  // At an end the arrow stays focusable (aria-disabled): Enter there does nothing, the focus stays
  const step = (direction: 1 | -1) => {
    if (direction < 0 ? atStart(active) : atEnd(active, count)) return
    goTo(clampIndex(active + direction, count))
  }

  return (
    <section
      aria-labelledby={headingId}
      aria-roledescription="карусель"
      className={cn('flex flex-col gap-heading', className)}
    >
      <div className={cn('page-container flex items-end justify-between', SIZE[size].head)}>
        <div className="min-w-0">{heading}</div>
        {controls && (counter || arrows) && (
          <div className="flex shrink-0 items-center gap-4">
            {counter && (
              <p className="pb-1 text-body-xs font-semibold text-text-4 tabular-nums">
                <span className="text-text">{current}</span> / {total}
              </p>
            )}
            {arrows && (
              <div className="hidden gap-2.5 xl:flex">
                <IconButton
                  variant="outline"
                  size={52}
                  aria-label={prevLabel}
                  aria-disabled={atStart(active) || undefined}
                  onClick={() => step(-1)}
                >
                  <ArrowLeft />
                </IconButton>
                <IconButton
                  variant="accent"
                  size={52}
                  aria-label={nextLabel}
                  aria-disabled={atEnd(active, count) || undefined}
                  onClick={() => step(1)}
                >
                  <ArrowRight />
                </IconButton>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Focusable: the track scrolls with the keyboard too */}
      <div
        ref={track}
        tabIndex={0}
        aria-labelledby={headingId}
        onScroll={onScroll}
        onScrollEnd={onScrollEnd}
        className="page-container no-scrollbar flex snap-x snap-mandatory scroll-pl-gutter gap-3 overflow-x-auto md:scroll-pl-gutter-md xl:scroll-pl-gutter-xl"
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            role="group"
            aria-roledescription="слайд"
            aria-label={`${i + 1} из ${count}`}
            data-active={i === active ? '' : undefined}
            className={cn(
              'relative shrink-0 snap-start overflow-hidden rounded-media bg-surface',
              SIZE[size].slide,
            )}
          >
            <BgVideoActiveProvider value={i === active}>{slide}</BgVideoActiveProvider>
          </div>
        ))}
      </div>
      {controls && progress && (
        <div aria-hidden="true" className="page-container flex gap-1.5 xl:hidden">
          {slides.map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-0.75 flex-1 rounded-xs transition-colors duration-300',
                i === active ? 'bg-accent' : 'bg-border-strong',
              )}
            />
          ))}
        </div>
      )}
    </section>
  )
}
