import type { Metadata } from 'next'

import { PreviewRefresh } from '@/components/app/PreviewRefresh'
import { HeroSection } from '@/components/sections/HeroSection'
import { HistorySection } from '@/components/sections/HistorySection'
import { NewsSection } from '@/components/sections/NewsSection'
import { SalonsSection } from '@/components/sections/SalonsSection'
import { StatsSection } from '@/components/sections/StatsSection'
import { WorksSection } from '@/components/sections/WorksSection'
import { JsonLd } from '@/components/seo/JsonLd'
import { toChrome } from '@/lib/chrome'
import { breadcrumbJsonLd } from '@/lib/jsonld'
import {
  getHomeWorks,
  getLatestNews,
  getLayout,
  getPageGlobal,
  getSalons,
  getSettings,
  getStats,
} from '@/lib/queries'
import { buildMetadata } from '@/lib/seo'

const PATH = '/about'

export async function generateMetadata(): Promise<Metadata> {
  const { hero, meta } = await getPageGlobal('about')
  return buildMetadata({
    meta,
    fallback: { title: hero?.title, description: hero?.text, image: hero?.poster },
    path: PATH,
  })
}

// The news slider shows the latest published news (README §6.1 п.4).
const NEWS_LIMIT = 3

/**
 * «О нас» (README §6.2): for now the former home page — hero, statistics, history without the
 * link to itself, news, salons, works. Sections without their required content are not rendered.
 */
export default async function AboutPage() {
  const [about, salonsPage, stats, layout, settings, news, salons, works] = await Promise.all([
    getPageGlobal('about'),
    // The salon card button label lives on the «Салоны» page.
    getPageGlobal('salonsPage'),
    getStats(),
    getLayout(),
    getSettings(),
    getLatestNews(NEWS_LIMIT),
    getSalons(),
    getHomeWorks(),
  ])
  const { messengers, nav } = toChrome(layout, settings)
  const pageName = nav.find((item) => item.href === PATH)?.label ?? about.hero?.title?.trim()

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
      <HeroSection hero={about.hero} messengers={messengers} idPrefix="about" />
      <StatsSection items={stats.items} className="pt-2" />
      <HistorySection history={about.history} />
      <NewsSection section={about.news} news={news} idPrefix="about" />
      <SalonsSection
        section={about.salons}
        salons={salons}
        ctaLabel={salonsPage.map?.cardCtaLabel}
        messengers={messengers}
        idPrefix="about"
      />
      <WorksSection section={about.works} panels={works} idPrefix="about" />
      <PreviewRefresh />
    </>
  )
}
