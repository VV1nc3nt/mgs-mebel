import { render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ArticleBlocks } from '@/components/news/ArticleBlocks'
import { ArticleHeader } from '@/components/news/ArticleHeader'
import {
  NEWS_CRUMB,
  articleBlocks,
  figureRatio,
  hasText,
  linkHref,
  newsCrumbName,
  readingLabel,
} from '@/lib/article'
import { newsArticleJsonLd } from '@/lib/jsonld'
import { buildMetadata } from '@/lib/seo'
import { absoluteUrl } from '@/lib/site'
import type { News } from '@/payload-types'
import { photo, video } from './fixtures'

type Block = NonNullable<News['body']>[number]

afterEach(() => vi.unstubAllEnvs())

const text = (value: string) => ({ type: 'text', text: value, format: 0, version: 1 })
const paragraph = (...children: unknown[]) => ({ type: 'paragraph', version: 1, children })
const rich = (...paragraphs: unknown[]) =>
  ({ root: { type: 'root', version: 1, children: paragraphs } }) as never
const link = (fields: Record<string, unknown>, label: string) => ({
  type: 'link',
  version: 3,
  fields,
  children: [text(label)],
})
const p = (...paragraphs: unknown[]): Block => ({
  blockType: 'paragraph',
  text: rich(...paragraphs),
})

describe('articleBlocks', () => {
  it('keeps the text blocks and a single photo in order, as a figure', () => {
    const blocks = articleBlocks([
      p(paragraph(text('Абзац'))),
      { blockType: 'heading', text: 'Подзаголовок' },
      { blockType: 'list', items: [{ text: 'Пункт' }] },
      { blockType: 'quote', text: 'Цитата', author: 'Автор' },
      { blockType: 'media', photos: [photo], caption: 'Подпись', wide: true },
    ])
    expect(blocks.map((block) => block.blockType)).toEqual([
      'paragraph',
      'heading',
      'list',
      'quote',
      'figure',
    ])
    expect(blocks[4]).toMatchObject({ photo, caption: 'Подпись', ratio: '16/9', wide: true })
  })

  it('leaves out the slider of 2+ photos, video, unknown and empty blocks', () => {
    const blocks = articleBlocks([
      { blockType: 'media', photos: [photo, photo] },
      { blockType: 'media', photos: [] },
      // Not populated (an id) or not an image
      { blockType: 'media', photos: [7] },
      { blockType: 'media', photos: [video] },
      { blockType: 'video', file: video, poster: photo } as Block,
      { blockType: 'gallery' } as unknown as Block,
      p(paragraph(), paragraph(text('  '))),
      { blockType: 'heading', text: '  ' },
      { blockType: 'list', items: [{ text: ' ' }] },
      { blockType: 'quote', text: '' },
      null as unknown as Block,
    ])
    expect(blocks).toEqual([])
    expect(articleBlocks(null)).toEqual([])
  })

  it('drops empty list items and an empty caption', () => {
    const [list, figure] = articleBlocks([
      { blockType: 'list', items: [{ text: 'Один' }, { text: '' }, { text: 'Два' }] },
      { blockType: 'media', photos: [photo], caption: ' ' },
    ])
    expect(list).toMatchObject({ items: [{ text: 'Один' }, { text: 'Два' }] })
    expect(figure).toMatchObject({ caption: null, ratio: '3/2', wide: false })
  })
})

describe('figureRatio', () => {
  it('takes the ratio of the editor, else 3:2 — 16:9 when wide', () => {
    expect(figureRatio('4x5', false)).toBe('4/5')
    expect(figureRatio('1x1', true)).toBe('1/1')
    expect(figureRatio('16x9', false)).toBe('16/9')
    expect(figureRatio(null, false)).toBe('3/2')
    expect(figureRatio(undefined, true)).toBe('16/9')
  })
})

describe('hasText', () => {
  it('finds visible text at any depth', () => {
    expect(hasText(paragraph(link({}, 'текст')))).toBe(true)
    expect(hasText(paragraph(text(' '), { type: 'linebreak' }))).toBe(false)
    expect(hasText(null)).toBe(false)
  })
})

