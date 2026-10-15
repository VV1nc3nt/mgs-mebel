import type { Metadata } from 'next'

import { WorksPageBody } from '@/components/works/WorksPageBody'
import { getPageGlobal, getWorksCounts, getWorksPage } from '@/lib/queries'
import { parseFilter } from '@/lib/segmentFilter'
import { buildMetadata } from '@/lib/seo'
import { WORKS_PATH } from '@/lib/viewer'
import { ALL_WORKS, worksChips } from '@/lib/works'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

// The filter (`?category=`) only narrows the same feed: canonical is always /works.
export async function generateMetadata(): Promise<Metadata> {
  const [{ hero, meta }, first] = await Promise.all([
    getPageGlobal('worksPage'),
    getWorksPage(ALL_WORKS, 1),
  ])
  return buildMetadata({
    meta,
    fallback: { title: hero?.title, image: first.items[0]?.image },
    path: WORKS_PATH,
  })
}

/**
 * «Наши работы» (README §6.4): heading, sticky filter bar with the counter, infinite grid of works;
 * a card opens the project viewer over it. No works — the heading only.
 */
export default async function WorksPage({ searchParams }: Props) {
  const [counts, params] = await Promise.all([getWorksCounts(), searchParams])
  // The same values as the bar on the client: an empty or unknown filter is «все»
  const category = typeof params.category === 'string' ? params.category : null
  const filter = parseFilter(
    category,
    worksChips(counts).map((chip) => chip.value),
    ALL_WORKS,
  )
  return <WorksPageBody filter={filter} />
}
