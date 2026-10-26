import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ARTICLE_BODY } from '@/components/article/articleStyles'
import { ArticleRichText } from '@/components/article/ArticleRichText'
import { FirstScreenEnd } from '@/components/app/FirstScreenEnd'
import { PageHeading } from '@/components/app/PageHeading'
import { PreviewRefresh } from '@/components/app/PreviewRefresh'
import { JsonLd } from '@/components/seo/JsonLd'
import { linkedIdsIn } from '@/lib/article'
import { breadcrumbJsonLd } from '@/lib/jsonld'
import { LEGAL_DOCS, richTextPlain, type LegalKey } from '@/lib/legal'
import { getLegalDoc, getProjectIndex, getWorkFeeds } from '@/lib/queries'
import { buildMetadata } from '@/lib/seo'
import { visibleItemTypes, visibleProjectHrefs } from '@/lib/works'

// No document (no title or no text, not published) is a 404 in metadata too: the same answer.
export async function legalMetadata(key: LegalKey): Promise<Metadata> {
  const doc = await getLegalDoc(key)
  if (!doc) notFound()
  return buildMetadata({
    meta: doc.meta,
    fallback: { title: doc.title, description: richTextPlain(doc.body?.root) },
    path: LEGAL_DOCS[key].path,
  })
}

/**
 * A legal document (privacy, cookies, offer): the title as the H1, then the text with the type of
 * a news article. Edited in its own global; a document without a title or text has no page.
 */
export async function LegalPage({ docKey }: { docKey: LegalKey }) {
  // Before any Suspense boundary: otherwise streaming starts with status 200.
  const doc = await getLegalDoc(docKey)
  if (!doc) notFound()

  const path = LEGAL_DOCS[docKey].path
  const roots = [doc.body?.root]
  // Links to items and projects: only to the visible ones (the works feeds' cache and tags)
  const [items, projects] = await Promise.all([
    linkedIdsIn(roots, 'items').length ? getWorkFeeds().then(visibleItemTypes) : undefined,
    linkedIdsIn(roots, 'projects').length ? getProjectIndex().then(visibleProjectHrefs) : undefined,
  ])

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Главная', path: '/' },
          { name: doc.title, path },
        ])}
      />
      <article className="pb-section xl:pb-section-xl">
        <PageHeading title={doc.title} hyphenate />
        {/* The heading ends the first screen; the text grows below it and moves nothing above */}
        <FirstScreenEnd />
        <div className={ARTICLE_BODY}>
          <ArticleRichText data={doc.body} links={{ items, projects }} />
        </div>
      </article>
      <PreviewRefresh />
    </>
  )
}
