'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/cn'
import { segmentItemBase, segmentOverlayGroup, segmentOverlayItem } from './segmentStyles'

export type SegmentItem<T extends string> = { value: T; label: string }

export type SegmentFilterProps<T extends string> = {
  items: readonly SegmentItem<T>[]
  value: T
  onChange: (value: T) => void
  /** Accessible name of the group, e.g. «Категории работ». */
  label: string
  /**
   * `bar` — segment bar of «Наши работы» / «Каталоги» (README §5.7);
   * `overlay` — «Карта / Список» switch over the map (design: home, salons).
   */
  variant?: 'bar' | 'overlay'
  /** Full-width sticky bar on glass with a bottom line, contents in the page container (bar only). */
  sticky?: boolean
  /** Result counter under the bar, e.g. «60 работ · комплекс» (bar only). */
  count?: string
  /** Right side of the counter row, e.g. sorting (bar only). */
  extra?: ReactNode
  className?: string
}

const CONTAINER = 'page-container'

/**
 * Single-choice filter: a group of toggle buttons (aria-pressed). Explicit activation with
 * Enter/Space and a Tab stop per item, so moving focus never reloads results. Controlled.
 */
export function SegmentFilter<T extends string>({
  items,
  value,
  onChange,
  label,
  variant = 'bar',
  sticky = false,
  count,
  extra,
  className,
}: SegmentFilterProps<T>) {
  const reducedMotion = useReducedMotion()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)
  const [fade, setFade] = useState(false)

  // Fade on the right only while there is more to scroll.
  const updateFade = useCallback(() => {
    const el = scrollerRef.current
    if (el) setFade(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }, [])

  useEffect(() => {
    updateFade()
    window.addEventListener('resize', updateFade)
    return () => window.removeEventListener('resize', updateFade)
  }, [updateFade, items])

  // Keep the active item visible. scrollTo on the bar itself: scrollIntoView would also
  // scroll the page vertically under a sticky bar.
  useEffect(() => {
    const scroller = scrollerRef.current
    const active = activeRef.current
    if (!scroller || !active) return
    const start = active.offsetLeft
    const end = start + active.offsetWidth
    let left: number | null = null
    if (start < scroller.scrollLeft) left = start
    else if (end > scroller.scrollLeft + scroller.clientWidth) left = end - scroller.clientWidth
    if (left !== null) scroller.scrollTo({ left, behavior: reducedMotion ? 'auto' : 'smooth' })
  }, [value, reducedMotion])

  const buttons = items.map((item) => {
    const selected = item.value === value
    return (
      <button
        key={item.value}
        ref={selected ? activeRef : undefined}
        type="button"
        aria-pressed={selected}
        onClick={() => onChange(item.value)}
        className={
          variant === 'bar'
            ? cn(
                segmentItemBase,
                'h-9.5 gap-1.75 px-4 text-button-s',
                selected
                  ? 'bg-text text-bg shadow-segment'
                  : 'font-semibold text-text-3 hover:bg-surface-3 hover:text-text',
              )
            : segmentOverlayItem(selected)
        }
      >
        {variant === 'bar' && selected && (
          <span aria-hidden="true" className="size-1.5 rounded-full bg-accent ring-2 ring-bg" />
        )}
        {item.label}
      </button>
    )
  })

  if (variant === 'overlay') {
    return (
      <div role="group" aria-label={label} className={cn(segmentOverlayGroup, className)}>
        {buttons}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-3',
        sticky && 'sticky top-0 z-10 border-b border-line-sticky glass-sticky pt-4 pb-3.5',
        className,
      )}
    >
      <div className={cn(sticky && CONTAINER)}>
        <div className="relative md:max-w-max">
          <div
            ref={scrollerRef}
            role="group"
            aria-label={label}
            onScroll={updateFade}
            className="relative no-scrollbar flex gap-1 overflow-x-auto rounded-media border border-border bg-surface p-1"
          >
            {buttons}
          </div>
          {fade && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-px right-px w-9 rounded-r-media bg-linear-to-r from-surface/0 to-surface"
            />
          )}
        </div>
      </div>
      {(count || extra) && (
        <div
          className={cn(
            'flex items-center justify-between gap-3 text-caption font-normal text-text-4',
            sticky && CONTAINER,
          )}
        >
          <p aria-live="polite">{count}</p>
          {extra}
        </div>
      )}
    </div>
  )
}
