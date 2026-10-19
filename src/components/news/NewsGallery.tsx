'use client'

import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'

import { IconButton } from '@/components/ui/IconButton'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useSnapSlider } from '@/hooks/useSnapSlider'
import type { GalleryPerView } from '@/lib/article'
import { cn } from '@/lib/cn'
import { pageStart, pageStep } from '@/lib/slider'

// Slide widths: the container split into the photos in view, the gap 12 between them
const BASIS_MD = { 2: 'md:basis-gallery-2', 3: 'md:basis-gallery-3' } as const
const BASIS_XL = {
  2: 'xl:basis-gallery-2',
  3: 'xl:basis-gallery-3',
  4: 'xl:basis-gallery-4',
} as const

type Props = {
  /** Photos rendered on the server, one per slide. */
  slides: ReactNode[]
  perView: GalleryPerView
  caption: string | null
}

/**
 * Photo slider of a news body (README §6.8): the photos in view per breakpoint (galleryPerView),
 * the widths set by classes — no measuring. When all of them fit, a plain row without controls;
 * else a native scroll-snap track with «k / N» (k — the first photo in view) and arrows that move
 * by the photos in view, aria-disabled at the ends. The first photo is active on the server and on
 * hydration; the breakpoint is read only for the arrows and the counter.
 */
export function NewsGallery({ slides, perView, caption }: Props) {
  const { track, active, goTo, onScroll, onScrollEnd } = useSnapSlider()
  const inView = perView[useBreakpoint()]
  const count = slides.length
  const start = pageStart(active, count, inView)
  const first = start <= 0
  const last = start >= count - inView
  // Controls where not everything fits: always on mobile (2+ photos, one in view)
  const controls = cn(
    'flex',
    count > perView.md ? 'md:flex' : 'md:hidden',
    count > perView.xl ? 'xl:flex' : 'xl:hidden',
  )

  // At an end the arrow stays focusable (aria-disabled): Enter there does nothing
  const step = (direction: 1 | -1) => {
    if (direction < 0 ? first : last) return
    goTo(pageStep(active, direction, count, inView))
  }

  return (
    // One wrapping row under the track: the caption at the left, the controls at the right; the
    // caption stays the last child of the figure
    <figure
      data-article-gallery=""
      className="my-4 flex w-full flex-wrap items-center gap-x-4 gap-y-3"
    >
      <div
        ref={track}
        role="group"
        aria-roledescription="карусель"
        aria-label={caption ? `Фотографии: ${caption}` : 'Фотографии'}
        // Focusable while it scrolls: the track moves with the keyboard too
        tabIndex={count > inView ? 0 : -1}
        onScroll={onScroll}
        onScrollEnd={onScrollEnd}
        // Positioned: the slides' offsetParent, so their snap targets read from the track
        className="relative no-scrollbar flex basis-full snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain"
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            role="group"
            aria-roledescription="слайд"
            aria-label={`${i + 1} из ${count}`}
            className={cn(
              'shrink-0 basis-full snap-start',
              BASIS_MD[perView.md],
              BASIS_XL[perView.xl],
            )}
          >
            {slide}
          </div>
        ))}
      </div>
      <div className={cn('order-last ml-auto shrink-0 items-center gap-2', controls)}>
        <span className="pr-1 text-body-xs font-semibold text-text-2 tabular-nums">
          {start + 1} / {count}
        </span>
        <IconButton
          variant="outline-soft"
          size={40}
          aria-label="Назад"
          aria-disabled={first || undefined}
          onClick={() => step(-1)}
        >
          <ArrowLeft />
        </IconButton>
        <IconButton
          variant="outline-soft"
          size={40}
          aria-label="Вперёд"
          aria-disabled={last || undefined}
          onClick={() => step(1)}
        >
          <ArrowRight />
        </IconButton>
      </div>
      {caption && (
        <figcaption className="min-w-0 flex-1 text-body-xs text-text-4">{caption}</figcaption>
      )}
    </figure>
  )
}
