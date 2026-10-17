import type {
  Media,
  NewsHeadingBlock,
  NewsListBlock,
  NewsMediaBlock,
  NewsParagraphBlock,
  NewsQuoteBlock,
} from '@/payload-types'

import { classifyHref, type HrefKind } from './href'
import { asMedia, isImage } from './media'

/** Name of the news section in the crumbs: nav label, else the news page title, else this. */
export const NEWS_CRUMB = 'Новости'

export const newsCrumbName = (
  navLabel: string | null | undefined,
  heroTitle: string | null | undefined,
): string => navLabel?.trim() || heroTitle?.trim() || NEWS_CRUMB

/** «N мин чтения»: the stored value, else counted from the body (a draft not saved yet). */
export const readingLabel = (minutes: number) => `${minutes} мин чтения`

export type FigureRatio = '3/2' | '4/5' | '1/1' | '16/9'

const RATIOS: Record<NonNullable<NewsMediaBlock['ratio']>, FigureRatio> = {
  '3x2': '3/2',
  '4x5': '4/5',
  '1x1': '1/1',
  '16x9': '16/9',
}

/** README §6.8: the ratio set by the editor, else 3:2 — 16:9 when the photo is wide. */
export const figureRatio = (ratio: NewsMediaBlock['ratio'], wide: boolean): FigureRatio =>
  (ratio && RATIOS[ratio]) || (wide ? '16/9' : '3/2')

type LexicalNode = { type?: unknown; text?: unknown; children?: unknown }

/** Whether a Lexical node holds any visible text. */
export const hasText = (node: unknown): boolean => {
  if (!node || typeof node !== 'object') return false
  const { text, children } = node as LexicalNode
  if (typeof text === 'string' && text.trim()) return true
  return Array.isArray(children) && children.some(hasText)
}

export type ArticleFigure = {
  blockType: 'figure'
  id?: string | null
  photo: Media
  caption: string | null
  ratio: FigureRatio
  wide: boolean
}

export type ArticleBlock =
  NewsParagraphBlock | NewsHeadingBlock | NewsListBlock | NewsQuoteBlock | ArticleFigure

type BodyBlock = { blockType?: string } & Record<string, unknown>

const toArticleBlock = (block: BodyBlock): ArticleBlock | null => {
  switch (block.blockType) {
    case 'paragraph': {
      const paragraph = block as unknown as NewsParagraphBlock
      return hasText(paragraph.text?.root) ? paragraph : null
    }
    case 'heading': {
      const heading = block as unknown as NewsHeadingBlock
      return heading.text?.trim() ? heading : null
    }
    case 'list': {
      const list = block as unknown as NewsListBlock
      const items = (list.items ?? []).filter((item) => item.text?.trim())
      return items.length ? { ...list, items } : null
    }
    case 'quote': {
      const quote = block as unknown as NewsQuoteBlock
      return quote.text?.trim() ? quote : null
    }
    case 'media': {
      // One photo — a figure; a slider of 2+ comes with the gallery block
      const media = block as unknown as NewsMediaBlock
      const photos = media.photos ?? []
      const photo = photos.length === 1 ? asMedia(photos[0]) : null
      if (!photo || !isImage(photo)) return null
      const wide = Boolean(media.wide)
      return {
        blockType: 'figure',
        id: media.id,
        photo,
        caption: media.caption?.trim() || null,
        ratio: figureRatio(media.ratio, wide),
        wide,
      }
    }
    // Video comes with its player; unknown blocks render nothing
    default:
      return null
  }
}

/** Blocks of the body that render: empty ones and blocks without a view yet are left out. */
export const articleBlocks = (body: readonly unknown[] | null | undefined): ArticleBlock[] =>
  (body ?? []).flatMap((block) => {
    if (!block || typeof block !== 'object') return []
    const result = toArticleBlock(block as BodyBlock)
    return result ? [result] : []
  })

const DOC_PATHS: Record<string, string> = { news: '/news', projects: '/works' }

/** Fields of a Lexical link node (LinkFeature). */
export type LinkFields = {
  linkType?: 'custom' | 'internal' | null
  url?: string | null
  doc?: { relationTo?: string; value?: unknown } | null
}

/**
 * Address of a link in the text. Internal — the page of the linked news or project; a document
 * not readable as published (no slug) gives null: the text stays, without a link. Custom — own
 * pages in the same tab, other sites in a new tab.
 */
export const linkHref = (fields: LinkFields | null | undefined): HrefKind | null => {
  if (!fields) return null
  if (fields.linkType === 'internal') {
    const base = DOC_PATHS[fields.doc?.relationTo ?? '']
    const value = fields.doc?.value
    const slug = value && typeof value === 'object' ? (value as { slug?: unknown }).slug : undefined
    return base && typeof slug === 'string' && slug
      ? { kind: 'internal', href: `${base}/${slug}` }
      : null
  }
  const url = fields.url?.trim()
  return url ? classifyHref(url) : null
}
