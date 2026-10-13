'use client'

import { Fragment, type ReactNode } from 'react'

import { SegmentFilter, type SegmentItem } from '@/components/ui/SegmentFilter'
import { useSegmentFilter } from '@/hooks/useSegmentFilter'
import { catalogCount } from '@/lib/catalogs'

export const ALL = 'all'

type Props = {
  /** «все» and the categories that have catalogs. */
  items: readonly SegmentItem<string>[]
  /** Server-rendered cards with their category. */
  cards: readonly { id: number; category: string; node: ReactNode }[]
}

/**
 * Sticky category bar and the catalog grid (README §6.5). The category is in `?category=`, so the
 * server renders the filtered grid; switching replaces the URL without a new history entry.
 */
export function CatalogsBrowser({ items, cards }: Props) {
  const { value, select, sentinelRef, barRef } = useSegmentFilter({
    param: 'category',
    values: items.map((item) => item.value),
    fallback: ALL,
  })
  const shown = value === ALL ? cards : cards.filter((card) => card.category === value)

  return (
    <div className="mt-2">
      <div ref={sentinelRef} aria-hidden="true" />
      <SegmentFilter
        ref={barRef}
        items={items}
        value={value}
        onChange={select}
        label="Категории каталогов"
        sticky
        count={catalogCount(shown.length)}
      />
      <div className="page-container grid grid-cols-1 gap-3 pt-3.5 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((card) => (
          <Fragment key={card.id}>{card.node}</Fragment>
        ))}
      </div>
    </div>
  )
}
