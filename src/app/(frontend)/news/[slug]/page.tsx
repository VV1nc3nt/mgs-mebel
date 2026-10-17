import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { FirstScreenEnd } from '@/components/app/FirstScreenEnd'
import { PreviewRefresh } from '@/components/app/PreviewRefresh'
import { ArticleBlocks } from '@/components/news/ArticleBlocks'
import { ArticleHeader } from '@/components/news/ArticleHeader'
import { JsonLd } from '@/components/seo/JsonLd'
import { articleBlocks, newsCrumbName } from '@/lib/article'
import { toChrome } from '@/lib/chrome'
import { breadcrumbJsonLd, newsArticleJsonLd } from '@/lib/jsonld'
import { getLayout, getNewsBySlug, getPageGlobal, getSettings } from '@/lib/queries'
import { readingTime } from '@/lib/readingTime'
import { buildMetadata } from '@/lib/seo'

type Props = {
  params: Promise<{ slug: string }>
}

const NEWS_PATH = '/news'

// An unknown or unpublished slug is a 404 in metadata too: the same answer as the page.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const news = await getNewsBySlug(slug)
  if (!news) notFound()
  return buildMetadata({
    meta: news.meta,
    fallback: { title: news.title, description: news.lead, image: news.cover },
    path: `${NEWS_PATH}/${news.slug}`,
    type: 'article',
    article: { publishedTime: news.date, modifiedTime: news.updatedAt },
  })
}

/**
 * A news article (README §6.8): crumbs, tag / date / reading time, title, lead, cover and the body
 * blocks. Published news only; in draft mode an editor sees the latest version.
 */
export default async function NewsArticlePage({ params }: Props) {
  const { slug } = await params
  // Before any Suspense boundary: otherwise streaming starts with status 200.
  const news = await getNewsBySlug(slug)
  if (!news) notFound()

  const [layout, settings, newsPage] = await Promise.all([
    getLayout(),
    getSettings(),
    getPageGlobal('newsPage'),
  ])
  const { nav } = toChrome(layout, settings)
  const newsCrumb = newsCrumbName(
    nav.find((item) => item.href === NEWS_PATH)?.label,
    newsPage.hero?.title,
  )
  const path = `${NEWS_PATH}/${news.slug}`

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Главная', path: '/' },
          { name: newsCrumb, path: NEWS_PATH },
          { name: news.title, path },
        ])}
      />
      <JsonLd
        data={newsArticleJsonLd({
          title: news.title,
          lead: news.lead,
          cover: news.cover,
          date: news.date,
          updatedAt: news.updatedAt,
          path,
        })}
      />
      <article className="pb-section xl:pb-section-xl">
        <ArticleHeader
          newsCrumb={newsCrumb}
          type={news.type}
          date={news.date}
          minutes={news.readingTime || readingTime(news.body)}
          title={news.title}
          lead={news.lead}
          cover={news.cover}
        />
        {/* The cover ends the first screen; the body grows below it and moves nothing above */}
        <FirstScreenEnd />
        <ArticleBlocks blocks={articleBlocks(news.body)} />
      </article>
      <PreviewRefresh />
    </>
  )
}
