import type { Metadata } from 'next'

import { FirstScreenEnd } from '@/components/app/FirstScreenEnd'
import { PageHeading } from '@/components/app/PageHeading'
import { PreviewRefresh } from '@/components/app/PreviewRefresh'
import { JsonLd } from '@/components/seo/JsonLd'
import { WorksFeed } from '@/components/works/WorksFeed'
import { toChrome } from '@/lib/chrome'
import { breadcrumbJsonLd } from '@/lib/jsonld'
import { getLayout, getPageGlobal, getSettings, getWorksCounts, getWorksPage } from '@/lib/queries'
import { parseFilter } from '@/lib/segmentFilter'
import { buildMetadata } from '@/lib/seo'
import { ALL_WORKS, worksChips } from '@/lib/works'

const PATH = '/works'

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
    path: PATH,
  })
}

/**
 * «Наши работы» (README §6.4): heading, sticky filter bar with the counter, infinite grid of works.
 * No works — the heading only.
 */
export default async function WorksPage({ searchParams }: Props) {
  const [page, counts, layout, settings, params] = await Promise.all([
    getPageGlobal('worksPage'),
    getWorksCounts(),
    getLayout(),
    getSettings(),
    searchParams,
  ])
  const { nav } = toChrome(layout, settings)
  const navLabel = nav.find((item) => item.href === PATH)?.label
  const title = page.hero?.title?.trim() || navLabel
  const pageName = navLabel ?? title
  // The same values as the bar on the client: an empty or unknown filter is «все»
  const chips = worksChips(counts)
  const category = typeof params.category === 'string' ? params.category : null
  const filter = parseFilter(
    category,
    chips.map((chip) => chip.value),
    ALL_WORKS,
  )
  const first = chips.length > 0 ? await getWorksPage(filter, 1) : null

  return (
    <>
      {pageName && (
        <JsonLd
          data={breadcrumbJsonLd([
            { name: 'Главная', path: '/' },
            { name: pageName, path: PATH },
          ])}
        />
      )}
      <PageHeading label={page.hero?.label} title={title} />
      {first && <WorksFeed chips={chips} counts={counts} initial={{ filter, ...first }} />}
      <FirstScreenEnd />
      <PreviewRefresh />
    </>
  )
}
