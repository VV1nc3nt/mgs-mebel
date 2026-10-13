import { StatCard } from '@/components/ui/StatCard'
import { cn } from '@/lib/cn'
import type { Stat } from '@/payload-types'

type Props = {
  /** The `stats` global; empty on a fresh database. */
  items: Stat['items'] | null | undefined
  /** strip — a scroll-snap strip of 164 cards in the page container; grid — 3 columns, larger values. */
  variant?: 'strip' | 'grid'
  className?: string
}

/**
 * Statistics (about v2 §2.2, §2.4): under 1280 a strip under the hero, from 1280 a 3-column grid
 * in «История». Which one shows where is up to the page.
 */
export function StatsSection({ items, variant = 'strip', className }: Props) {
  if (!items?.length) return null
  if (variant === 'grid') {
    return (
      <ul className={cn('grid grid-cols-3 gap-2.5', className)}>
        {items.map((item) => (
          <li key={item.id ?? item.value} className="flex min-w-0">
            <StatCard value={item.value} label={item.label} size="lg" className="w-full" />
          </li>
        ))}
      </ul>
    )
  }
  return (
    // Focusable: the strip scrolls with the keyboard too.
    <ul
      tabIndex={0}
      className={cn(
        'page-container no-scrollbar flex snap-x snap-mandatory scroll-px-gutter gap-2.5 overflow-x-auto md:scroll-px-gutter-md',
        className,
      )}
    >
      {items.map((item) => (
        <li key={item.id ?? item.value} className="flex w-stat-card shrink-0 snap-start">
          <StatCard value={item.value} label={item.label} className="w-full" />
        </li>
      ))}
    </ul>
  )
}
