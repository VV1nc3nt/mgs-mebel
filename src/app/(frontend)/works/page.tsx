import type { Metadata } from 'next'

import { FirstScreenEnd } from '@/components/app/FirstScreenEnd'
import { PageHeading } from '@/components/app/PageHeading'
import { PreviewRefresh } from '@/components/app/PreviewRefresh'
import { JsonLd } from '@/components/seo/JsonLd'
import { WorksFeeds } from '@/components/works/WorksFeeds'
import { toChrome } from '@/lib/chrome'
import { breadcrumbJsonLd } from '@/lib/jsonld'
import { getLayout, getPageGlobal, getSettings, getWorkFeeds } from '@/lib/queries'
import { parseFilter } from '@/lib/segmentFilter'
import { buildMetadata } from '@/lib/seo'
import { feedChips, feedCounts } from '@/lib/works'
import { COMPLEX } from '@/lib/workTypes'

const PATH = '/works'

/** Tiles with a preloaded image: the first row of the widest layout (4 columns). */
const PRIORITY_TILES = 4

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

// The feed (`?category=`) only narrows the same page: canonical is always /works.
export async function generateMetadata(): Promise<Metadata> {
  const [{ hero, meta }, feeds] = await Promise.all([getPageGlobal('worksPage'), getWorkFeeds()])
  return buildMetadata({
    meta,
    fallback: { title: hero?.title, image: feeds[COMPLEX][0]?.image },
    path: PATH,
  })
}

/**
 * «Наши работы» (design: works v2 §2): heading with the counter, feed chips (REELS, Комплекс,
 * the item types) and a masonry of tiles. No works — the heading only.
 */
export default async function WorksPage({ searchParams }: Props) {
  const [page, feeds, layout, settings, params] = await Promise.all([
    getPageGlobal('worksPage'),
    getWorkFeeds(),
    getLayout(),
    getSettings(),
    searchParams,
  ])
  const { nav } = toChrome(layout, settings)
  const navLabel = nav.find((item) => item.href === PATH)?.label
  const title = page.hero?.title?.trim() || navLabel
  const pageName = navLabel ?? title
  const counts = feedCounts(feeds)
  const chips = feedChips(counts)
  // The same values as the chips on the client: an empty or unknown feed is «Комплекс»
  const fallback = chips.some((chip) => chip.value === COMPLEX) ? COMPLEX : chips[0]?.value
  const category = typeof params.category === 'string' ? params.category : null
  const feed =
    fallback &&
    parseFilter(
      category,
      chips.map((chip) => chip.value),
      fallback,
    )

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
      {fallback && feed ? (
        <WorksFeeds
          label={page.hero?.label}
          title={title}
          chips={chips}
          counts={counts}
          fallback={fallback}
          initial={{ feed, tiles: feeds[feed] }}
          priority={PRIORITY_TILES}
        />
      ) : (
        <PageHeading label={page.hero?.label} title={title} />
      )}
      <FirstScreenEnd />
      <PreviewRefresh />
    </>
  )
}