describe('linkHref', () => {
  it('internal: the page of the linked news or project', () => {
    expect(
      linkHref({ linkType: 'internal', doc: { relationTo: 'news', value: { slug: 'alvic' } } }),
    ).toEqual({ kind: 'internal', href: '/news/alvic' })
    expect(
      linkHref({
        linkType: 'internal',
        doc: { relationTo: 'projects', value: { slug: 'kuhnya' } },
      }),
    ).toEqual({ kind: 'internal', href: '/works/kuhnya' })
  })

  it('internal without a slug (not published, deleted, not populated): no link', () => {
    expect(linkHref({ linkType: 'internal', doc: { relationTo: 'news', value: 5 } })).toBeNull()
    expect(linkHref({ linkType: 'internal', doc: { relationTo: 'news', value: {} } })).toBeNull()
    expect(linkHref({ linkType: 'internal', doc: null })).toBeNull()
    expect(
      linkHref({ linkType: 'internal', doc: { relationTo: 'media', value: { slug: 'x' } } }),
    ).toBeNull()
  })

  it('custom: other sites in a new tab, own pages and mail in the same tab', () => {
    expect(linkHref({ linkType: 'custom', url: 'https://example.org/a' })).toEqual({
      kind: 'external',
      href: 'https://example.org/a',
    })
    expect(linkHref({ linkType: 'custom', url: '/salons' })).toEqual({
      kind: 'internal',
      href: '/salons',
    })
    expect(linkHref({ linkType: 'custom', url: 'mailto:a@b.ru' })).toEqual({
      kind: 'plain',
      href: 'mailto:a@b.ru',
    })
    expect(linkHref({ linkType: 'custom', url: ' ' })).toBeNull()
    expect(linkHref(undefined)).toBeNull()
  })
})

describe('crumbs and reading time', () => {
  it('names the news section by the nav label, else the page title, else «Новости»', () => {
    expect(newsCrumbName('Новости / новинки', 'Новости')).toBe('Новости / новинки')
    expect(newsCrumbName(' ', 'Новости компании')).toBe('Новости компании')
    expect(newsCrumbName(null, undefined)).toBe(NEWS_CRUMB)
    expect(readingLabel(3)).toBe('3 мин чтения')
  })
})

describe('ArticleBlocks', () => {
  it('renders paragraphs with internal and external links; a link without a slug is text', () => {
    render(
      <ArticleBlocks
        blocks={articleBlocks([
          p(
            paragraph(
              text('Смотрите '),
              link(
                { linkType: 'internal', doc: { relationTo: 'news', value: { slug: 'alvic' } } },
                'новость',
              ),
              text(', '),
              link({ linkType: 'custom', newTab: false, url: 'https://example.org' }, 'сайт'),
              text(' и '),
              link({ linkType: 'internal', doc: { relationTo: 'news', value: 9 } }, 'черновик'),
            ),
            // An extra Enter
            paragraph(),
          ),
        ])}
      />,
    )
    const internal = screen.getByRole('link', { name: 'новость' })
    expect(internal.getAttribute('href')).toBe('/news/alvic')
    expect(internal.hasAttribute('target')).toBe(false)
    const external = screen.getByRole('link', { name: 'сайт' })
    expect(external.getAttribute('target')).toBe('_blank')
    expect(external.getAttribute('rel')).toBe('noopener noreferrer')
    expect(screen.queryByRole('link', { name: 'черновик' })).toBeNull()
    expect(screen.getByText(/черновик/)).toBeTruthy()
    expect(document.querySelectorAll('p')).toHaveLength(1)
  })

  it('renders heading, list, quote with and without author, figure with caption', () => {
    render(
      <ArticleBlocks
        blocks={articleBlocks([
          { blockType: 'heading', text: 'Подзаголовок' },
          { blockType: 'list', items: [{ text: 'Один' }, { text: 'Два' }] },
          { blockType: 'quote', text: 'Цитата', author: 'Автор' },
          { blockType: 'quote', text: 'Без автора' },
          { blockType: 'media', photos: [photo], caption: 'Подпись' },
        ])}
      />,
    )
    expect(screen.getByRole('heading', { level: 2, name: 'Подзаголовок' })).toBeTruthy()
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(2)
    const quotes = document.querySelectorAll('blockquote')
    expect(quotes).toHaveLength(2)
    expect(document.querySelectorAll('figcaption')).toHaveLength(2)
    expect(screen.getByText('Автор').tagName).toBe('FIGCAPTION')
    expect(screen.getByRole('img', { name: photo.alt! }).getAttribute('fetchpriority')).not.toBe(
      'high',
    )
    expect(screen.getByText('Подпись').tagName).toBe('FIGCAPTION')
  })

  it('renders nothing without blocks', () => {
    const { container } = render(<ArticleBlocks blocks={[]} />)
    expect(container.innerHTML).toBe('')
  })
})

