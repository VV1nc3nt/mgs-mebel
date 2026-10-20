import Link from 'next/link'

import { ArrowLabel } from '@/components/ui/ArrowLabel'
import { HIT_AREA_Y } from '@/components/ui/hitArea'
import type { NewsCardData } from '@/lib/news'

import { NewsCard } from './NewsCard'

/** Microcopy of the link to the list. */
const ALL_LABEL = 'Все'

type Props = {
  title: string | null | undefined
  /** The latest published news without the current one (relatedNews), at most 3. */
  items: NewsCardData[]
}

/**
 * «Ещё новости» under an article (README §6.8): H2 with «Все →» to the list, then the cards of
 * /news with an H3 title — 1 / 2 / 3 columns, the third card hidden on tablet (one full row). No
 * title or no other news — no section.
 */
export function RelatedNews({ title, items }: Props) {
  const heading = title?.trim()
  if (!heading || !items.length) return null

  return (
    <section
      aria-labelledby="related-news-title"
      className="page-container flex flex-col gap-5 pt-18 xl:pt-section-xl"
    >
      <div className="flex items-end justify-between gap-4">
        <h2 id="related-news-title" className="text-h2 text-balance md:text-h2-md xl:text-h2-xl">
          {heading}
        </h2>
        <Link href="/news" className={`relative shrink-0 ${HIT_AREA_Y}`}>
          <ArrowLabel className="text-button-s">{ALL_LABEL}</ArrowLabel>
        </Link>
      </div>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3" data-related-news="">
        {items.map((item, i) => (
          <li key={item.id} className={i === 2 ? 'md:max-xl:hidden' : undefined}>
            <NewsCard item={item} heading="h3" />
          </li>
        ))}
      </ul>
    </section>
  )
}
