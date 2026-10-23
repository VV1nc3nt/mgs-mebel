import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'

import { FirstScreenEnd } from '@/components/app/FirstScreenEnd'
import { PreviewRefresh } from '@/components/app/PreviewRefresh'
import { JsonLd } from '@/components/seo/JsonLd'
import { BackToWorks } from '@/components/works/BackToWorks'
import { ProjectAbout } from '@/components/works/ProjectAbout'
import { ProjectCta } from '@/components/works/ProjectCta'
import { ProjectGallery } from '@/components/works/ProjectGallery'
import { toChrome } from '@/lib/chrome'
import { breadcrumbJsonLd } from '@/lib/jsonld'
import { getLayout, getPageGlobal, getSettings, getWorkProject } from '@/lib/queries'
import { buildMetadata } from '@/lib/seo'
import type { WorkProject } from '@/lib/workProject'
import { ITEM_PARAM, parseItemId, projectHrefOf, WORKS_PATH } from '@/lib/workView'

type SearchParams = Record<string, string | string[] | undefined>
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> }

/** Tiles with a preloaded image: the first row of the widest layout (4 columns). */
const PRIORITY_TILES = 4

/**
 * The page of a visible complex project, or the answer of its address: not complex — 308 to the
 * view of its first item; not visible, no visible item, not a slug — 404. Before any Suspense:
 * otherwise streaming starts with status 200.
 */
async function projectPage(slug: string): Promise<WorkProject> {
  const answer = await getWorkProject(slug)
  if (!answer) notFound()
  if ('redirect' in answer) permanentRedirect(answer.redirect)
  return answer.page
}

/** The item of `?item=` when it is one of the project's. */
const viewedItem = (project: WorkProject, params: SearchParams) => {
  const id = parseItemId(params[ITEM_PARAM])
  return id === null ? null : { id, item: project.items[id] ?? null }
}

// Canonical is the project page whatever the view; the view shares its item's first photo
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const project = await projectPage((await params).slug)
  const shared = viewedItem(project, await searchParams)?.item?.frames[0]?.image
  return buildMetadata({
    meta: shared ? { ...project.seo, image: shared } : project.seo,
    fallback: {
      title: project.title,
      description: project.description,
      image: project.cover ?? project.frames[0]?.image,
    },
    path: projectHrefOf(project.slug),
  })
}

/**
 * A project of «Наши работы» (works v2 §3): «← Все работы», the title and its meta, zone chips,
 * «О проекте», the masonry of every frame of the project with its videos, the CTA, and the view of
 * the project (`?item=&photo=`), rendered open on the server for a direct link.
 */
export default async function WorkProjectPage({ params, searchParams }: Props) {
  const project = await projectPage((await params).slug)
  const [page, layout, settings, query] = await Promise.all([
    getPageGlobal('worksPage'),
    getLayout(),
    getSettings(),
    searchParams,
  ])
  const { nav, messengers } = toChrome(layout, settings)
  const worksName = nav.find((item) => item.href === WORKS_PATH)?.label || page.hero?.title
  const priceDate = page.prices?.priceDate?.trim() || null

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Главная', path: '/' },
          ...(worksName ? [{ name: worksName, path: WORKS_PATH }] : []),
          { name: project.title, path: projectHrefOf(project.slug) },
        ])}
      />
      <ProjectGallery
        slug={project.slug}
        heading={
          <div className="page-container flex flex-col gap-3.5 pt-7 xl:pt-18">
            <BackToWorks />
            <h1 className="text-article-title text-balance md:text-article-title-md xl:text-article-title-xl">
              {project.title}
            </h1>
            {project.meta.length > 0 && (
              <ul className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-body-s font-semibold text-text-4">
                {project.meta.map((part, i) => (
                  <li key={i} className="flex items-center gap-2.5">
                    {i > 0 && (
                      <span aria-hidden="true" className="size-0.75 rounded-full bg-text-5" />
                    )}
                    {part}
                  </li>
                ))}
              </ul>
            )}
          </div>
        }
        zones={project.zones}
        tiles={project.gallery}
        frames={project.frames}
        items={project.items}
        about={project.about && <ProjectAbout about={project.about} priceDate={priceDate} />}
        cta={<ProjectCta cta={page.project} messengers={messengers} />}
        priority={PRIORITY_TILES}
        initialView={viewedItem(project, query)}
        priceDate={priceDate}
        messengers={messengers}
      />
      <FirstScreenEnd />
      <PreviewRefresh />
    </>
  )
}