describe('ArticleHeader', () => {
  const props = {
    newsCrumb: 'Новости',
    type: 'new',
    date: '2026-02-19T12:00:00.000Z',
    minutes: 2,
    title: 'Заголовок',
    lead: 'Лид',
    cover: photo,
  }

  it('crumbs, tags, the only h1, lead and the priority cover', () => {
    render(<ArticleHeader {...props} />)
    const crumbs = screen.getByRole('navigation', { name: 'Навигационная цепочка' })
    const links = within(crumbs).getAllByRole('link')
    expect(links.map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['Главная', '/'],
      ['Новости', '/news'],
    ])
    expect(screen.getByText('Новинка')).toBeTruthy()
    expect(screen.getByText('19.02.2026').tagName).toBe('TIME')
    expect(screen.getByText('19.02.2026').getAttribute('datetime')).toBe(props.date)
    expect(screen.getByText('2 мин чтения')).toBeTruthy()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByText('Лид')).toBeTruthy()
    expect(screen.getByRole('img', { name: photo.alt! }).getAttribute('fetchpriority')).toBe('high')
  })

  it('no lead — no paragraph; «Новость» tag', () => {
    render(<ArticleHeader {...props} type="news" lead="  " />)
    expect(screen.getByText('Новость')).toBeTruthy()
    expect(document.querySelector('p')).toBeNull()
  })
})

describe('newsArticleJsonLd', () => {
  const og = { url: '/api/media/file/cover-1200x630.jpg', width: 1200, height: 630 }
  const cover = { ...photo, sizes: { ...photo.sizes, og } }

  it('headline, lead, absolute og image, dates, the company, the page', () => {
    vi.stubEnv('SITE_URL', 'https://mgs.example')
    expect(
      newsArticleJsonLd({
        title: 'Новость',
        lead: 'Лид',
        cover,
        date: '2026-02-19T12:00:00.000Z',
        updatedAt: '2026-02-20T08:00:00.000Z',
        path: '/news/a',
      }),
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: 'Новость',
      description: 'Лид',
      image: ['https://mgs.example/api/media/file/cover-1200x630.jpg'],
      datePublished: '2026-02-19T12:00:00.000Z',
      dateModified: '2026-02-20T08:00:00.000Z',
      author: { '@type': 'Organization', name: 'MGS MEBEL', url: 'https://mgs.example' },
      publisher: { '@type': 'Organization', name: 'MGS MEBEL', url: 'https://mgs.example' },
      mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://mgs.example/news/a' },
    })
  })

  it('an image on another host (S3) stays as it is; no cover, no lead — no fields', () => {
    vi.stubEnv('SITE_URL', 'https://mgs.example')
    const s3 = {
      ...cover,
      sizes: { ...cover.sizes, og: { ...og, url: 'https://s3.example/c.jpg' } },
    }
    expect(newsArticleJsonLd({ title: 'Н', cover: s3, date: 'd', path: '/news/a' }).image).toEqual([
      'https://s3.example/c.jpg',
    ])
    const bare = newsArticleJsonLd({ title: 'Н', lead: ' ', cover: null, date: 'd', path: '/n' })
    expect(bare).not.toHaveProperty('image')
    expect(bare).not.toHaveProperty('description')
    expect(bare).not.toHaveProperty('dateModified')
  })

  it('absoluteUrl keeps absolute http(s) URLs', () => {
    vi.stubEnv('SITE_URL', 'https://mgs.example')
    expect(absoluteUrl('https://s3.example/a.jpg')).toBe('https://s3.example/a.jpg')
    expect(absoluteUrl('/news/a/')).toBe('https://mgs.example/news/a')
  })
})

describe('buildMetadata article', () => {
  it('Open Graph article times only for an article', () => {
    const article = { publishedTime: '2026-02-19', modifiedTime: '2026-02-20' }
    const meta = buildMetadata({
      fallback: { title: 'Н' },
      path: '/news/a',
      type: 'article',
      article,
    })
    expect(meta.openGraph).toMatchObject({
      type: 'article',
      publishedTime: '2026-02-19',
      modifiedTime: '2026-02-20',
    })
    const site = buildMetadata({ fallback: { title: 'Н' }, path: '/', article })
    expect(site.openGraph).not.toHaveProperty('publishedTime')
  })
})
