import { cn } from '@/lib/cn'
import { FilterChip } from './FilterChip'

type Props<T extends string> = {
  /** Accessible name of the group, e.g. «Категории работ». */
  label: string
  items: readonly { value: T; label: string }[]
  value: T
  counts: Readonly<Record<T, number>>
  onChoose: (value: T) => void
  /** Labels capitalised in the CMS (catalog categories): lowercase on the site. */
  lowercase?: boolean
}

/**
 * The feed chips of a page (works, catalogs, news; design: works v2 §2.2): toggle buttons 44 with
 * counters in a named group; a horizontal scroll on mobile, wrapped from md. Presentational: the
 * handler comes from the client component that renders it.
 */
export function FeedChips<T extends string>({
  label,
  items,
  value,
  counts,
  onChoose,
  lowercase,
}: Props<T>) {
  return (
    // Vertical padding keeps the chips' focus ring inside the scroller
    <div
      role="group"
      aria-label={label}
      className="page-container no-scrollbar flex gap-2 overflow-x-auto pt-6 pb-5 md:flex-wrap md:overflow-visible"
    >
      {items.map((item) => (
        <FilterChip
          key={item.value}
          size={44}
          selected={item.value === value}
          count={counts[item.value]}
          onClick={() => onChoose(item.value)}
          className={cn(lowercase && 'lowercase')}
        >
          {item.label}
        </FilterChip>
      ))}
    </div>
  )
}
