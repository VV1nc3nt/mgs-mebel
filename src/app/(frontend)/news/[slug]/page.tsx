import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getNewsBySlug } from '@/lib/queries'
import { buildMetadata } from '@/lib/seo'

type Props = {
  params: Promise<{ slug: string }>
}

// An unknown or unpublished slug is a 404 in metadata too: the same answer as the page.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const news = await getNewsBySlug(slug)
  if (!news) notFound()
  return buildMetadata({
    meta: news.meta,
    fallback: { title: news.title, description: news.lead, image: news.cover },
    path: `/news/${news.slug}`,
    type: 'article',
  })
}

/** News page placeholder until the full article (README §6.8): published news only. */
export default async function NewsArticlePage({ params }: Props) {
  const { slug } = await params
  // Before any Suspense boundary: otherwise streaming starts with status 200.
  const news = await getNewsBySlug(slug)
  if (!news) notFound()

  return (
    <article className="page-container py-section xl:py-section-xl">
      <h1 className="text-article-title md:text-article-title-md xl:text-article-title-xl">
        {news.title}
      </h1>
    </article>
  )
}
