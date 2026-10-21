import type { Metadata } from 'next'

import { FirstScreenEnd } from '@/components/app/FirstScreenEnd'
import { PageHeading } from '@/components/app/PageHeading'
import { PreviewRefresh } from '@/components/app/PreviewRefresh'
import { JsonLd } from '@/components/seo/JsonLd'
import { WorksFeeds } from '@/components/works/WorksFeeds'
import { toChrome } from '@/lib/chrome'
import { breadcrumbJsonLd } from '@/lib/jsonld'
import { getLayout, getPageGlobal, getSettings, getWorkFeeds, getWorkItem } from '@/lib/queries'
import { parseFilter } from '@/lib/segmentFilter'
import { buildMetadata } from '@/lib/seo'
import { feedChips, feedCounts } from '@/lib/works'
import { COMPLEX } from '@/lib/workTypes'
import { ITEM_PARAM, parseItemId } from '@/lib/workView'

const PATH = '/works'

/** Tiles with a preloaded image: the first row of the widest layout (4 columns). */
const PRIORITY_TILES = 4

type SearchParams = Record<string, string | string[] | undefined>
type Props = { searchParams: Promise<SearchParams> }

/** `?item=` of the address: an id, else null (no query). */
const itemParam = (params: SearchParams): number | null => parseItemId(params[ITEM_PARAM])

// The feed (`?category=`) and the view of an item (`?item=`) are the same page: canonical is
// always /works, the title stays; the view shares the first photo of its item.
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const id = itemParam(await searchParams)
  const [{ hero, meta }, feeds, item] = await Promise.all([
    getPageGlobal('worksPage'),
    getWorkFeeds(),
    id === null ? null : getWorkItem(id),
  ])
  const shared = item?.frames[0]?.image
  return buildMetadata({
    // The view shares its item's photo over the page's own SEO image
    meta: shared ? { ...meta, image: shared } : meta,
    fallback: { title: hero?.title, image: feeds[COMPLEX][0]?.image },
    path: PATH,
  })
}

/**
 * «Наши работы» (design: works v2 §2): heading with the counter, feed chips (REELS, Комплекс,
 * the item types) and a masonry of tiles. No works — the heading only. `?item=` — the view of
 * that item open over its feed (§3.4), rendered here; not visible — the feed alone.
 */
export default async function WorksPage({ searchParams }: Props) {
  const [page, feeds, layout, settings, params] = await Promise.all([
    getPageGlobal('worksPage'),
    getWorkFeeds(),
    getLayout(),
    getSettings(),
    searchParams,
  ])
  const id = itemParam(params)
  const item = id === null ? null : await getWorkItem(id)
  const { nav, messengers } = toChrome(layout, settings)
  const navLabel = nav.find((item) => item.href === PATH)?.label
  const title = page.hero?.title?.trim() || navLabel
  const pageName = navLabel ?? title
  const counts = feedCounts(feeds)
  const chips = feedChips(counts)
  // The same values as the chips on the client: an empty or unknown feed is «Комплекс»
  const fallback = chips.some((chip) => chip.value === COMPLEX) ? COMPLEX : chips[0]?.value
  const category = typeof params.category === 'string' ? params.category : null
  // The view of an item opens over the feed of its type, whatever `?category=` says
  const feed =
    fallback &&
    (item && chips.some((chip) => chip.value === item.type)
      ? item.type
      : parseFilter(
          category,
          chips.map((chip) => chip.value),
          fallback,
        ))

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
          initialView={id === null ? null : { id, item }}
          priceDate={page.prices?.priceDate?.trim() || null}
          messengers={messengers}
        />
      ) : (
        <PageHeading label={page.hero?.label} title={title} />
      )}
      <FirstScreenEnd />
      <PreviewRefresh />
    </>
  )
}
