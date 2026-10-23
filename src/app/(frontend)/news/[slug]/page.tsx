import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { FirstScreenEnd } from '@/components/app/FirstScreenEnd'
import { PreviewRefresh } from '@/components/app/PreviewRefresh'
import { ArticleBlocks } from '@/components/news/ArticleBlocks'
import { ArticleCta } from '@/components/news/ArticleCta'
import { ArticleHeader } from '@/components/news/ArticleHeader'
import { ArticleShare } from '@/components/news/ArticleShare'
import { RelatedNews } from '@/components/news/RelatedNews'
import { JsonLd } from '@/components/seo/JsonLd'
import { articleBlocks, linkedItemIds, linkedProjectIds, newsCrumbName } from '@/lib/article'
import { toChrome } from '@/lib/chrome'
import { breadcrumbJsonLd, newsArticleJsonLd } from '@/lib/jsonld'
import { ALL_NEWS, relatedNews } from '@/lib/news'
import {
  getLayout,
  getNewsBySlug,
  getNewsPage,
  getPageGlobal,
  getProjectIndex,
  getSettings,
  getWorkFeeds,
} from '@/lib/queries'
import { visibleItemTypes, visibleProjectHrefs } from '@/lib/works'
import { readingTime } from '@/lib/readingTime'
import { buildMetadata } from '@/lib/seo'
import { articleShareLinks } from '@/lib/shareLinks'
import { absoluteUrl } from '@/lib/site'

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
 * A news article (README §6.8): crumbs, tag / date / reading time, title, lead, cover, the body
 * blocks and «Поделиться»; then the accent CTA and «Ещё новости». Published news only; in draft
 * mode an editor sees the latest version of the article (the other news stay published only).
 */
export default async function NewsArticlePage({ params }: Props) {
  const { slug } = await params
  // Before any Suspense boundary: otherwise streaming starts with status 200.
  const news = await getNewsBySlug(slug)
  if (!news) notFound()

  const [layout, settings, newsPage, latest] = await Promise.all([
    getLayout(),
    getSettings(),
    getPageGlobal('newsPage'),
    // Published only, in draft mode too: the first page of the list («все»)
    getNewsPage(ALL_NEWS, 1),
  ])
  const { nav, messengers } = toChrome(layout, settings)
  const navItem = nav.find((item) => item.href === NEWS_PATH)
  // Visible crumb — the short label; the breadcrumb list — the label, as on the other pages
  const newsCrumb = newsCrumbName(navItem, newsPage.hero?.title)
  const newsName = navItem?.label || newsCrumb
  const path = `${NEWS_PATH}/${news.slug}`
  const url = absoluteUrl(path)
  const blocks = articleBlocks(news.body)
  // Links to items and projects: only to the visible ones (the works feeds' cache and tags)
  const [items, projects] = await Promise.all([
    linkedItemIds(blocks).length ? getWorkFeeds().then(visibleItemTypes) : undefined,
    linkedProjectIds(blocks).length ? getProjectIndex().then(visibleProjectHrefs) : undefined,
  ])

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Главная', path: '/' },
          { name: newsName, path: NEWS_PATH },
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
      <div className="pb-section xl:pb-section-xl">
        <article>
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
          <ArticleBlocks blocks={blocks} links={{ items, projects }} />
          <ArticleShare
            url={url}
            links={articleShareLinks(
              { title: news.title, url },
              newsPage.articleShare?.maxTemplate,
            )}
          />
        </article>
        <ArticleCta cta={newsPage.articleCta} messengers={messengers} />
        <RelatedNews title={newsPage.related?.title} items={relatedNews(latest.items, news.id)} />
      </div>
      <PreviewRefresh />
    </>
  )
}
