import type { Metadata } from 'next'

import { FirstScreenEnd } from '@/components/app/FirstScreenEnd'
import { PreviewRefresh } from '@/components/app/PreviewRefresh'
import { CapabilitiesSection } from '@/components/designers/CapabilitiesSection'
import { CooperationSection } from '@/components/designers/CooperationSection'
import { ProjectsSection } from '@/components/designers/ProjectsSection'
import { HeroSection } from '@/components/sections/HeroSection'
import { JsonLd } from '@/components/seo/JsonLd'
import { Chip } from '@/components/ui/Chip'
import { toChrome } from '@/lib/chrome'
import { toDesignerManager } from '@/lib/designers'
import { breadcrumbJsonLd } from '@/lib/jsonld'
import { getDesignerManager, getLayout, getPageGlobal, getSettings } from '@/lib/queries'
import { buildMetadata } from '@/lib/seo'

const PATH = '/designers'

// The H1 keeps the line break typed in the CMS; the title and Open Graph do not (buildMetadata
// collapses whitespace).
export async function generateMetadata(): Promise<Metadata> {
  const { hero, meta } = await getPageGlobal('designers')
  return buildMetadata({
    meta,
    fallback: { title: hero?.title, description: hero?.text, image: hero?.poster },
    path: PATH,
  })
}

/**
 * «Дизайнерам» (designers v2 §2): hero with the audience chips, capabilities, projects (the media
 * slider), cooperation with the manager. Sections without their content are not rendered. The
 * first screen ends after the capabilities (834×1194 — the tallest checked screen — reaches them).
 */
export default async function DesignersPage() {
  const [page, manager, layout, settings] = await Promise.all([
    getPageGlobal('designers'),
    getDesignerManager(),
    getLayout(),
    getSettings(),
  ])
  const { nav } = toChrome(layout, settings)
  const title = page.hero?.title?.replace(/\s+/g, ' ').trim()
  const pageName = nav.find((item) => item.href === PATH)?.label ?? title
  const audiences = (page.hero?.audiences ?? []).filter((item) => item.label?.trim())

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
      <HeroSection
        hero={page.hero}
        variant="designers"
        idPrefix="designers"
        chips={
          audiences.length > 0 && (
            <ul className="flex flex-wrap gap-2 pt-1">
              {audiences.map((item, i) => (
                <li key={item.id ?? i}>
                  <Chip variant="surface-media">{item.label}</Chip>
                </li>
              ))}
            </ul>
          )
        }
      />
      <CapabilitiesSection capabilities={page.capabilities} />
      <FirstScreenEnd />
      <ProjectsSection projects={page.projects} />
      <CooperationSection cooperation={page.cooperation} manager={toDesignerManager(manager)} />
      <PreviewRefresh />
    </>
  )
}
