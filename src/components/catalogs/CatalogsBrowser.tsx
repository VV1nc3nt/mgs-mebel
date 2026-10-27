'use client'

import { Fragment, useRef, type ReactNode } from 'react'

import { PageHeading } from '@/components/app/PageHeading'
import { FeedChips } from '@/components/ui/FeedChips'
import { useFeedSwitch } from '@/hooks/useFeedSwitch'
import { useFeedWave } from '@/hooks/useFeedWave'
import { useSegmentFilter } from '@/hooks/useSegmentFilter'
import { catalogCount } from '@/lib/catalogs'

export const ALL = 'all'

type Card = { id: number; category: string; node: ReactNode }

type Props = {
  label?: string | null
  title?: string | null
  lead?: string | null
  /** «все» and the categories that have catalogs. */
  items: readonly { value: string; label: string }[]
  /** Server-rendered cards with their category. */
  cards: readonly Card[]
}

const ofCategory = (cards: readonly Card[], category: string) =>
  category === ALL ? cards : cards.filter((card) => card.category === category)

/**
 * Heading with the counter, the category chips and the catalog grid (README §6.5). The category is
 * in `?category=`, so the server renders the filtered grid; a chip replaces the URL without a new
 * history entry and filters the cards on hand — the change is a wave, as on the works page.
 */
export function CatalogsBrowser({ label, title, lead, items, cards }: Props) {
  const { value, select } = useSegmentFilter({
    param: 'category',
    values: items.map((item) => item.value),
    fallback: ALL,
  })
  const listRef = useRef<HTMLDivElement>(null)
  const { shown, leaving, show } = useFeedSwitch<string, readonly Card[]>({
    initial: { key: value, value: ofCategory(cards, value) },
    want: value,
    load: (category) => ofCategory(cards, category),
  })
  useFeedWave(listRef, shown.generation)
  const counts = Object.fromEntries(
    items.map((item) => [item.value, ofCategory(cards, item.value).length]),
  )

  const choose = (category: string) => {
    if (category === value) return
    select(category)
    show(category)
  }

  return (
    <>
      <PageHeading
        label={label}
        title={title}
        lead={lead}
        aside={
          <p aria-live="polite" className="pb-1.5 text-body font-semibold text-text-4">
            {catalogCount(counts[value] ?? 0)}
          </p>
        }
      />
      <FeedChips
        label="Категории каталогов"
        items={items}
        value={value}
        counts={counts}
        onChoose={choose}
        lowercase
      />
      <div
        ref={listRef}
        data-catalogs-grid=""
        data-wave={leaving ? 'out' : undefined}
        className="page-container grid feed-wave grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
      >
        {shown.value.map((card) => (
          <Fragment key={card.id}>{card.node}</Fragment>
        ))}
      </div>
    </>
  )
}
