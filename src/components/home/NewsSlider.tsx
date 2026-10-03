'use client'

import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { HIT_AREA_Y } from '@/components/ui/hitArea'
import { IconButton } from '@/components/ui/IconButton'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/cn'
import { nextIndex, prevIndex } from '@/lib/slider'

type Props = {
  /** Section label and H2. */
  heading: ReactNode
  /** Id of the H2 that names the carousel; without a heading, `label` names it. */
  headingId?: string
  label?: string
  /** Server-rendered slides, one card each. */
  slides: ReactNode[]
}

// The slide in view: the one at least this visible inside the track.
const VISIBLE = 0.6

/**
 * Home news slider (README §6.1 п.4): one card per view on a native scroll-snap track, arrows
 * in the section head going round, one set of progress segments over the track. Swipes and
 * keyboard scrolling move the segments too (IntersectionObserver on the slides).
 */
export function NewsSlider({ heading, headingId, label, slides }: Props) {
  const track = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const reducedMotion = useReducedMotion()
  const count = slides.length
  const controls = count > 1

  useEffect(() => {
    const root = track.current
    if (!root || !controls) return
    const items = Array.from(root.children) as HTMLElement[]
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(items.indexOf(entry.target as HTMLElement))
        }
      },
      { root, threshold: VISIBLE },
    )
    for (const item of items) observer.observe(item)
    return () => observer.disconnect()
  }, [controls, count])

  const show = (index: number) => {
    const root = track.current
    const slide = root?.children[index] as HTMLElement | undefined
    if (!root || !slide) return
    setActive(index)
    root.scrollTo({ left: slide.offsetLeft, behavior: reducedMotion ? 'auto' : 'smooth' })
  }

  return (
    <section
      aria-roledescription="карусель"
      aria-labelledby={headingId}
      aria-label={headingId ? undefined : label}
      className="flex flex-col gap-heading pt-section xl:pt-section-xl"
    >
      <div className="page-container flex items-end justify-between gap-4">
        <div className="min-w-0">{heading}</div>
        {controls && (
          <div className="flex shrink-0 gap-2">
            <IconButton
              variant="outline"
              size={44}
              aria-label="Предыдущая новость"
              onClick={() => show(prevIndex(active, count))}
            >
              <ArrowLeft />
            </IconButton>
            <IconButton
              variant="light"
              size={44}
              aria-label="Следующая новость"
              onClick={() => show(nextIndex(active, count))}
            >
              <ArrowRight />
            </IconButton>
          </div>
        )}
      </div>
      <div className="page-container">
        <div className="relative">
          <div
            ref={track}
            className="relative no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto rounded-media"
          >
            {slides.map((slide, i) => (
              <div
                key={i}
                role="group"
                aria-roledescription="слайд"
                aria-label={`${i + 1} из ${count}`}
                className="w-full shrink-0 snap-center"
              >
                {slide}
              </div>
            ))}
          </div>
          {controls && (
            <div className="absolute inset-x-5 bottom-5.5 flex max-w-slide-text gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Показать новость ${i + 1} из ${count}`}
                  aria-current={i === active ? 'true' : undefined}
                  onClick={() => show(i)}
                  className={cn(
                    'relative h-0.75 flex-1 rounded-full transition-colors',
                    HIT_AREA_Y,
                    i === active ? 'bg-accent' : 'bg-text/25 hover:bg-text/50',
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
