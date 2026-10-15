import { FirstScreenEnd } from '@/components/app/FirstScreenEnd'
import { PageHeading } from '@/components/app/PageHeading'
import { PreviewRefresh } from '@/components/app/PreviewRefresh'
import { JsonLd } from '@/components/seo/JsonLd'
import { toChrome } from '@/lib/chrome'
import { breadcrumbJsonLd, itemListJsonLd } from '@/lib/jsonld'
import {
  getLayout,
  getPageGlobal,
  getProjectList,
  getSettings,
  getWorksCounts,
  getWorksPage,
} from '@/lib/queries'
import { seoTitle } from '@/lib/seo'
import { siteUrl } from '@/lib/site'
import { pageOf, projectHref, WORKS_PATH, type ViewerProject } from '@/lib/viewer'
import { ALL_WORKS, appendWorks, worksChips, type WorksFeedFilter } from '@/lib/works'
import { WorksFeed } from './WorksFeed'
import { WorksView } from './WorksView'

/** <title> of /works: the SEO title of the page or its H1, as its metadata builds it. */
export const worksListTitle = (page: {
  meta?: { title?: string | null } | null
  hero?: { title?: string | null } | null
}) => seoTitle(page.meta?.title || page.hero?.title || '')

type Props =
  | { filter: WorksFeedFilter; project?: undefined }
  /** A project page: the viewer open on it, the feed «все» down to the project's page. */
  | { filter?: undefined; project: { data: ViewerProject; position: number } }

/**
 * «Наши работы» (README §6.4) and the project page: heading, sticky filter bar, infinite grid and
 * the project viewer over them. On a project page the viewer comes first and is the first screen;
 * the list heading is an H2 (the project title is the H1). No works — the heading only.
 */
export async function WorksPageBody({ filter = ALL_WORKS, project }: Props) {
  const [page, counts, layout, settings, list] = await Promise.all([
    getPageGlobal('worksPage'),
    getWorksCounts(),
    getLayout(),
    getSettings(),
    // The ItemList is the list page's: a project page has its breadcrumbs
    project ? null : getProjectList(),
  ])
  const { nav, messengers } = toChrome(layout, settings)
  const navLabel = nav.find((item) => item.href === WORKS_PATH)?.label
  const title = page.hero?.title?.trim() || navLabel
  const pageName = navLabel ?? title
  const chips = worksChips(counts)

  // Pages 1…k: down to the project's next one, so its «next project» link exists without JS
  const total = counts[ALL_WORKS]
  const lastPage = project ? pageOf(Math.min(project.position + 1, Math.max(total - 1, 0))) : 1
  const pages =
    chips.length > 0
      ? await Promise.all(
          Array.from({ length: lastPage }, (_, i) =>
            getWorksPage(project ? ALL_WORKS : filter, i + 1),
          ),
        )
      : []
  const initial = pages.length
    ? {
        filter: project ? ALL_WORKS : filter,
        items: pages.reduce((items, p) => appendWorks(items, p.items), pages[0]!.items),
        hasMore: pages[pages.length - 1]!.hasMore,
        page: pages.length,
      }
    : null

  const crumbs = pageName
    ? [
        { name: 'Главная', path: '/' },
        { name: pageName, path: WORKS_PATH },
        ...(project ? [{ name: project.data.title, path: project.data.href }] : []),
      ]
    : null

  // Every project of the feed «все», whatever the filter: the canonical page is /works
  const itemList =
    list && itemListJsonLd(list.map((item) => ({ name: item.title, path: projectHref(item.slug) })))

  const heading = <PageHeading label={page.hero?.label} title={title} as={project ? 'h2' : 'h1'} />

  return (
    <>
      {crumbs && <JsonLd data={breadcrumbJsonLd(crumbs)} />}
      {itemList && <JsonLd data={itemList} />}
      {initial ? (
        <WorksView
          initial={initial}
          counts={counts}
          project={project?.data}
          listTitle={worksListTitle(page)}
          origin={siteUrl()}
          cta={{ label: page.viewer?.ctaLabel ?? null, messengers }}
          afterViewer={project && <FirstScreenEnd />}
        >
          {heading}
          <WorksFeed chips={chips} counts={counts} priority={!project} />
        </WorksView>
      ) : (
        heading
      )}
      {!project && <FirstScreenEnd />}
      <PreviewRefresh />
    </>
  )
}
