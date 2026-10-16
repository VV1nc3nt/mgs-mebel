import type { Metadata } from 'next'

import { FirstScreenEnd } from '@/components/app/FirstScreenEnd'
import { PageHeading } from '@/components/app/PageHeading'
import { PreviewRefresh } from '@/components/app/PreviewRefresh'
import { NewsFeed } from '@/components/news/NewsFeed'
import { JsonLd } from '@/components/seo/JsonLd'
import { toChrome } from '@/lib/chrome'
import { breadcrumbJsonLd, itemListJsonLd } from '@/lib/jsonld'
import { ALL_NEWS, newsTabs } from '@/lib/news'
import {
  getLayout,
  getNewsCounts,
  getNewsList,
  getNewsPage,
  getPageGlobal,
  getSettings,
} from '@/lib/queries'
import { parseFilter } from '@/lib/segmentFilter'
import { buildMetadata } from '@/lib/seo'

const PATH = '/news'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

// The tab (`?type=`) only narrows the same list: canonical is always /news.
export async function generateMetadata(): Promise<Metadata> {
  const [{ hero, meta }, first] = await Promise.all([
    getPageGlobal('newsPage'),
    getNewsPage(ALL_NEWS, 1),
  ])
  return buildMetadata({
    meta,
    fallback: { title: hero?.title, image: first.items[0]?.cover },
    path: PATH,
  })
}

/**
 * «Новости» (README §6.7): heading, tabs все / новости / новинки with counters, a grid of news
 * cards and «Показать ещё». No news — the heading only.
 */
export default async function NewsPage({ searchParams }: Props) {
  const [page, counts, list, layout, settings, params] = await Promise.all([
    getPageGlobal('newsPage'),
    getNewsCounts(),
    getNewsList(),
    getLayout(),
    getSettings(),
    searchParams,
  ])
  const { nav } = toChrome(layout, settings)
  const navLabel = nav.find((item) => item.href === PATH)?.label
  const title = page.hero?.title?.trim() || navLabel
  const pageName = navLabel ?? title
  const tabs = newsTabs(counts)
  // The same values as the tabs on the client: an empty or unknown type is «все»
  const type = typeof params.type === 'string' ? params.type : null
  const filter = parseFilter(
    type,
    tabs.map((tab) => tab.value),
    ALL_NEWS,
  )
  const first = tabs.length ? await getNewsPage(filter, 1) : null
  const itemList = itemListJsonLd(
    list.map((item) => ({ name: item.title, path: `${PATH}/${item.slug}` })),
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
      {itemList && <JsonLd data={itemList} />}
      <PageHeading label={page.hero?.label} title={title} />
      {first && <NewsFeed tabs={tabs} counts={counts} initial={{ filter, ...first }} />}
      <FirstScreenEnd />
      <PreviewRefresh />
    </>
  )
}
