import type { Metadata } from 'next'

import { FirstScreenEnd } from '@/components/app/FirstScreenEnd'
import { PageHeading } from '@/components/app/PageHeading'
import { PreviewRefresh } from '@/components/app/PreviewRefresh'
import { SalonsEmpty } from '@/components/salons/SalonsEmpty'
import { SalonsExplorer } from '@/components/salons/SalonsExplorer'
import { JsonLd } from '@/components/seo/JsonLd'
import { toChrome } from '@/lib/chrome'
import { breadcrumbJsonLd, salonJsonLd } from '@/lib/jsonld'
import { getLayout, getPageGlobal, getSalonCards, getSettings } from '@/lib/queries'
import { toSalonView } from '@/lib/salons'
import { buildMetadata } from '@/lib/seo'

const PATH = '/salons'

export async function generateMetadata(): Promise<Metadata> {
  const [{ hero, meta }, salons] = await Promise.all([getPageGlobal('salonsPage'), getSalonCards()])
  return buildMetadata({
    meta,
    fallback: { title: hero?.title, description: hero?.lead, image: salons[0]?.poster },
    path: PATH,
  })
}

/**
 * «Фирменные салоны» (design: salons v2): heading, salon cards with videos, the map with the list
 * and the salon card. No salons — the «coming soon» text and the hotline instead of both.
 */
export default async function SalonsPage() {
  const [page, salons, layout, settings] = await Promise.all([
    getPageGlobal('salonsPage'),
    getSalonCards(),
    getLayout(),
    getSettings(),
  ])
  const { messengers, nav, phone } = toChrome(layout, settings)
  const navLabel = nav.find((item) => item.href === PATH)?.label
  const title = page.hero?.title?.trim() || navLabel
  const pageName = navLabel ?? title
  const lead = page.hero?.lead?.trim()

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
      {salons.map((salon) => (
        <JsonLd key={salon.id} data={salonJsonLd(salon)} />
      ))}
      <PageHeading label={page.hero?.label} title={title} lead={lead} />
      {salons.length ? (
        <SalonsExplorer
          salons={salons.map(toSalonView)}
          ctaLabel={page.map?.cardCtaLabel}
          messengers={messengers}
          listCaption={page.map?.listCaption}
        />
      ) : (
        <SalonsEmpty text={page.map?.emptyText} phone={phone} />
      )}
      <FirstScreenEnd />
      <PreviewRefresh />
    </>
  )
}
