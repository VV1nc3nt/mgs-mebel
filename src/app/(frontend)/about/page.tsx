import type { Metadata } from 'next'

import { ExhibitionsSection } from '@/components/about/ExhibitionsSection'
import { HardwareSection } from '@/components/about/HardwareSection'
import { IntroSection } from '@/components/about/IntroSection'
import { PresentationSection } from '@/components/about/PresentationSection'
import { FirstScreenEnd } from '@/components/app/FirstScreenEnd'
import { PreviewRefresh } from '@/components/app/PreviewRefresh'
import { HeroSection } from '@/components/sections/HeroSection'
import { HistorySection } from '@/components/sections/HistorySection'
import { StatsSection } from '@/components/sections/StatsSection'
import { JsonLd } from '@/components/seo/JsonLd'
import { toChrome } from '@/lib/chrome'
import { breadcrumbJsonLd } from '@/lib/jsonld'
import { getLayout, getPageGlobal, getSettings, getStats } from '@/lib/queries'
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

/**
 * «О нас» (about v2 §2): hero, the statistics strip (under 1280), the intro (from 1280), history
 * (with the statistics grid from 1280), the video presentation, hardware, exhibitions. Sections
 * without their required content are not rendered. The first screen ends after the history
 * (834×1194 — the tallest checked screen — reaches it).
 */
export default async function AboutPage() {
  const [about, stats, layout, settings] = await Promise.all([
    getPageGlobal('about'),
    getStats(),
    getLayout(),
    getSettings(),
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
      <StatsSection items={stats.items} className="pt-2 xl:hidden" />
      <IntroSection intro={about.intro} />
      <HistorySection history={about.history} stats={stats.items} idPrefix="about" />
      <FirstScreenEnd />
      <PresentationSection mission={about.mission} />
      <HardwareSection hardware={about.hardware} />
      <ExhibitionsSection exhibitions={about.exhibitions} />
      <PreviewRefresh />
    </>
  )
}
