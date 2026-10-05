import type { Metadata } from 'next'

import { PreviewRefresh } from '@/components/app/PreviewRefresh'
import { HeroSection } from '@/components/sections/HeroSection'
import { HistorySection } from '@/components/sections/HistorySection'
import { NewsSection } from '@/components/sections/NewsSection'
import { SalonsSection } from '@/components/sections/SalonsSection'
import { StatsSection } from '@/components/sections/StatsSection'
import { WorksSection } from '@/components/sections/WorksSection'
import { toChrome } from '@/lib/chrome'
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

export async function generateMetadata(): Promise<Metadata> {
  const { hero, meta } = await getPageGlobal('home')
  return buildMetadata({
    meta,
    fallback: { title: hero?.title, description: hero?.text, image: hero?.poster },
    path: '/',
  })
}

// The news slider shows the latest published news (README §6.1 п.4).
const HOME_NEWS_LIMIT = 3

/** Home page (README §6.1). Sections without their required content are not rendered. */
export default async function HomePage() {
  const [home, salonsPage, stats, layout, settings, news, salons, works] = await Promise.all([
    getPageGlobal('home'),
    // The salon card button label lives on the «Салоны» page.
    getPageGlobal('salonsPage'),
    getStats(),
    getLayout(),
    getSettings(),
    getLatestNews(HOME_NEWS_LIMIT),
    getSalons(),
    getHomeWorks(),
  ])
  const { messengers } = toChrome(layout, settings)

  return (
    <>
      <HeroSection hero={home.hero} messengers={messengers} />
      <StatsSection items={stats.items} className="pt-2" />
      <HistorySection history={home.history} linkHref="/about" />
      <NewsSection section={home.news} news={news} />
      <SalonsSection
        section={home.salons}
        salons={salons}
        ctaLabel={salonsPage.map?.cardCtaLabel}
        messengers={messengers}
      />
      <WorksSection section={home.works} panels={works} />
      <PreviewRefresh />
    </>
  )
}
