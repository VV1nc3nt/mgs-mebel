import { StatCard } from '@/components/ui/StatCard'
import { cn } from '@/lib/cn'
import type { Stat } from '@/payload-types'

type Props = {
  /** The `stats` global; empty on a fresh database. */
  items: Stat['items'] | null | undefined
  className?: string
}

/**
 * Statistics (README §6.1 п.2, §4; also on «О нас»): a scroll-snap carousel on mobile,
 * a grid of 3 on tablet and of 6 on desktop.
 */
export function StatsSection({ items, className }: Props) {
  if (!items?.length) return null
  return (
    // Focusable: the mobile carousel scrolls with the keyboard too.
    <ul
      tabIndex={0}
      className={cn(
        'no-scrollbar flex snap-x snap-mandatory scroll-px-gutter gap-2.5 overflow-x-auto px-gutter',
        'md:grid md:grid-cols-3 md:overflow-visible md:px-gutter-md xl:grid-cols-6 xl:px-gutter-xl',
        className,
      )}
    >
      {items.map((item) => (
        <li key={item.id ?? item.value} className="flex w-stat-card shrink-0 snap-start md:w-auto">
          <StatCard value={item.value} label={item.label} className="w-full" />
        </li>
      ))}
    </ul>
  )
}
