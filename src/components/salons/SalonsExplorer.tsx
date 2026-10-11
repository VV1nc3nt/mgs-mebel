'use client'

import { useEffect, useEffectEvent, useRef, useState } from 'react'

import { HIT_AREA_Y } from '@/components/ui/hitArea'
import { SegmentFilter } from '@/components/ui/SegmentFilter'
import { useHoverCapable } from '@/hooks/useHoverCapable'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { Messenger } from '@/lib/chrome'
import { cn } from '@/lib/cn'
import type { SalonView } from '@/lib/salons'
import { nearestSlide, snapTargets } from '@/lib/slider'
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

// Browsers without `scrollend`: a programmatic scroll is over this long after its last frame.
const SCROLL_SETTLE_MS = 150

/**
 * Where the track rests for each card, read anew every time: the card width and snap-align change
 * at 768 and 1280 (mobile — start, tablet — center, desktop — a grid without scrolling).
 */
const measure = (root: HTMLElement) => {
  const style = getComputedStyle(root)
  const slides = Array.from(root.children as HTMLCollectionOf<HTMLElement>)
  // `scroll-snap-align` is «block inline» or one value for both: the last word is the inline axis
  const align = slides[0] && getComputedStyle(slides[0]).scrollSnapAlign.split(' ').pop()
  const max = root.scrollWidth - root.clientWidth
  const targets = snapTargets(
    slides.map((slide) => ({ left: slide.offsetLeft, width: slide.offsetWidth })),
    {
      width: root.clientWidth,
      paddingStart: parseFloat(style.scrollPaddingLeft) || 0,
      paddingEnd: parseFloat(style.scrollPaddingRight) || 0,
      maxScroll: max,
    },
    align === 'center' ? 'center' : 'start',
  )
  return { targets, max }
}

/**
 * Salon cards and the map of the «Салоны» page (design: salons v2 §3–4): one selected salon for
 * the slider, its segments, the list and the card over the map; a pick from any of them selects it
 * everywhere and opens the card again. A card video plays on hover / keyboard focus with a mouse,
 * otherwise on the selected card.
 */
export function SalonsExplorer({ salons, ctaLabel, messengers, listCaption }: Props) {
  const [active, setActive] = useState(0)
  const [view, setView] = useState<View>('map')
  const [cardOpen, setCardOpen] = useState(true)
  const [hot, setHot] = useState<number | null>(null)
  const hoverCapable = useHoverCapable()
  const reducedMotion = useReducedMotion()
  const track = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const focusTitle = useRef(false)
  // A pick scrolls the track: until it settles, the slides it passes do not become active.
  const pending = useRef(false)
  const settle = useRef<number | undefined>(undefined)
  const frame = useRef<number | undefined>(undefined)
  const lastWidth = useRef(0)
  const count = salons.length
  const current = salons[active] ?? salons[0]

  // Unknown until hydrated: no video starts loading before the playback mode is known.
  const playingIndex = hoverCapable === null ? null : hoverCapable ? hot : active

  useEffect(
    () => () => {
      window.clearTimeout(settle.current)
      if (frame.current !== undefined) cancelAnimationFrame(frame.current)
    },
    [],
  )

  useEffect(() => {
    if (!focusTitle.current) return
    focusTitle.current = false
    titleRef.current?.focus()
  }, [view, active, cardOpen])

  const settleLater = () => {
    window.clearTimeout(settle.current)
    settle.current = window.setTimeout(() => {
      pending.current = false
    }, SCROLL_SETTLE_MS)
  }

  /**
   * Scrolls the track to a card's snap target, horizontally only: the page does not move, and the
   * cards it passes do not become active. False when there is nothing to scroll.
   */
  const scrollToTarget = (index: number, behavior: ScrollBehavior) => {
    const root = track.current
    if (!root?.children[index]) return false
    const { targets, max } = measure(root)
    if (max <= 0) return false
    // The card's own snap target: the scroll ends where the snap keeps it
    const left = targets[index]
    if (Math.abs(left - root.scrollLeft) < 1) return false
    pending.current = true
    // An instant scroll may end without `scrollend` (Safari): the timer releases the picks anyway
    if (behavior === 'auto' || !('onscrollend' in window)) settleLater()
    root.scrollTo({ left, behavior })
    return true
  }

  const scrollToSlide = (index: number) => {
    scrollToTarget(index, reducedMotion ? 'auto' : 'smooth')
  }

  const select = (index: number) => {
    setActive(index)
    setCardOpen(true)
    scrollToSlide(index)
  }

  /** Next frame: the card whose snap target is nearest to the scroll position becomes active. */
  const syncActive = () => {
    if (frame.current !== undefined) cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      frame.current = undefined
      const root = track.current
      if (!root || pending.current) return
      const { targets, max } = measure(root)
      if (max <= 0) return
      const next = nearestSlide(targets, root.scrollLeft)
      if (next === active) return
      setActive(next)
      setCardOpen(true)
    })
  }

  const onTrackScroll = () => {
    if (pending.current) {
      if (!('onscrollend' in window)) settleLater()
      return
    }
    syncActive()
  }

  // The selected card's new target, read in the frame after the resize
  const realign = useEffectEvent(() => {
    if (!scrollToTarget(active, 'auto')) pending.current = false
  })

  // A turn of the device changes the targets (start ↔ center): until the track rests on the new
  // one, its scroll position belongs to no card. A resize keeps the selection and the card over the
  // map as they are: picks are held at once (the browser's own re-snap scrolls before the next
  // frame), and the track moves to the selected card's target instantly.
  const onResize = useEffectEvent(() => {
    pending.current = true
    window.clearTimeout(settle.current)
    if (frame.current !== undefined) cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      frame.current = undefined
      realign()
    })
  })

  useEffect(() => {
    lastWidth.current = window.innerWidth
    // Only a new width (a turn, a breakpoint): iOS Safari also resizes the window when its toolbars
    // fold on a vertical scroll, and a swipe at that moment must not jump back (as in lib/chooser.ts)
    const listener = () => {
      if (window.innerWidth === lastWidth.current) return
      lastWidth.current = window.innerWidth
      onResize()
    }
    window.addEventListener('resize', listener, { passive: true })
    return () => window.removeEventListener('resize', listener)
  }, [])

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
          onScroll={onTrackScroll}
          onScrollEnd={() => {
            pending.current = false
          }}
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
          <SegmentFilter
            variant="overlay"
            items={VIEWS}
            value={view}
            onChange={setView}
            label="Вид: карта или список"
            className="absolute top-4 right-4"
          />
        </SalonMapSlot>
      </section>
    </>
  )
}
