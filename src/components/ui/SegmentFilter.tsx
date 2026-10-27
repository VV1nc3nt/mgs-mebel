import { cn } from '@/lib/cn'
import { segmentOverlayGroup, segmentOverlayItem } from './segmentStyles'

export type SegmentItem<T extends string> = { value: T; label: string }

export type SegmentFilterProps<T extends string> = {
  items: readonly SegmentItem<T>[]
  value: T
  onChange: (value: T) => void
  /** Accessible name of the group, e.g. «Вид». */
  label: string
  className?: string
}

/**
 * «Карта / Список» switch over the map (design: home, salons): a group of toggle buttons
 * (aria-pressed). Explicit activation with Enter/Space and a Tab stop per item. Controlled;
 * presentational — the handler comes from the client component that renders it.
 */
export function SegmentFilter<T extends string>({
  items,
  value,
  onChange,
  label,
  className,
}: SegmentFilterProps<T>) {
  return (
    <div role="group" aria-label={label} className={cn(segmentOverlayGroup, className)}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          aria-pressed={item.value === value}
          onClick={() => onChange(item.value)}
          className={segmentOverlayItem(item.value === value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
