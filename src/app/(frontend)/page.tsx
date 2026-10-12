import type { Metadata } from 'next'

import { FirstScreenEnd } from '@/components/app/FirstScreenEnd'
import { PreviewRefresh } from '@/components/app/PreviewRefresh'
import { HomeHero } from '@/components/home/HomeHero'
import { NewsSection } from '@/components/sections/NewsSection'
import { SalonsSection } from '@/components/sections/SalonsSection'
import { WorksSection } from '@/components/sections/WorksSection'
import { toChrome } from '@/lib/chrome'
import {
  getHomeWorks,
  getLatestNews,
  getLayout,
  getPageGlobal,
  getSalons,
  getSettings,
} from '@/lib/queries'
import { buildMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const { hero, meta } = await getPageGlobal('home')
  const first = hero?.slides?.[0]
  return buildMetadata({
    meta,
    fallback: { title: first?.title, description: first?.text, image: first?.poster },
    path: '/',
  })
}

// The news slider shows the latest published news (README §6.1 п.4).
const HOME_NEWS_LIMIT = 3

/**
 * Home page (home README): the hero scene, news, salons, works. Sections without their required
 * content are not rendered.
 */
export default async function HomePage() {
  const [home, salonsPage, layout, settings, news, salons, works] = await Promise.all([
    getPageGlobal('home'),
    // The salon card button label lives on the «Салоны» page.
    getPageGlobal('salonsPage'),
    getLayout(),
    getSettings(),
    getLatestNews(HOME_NEWS_LIMIT),
    getSalons(),
    getHomeWorks(),
  ])
  const { messengers } = toChrome(layout, settings)

  return (
    <>
      <HomeHero hero={home.hero} messengers={messengers} />
      <NewsSection section={home.news} news={news} />
      <FirstScreenEnd />
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
