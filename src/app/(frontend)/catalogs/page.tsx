import type { Metadata } from 'next'

import { CatalogCard } from '@/components/catalogs/CatalogCard'
import { ALL, CatalogsBrowser } from '@/components/catalogs/CatalogsBrowser'
import { FirstScreenEnd } from '@/components/app/FirstScreenEnd'
import { PageHeading } from '@/components/app/PageHeading'
import { PreviewRefresh } from '@/components/app/PreviewRefresh'
import { JsonLd } from '@/components/seo/JsonLd'
import { catalogCategoryOptions } from '@/lib/catalogCategories'
import { toChrome } from '@/lib/chrome'
import { breadcrumbJsonLd } from '@/lib/jsonld'
import { getCatalogs, getLayout, getPageGlobal, getSettings } from '@/lib/queries'
import { buildMetadata } from '@/lib/seo'

const PATH = '/catalogs'

// The filter (`?category=`) only narrows the same list: canonical is always /catalogs.
export async function generateMetadata(): Promise<Metadata> {
  const [{ hero, meta }, catalogs] = await Promise.all([
    getPageGlobal('catalogsPage'),
    getCatalogs(),
  ])
  return buildMetadata({
    meta,
    fallback: { title: hero?.title, description: hero?.lead, image: catalogs[0]?.cover },
    path: PATH,
  })
}

/**
 * «Каталоги» (README §6.5): heading, sticky category bar with the counter, catalog cards.
 * No catalogs — the heading only.
 */
export default async function CatalogsPage() {
  const [page, catalogs, layout, settings] = await Promise.all([
    getPageGlobal('catalogsPage'),
    getCatalogs(),
    getLayout(),
    getSettings(),
  ])
  const { nav } = toChrome(layout, settings)
  const navLabel = nav.find((item) => item.href === PATH)?.label
  const title = page.hero?.title?.trim() || navLabel
  const pageName = navLabel ?? title
  const lead = page.hero?.lead?.trim()
  // «все» and only the categories that have catalogs, in the order of the select
  const items = [
    { value: ALL, label: 'все' },
    ...catalogCategoryOptions.filter(({ value }) => catalogs.some((c) => c.category === value)),
  ]

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
      <PageHeading label={page.hero?.label} title={title} lead={lead} />
      {catalogs.length > 0 && (
        <CatalogsBrowser
          items={items}
          cards={catalogs.map((catalog) => ({
            id: catalog.id,
            category: catalog.category,
            node: <CatalogCard catalog={catalog} />,
          }))}
        />
      )}
      <FirstScreenEnd />
      <PreviewRefresh />
    </>
  )
}
