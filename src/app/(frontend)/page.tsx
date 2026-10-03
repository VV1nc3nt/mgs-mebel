import type { Metadata } from 'next'

import { PreviewRefresh } from '@/components/app/PreviewRefresh'
import { HomeHero } from '@/components/home/HomeHero'
import { HomeNews } from '@/components/home/HomeNews'
import { HomeWorks } from '@/components/home/HomeWorks'
import { HistorySection } from '@/components/sections/HistorySection'
import { StatsSection } from '@/components/sections/StatsSection'
import { toChrome } from '@/lib/chrome'
import {
  getHomeWorks,
  getLatestNews,
  getLayout,
  getPageGlobal,
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
  const [home, stats, layout, settings, news, works] = await Promise.all([
    getPageGlobal('home'),
    getStats(),
    getLayout(),
    getSettings(),
    getLatestNews(HOME_NEWS_LIMIT),
    getHomeWorks(),
  ])
  const { contactAction } = toChrome(layout, settings)

  return (
    <>
      <HomeHero hero={home.hero} action={contactAction} />
      <StatsSection items={stats.items} className="pt-2" />
      <HistorySection history={home.history} linkHref="/about" />
      <HomeNews section={home.news} news={news} />
      <HomeWorks section={home.works} panels={works} />
      <PreviewRefresh />
    </>
  )
}
