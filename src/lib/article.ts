import type {
  Media,
  NewsHeadingBlock,
  NewsListBlock,
  NewsMediaBlock,
  NewsParagraphBlock,
  NewsQuoteBlock,
  NewsVideoBlock,
} from '@/payload-types'

import { classifyHref, type HrefKind } from './href'
import { itemViewHref } from './workView'
import {
  asMedia,
  isImage,
  videoSource,
  type ImageSizeName,
  type SizesPreset,
  type VideoSource,
} from './media'

/** Width of the text column, the same as `--container-article` in globals.css (unit test). */
export const ARTICLE_COLUMN_WIDTH = '760px'

/** `sizes` of a photo in the text column: the column is fixed from desktop. */
export const COLUMN_PHOTO_SIZES: SizesPreset = {
  base: '100vw',
  md: '92vw',
  xl: ARTICLE_COLUMN_WIDTH,
}

/** Width of a vertical video, the same as `--container-video-vertical` in globals.css (unit test). */
export const VERTICAL_VIDEO_WIDTH = '420px'

/** Name of the news section in the visible crumbs when nothing else is set. */
export const NEWS_CRUMB = 'Новости'

/**
 * Visible crumb of the news section: the short nav label, else the label, else the news page
 * title, else «Новости». The breadcrumb list (JSON-LD) keeps the label, as on the other pages.
 */
export const newsCrumbName = (
  nav: { label?: string | null; shortLabel?: string | null } | null | undefined,
  heroTitle: string | null | undefined,
): string => nav?.shortLabel?.trim() || nav?.label?.trim() || heroTitle?.trim() || NEWS_CRUMB

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

/** Photos a slider shows at once, per breakpoint (README §6.8). */
export type GalleryPerView = { base: 1; md: 2 | 3; xl: 2 | 3 | 4 }

/**
 * README §6.8: mobile — 1; tablet — 2 when there are 2 or 4 photos, else 3; desktop — 2 for 2
 * photos, 3 for 3, 6 and 9, else 4.
 */
export const galleryPerView = (count: number): GalleryPerView => ({
  base: 1,
  md: count <= 2 || count === 4 ? 2 : 3,
  xl: count <= 2 ? 2 : [3, 6, 9].includes(count) ? 3 : 4,
})

/** README §6.8: the ratio set by the editor, else 4:5. */
export const galleryRatio = (ratio: NewsMediaBlock['ratio']): FigureRatio =>
  (ratio && RATIOS[ratio]) || '4/5'

// Share of the viewport a slide takes with k photos at once, rounded up
const SLIDE_SHARE = { 1: '100vw', 2: '50vw', 3: '34vw', 4: '25vw' } as const

/** `sizes` of a slider photo: the container split into the photos at once. */
export const gallerySizes = (perView: GalleryPerView): SizesPreset => ({
  base: SLIDE_SHARE[perView.base],
  md: SLIDE_SHARE[perView.md],
  xl: SLIDE_SHARE[perView.xl],
})

export type VideoShape = 'column' | 'wide' | 'vertical'

/** README §6.8: vertical — 9:16, at most 420 wide (wins over wide); wide — the container. */
export const videoShape = (block: Pick<NewsVideoBlock, 'vertical' | 'wide'>): VideoShape =>
  block.vertical ? 'vertical' : block.wide ? 'wide' : 'column'

/** `sizes` and the Payload size of a video poster by the width of the block. */
export const VIDEO_POSTER: Record<VideoShape, { sizes: SizesPreset; imageSize: ImageSizeName }> = {
  column: { sizes: COLUMN_PHOTO_SIZES, imageSize: 'card' },
  wide: { sizes: { base: '100vw' }, imageSize: 'hero' },
  vertical: { sizes: { base: '100vw', md: VERTICAL_VIDEO_WIDTH }, imageSize: 'card' },
}

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

export type ArticleGallery = {
  blockType: 'gallery'
  id?: string | null
  photos: Media[]
  caption: string | null
  ratio: FigureRatio
  perView: GalleryPerView
}

export type ArticleVideo = {
  blockType: 'video'
  id?: string | null
  poster: Media
  /** A file with sound; wins over the link. */
  file: VideoSource | null
  /** RuTube / VK page; the player reads it (unknown formats — the poster without ▶). */
  embedUrl: string | null
  duration: string | null
  caption: string | null
  shape: VideoShape
}

export type ArticleBlock =
  | NewsParagraphBlock
  | NewsHeadingBlock
  | NewsListBlock
  | NewsQuoteBlock
  | ArticleFigure
  | ArticleGallery
  | ArticleVideo

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
      // The photos that read as images: one — a figure, 2+ — a slider
      const media = block as unknown as NewsMediaBlock
      const photos = (media.photos ?? []).map(asMedia).filter(isImage)
      const caption = media.caption?.trim() || null
      if (!photos.length) return null
      if (photos.length > 1) {
        return {
          blockType: 'gallery',
          id: media.id,
          photos,
          caption,
          ratio: galleryRatio(media.ratio),
          perView: galleryPerView(photos.length),
        }
      }
      const wide = Boolean(media.wide)
      return {
        blockType: 'figure',
        id: media.id,
        photo: photos[0]!,
        caption,
        ratio: figureRatio(media.ratio, wide),
        wide,
      }
    }
    case 'video': {
      // No poster — nothing; no file and no known link — the poster without ▶
      const video = block as unknown as NewsVideoBlock
      const poster = asMedia(video.poster)
      if (!poster || !isImage(poster)) return null
      return {
        blockType: 'video',
        id: video.id,
        poster,
        file: videoSource(video.file),
        embedUrl: video.embedUrl?.trim() || null,
        duration: video.duration?.trim() || null,
        caption: video.caption?.trim() || null,
        shape: videoShape(video),
      }
    }
    // Unknown blocks render nothing
    default:
      return null
  }
}

/** Blocks of the body that render: empty and unknown ones are left out. */
export const articleBlocks = (body: readonly unknown[] | null | undefined): ArticleBlock[] =>
  (body ?? []).flatMap((block) => {
    if (!block || typeof block !== 'object') return []
    const result = toArticleBlock(block as BodyBlock)
    return result ? [result] : []
  })

const DOC_PATHS: Record<string, string> = { news: '/news' }

/** Fields of a Lexical link node (LinkFeature). */
export type LinkFields = {
  linkType?: 'custom' | 'internal' | null
  url?: string | null
  doc?: { relationTo?: string; value?: unknown } | null
}

/** Visible items of «Наши работы» by id: their type (the feed of the view). */
export type VisibleItems = ReadonlyMap<number, string>

/**
 * Visible projects with visible items by id: where a link leads — the page of a complex one, the
 * view of the first item of another.
 */
export type VisibleProjects = ReadonlyMap<number, string>

/** What links of a text to «Наши работы» may lead to (read only when the text has such links). */
export type ArticleLinks = { items?: VisibleItems; projects?: VisibleProjects }

const docId = (value: unknown): number | null =>
  typeof value === 'number'
    ? value
    : value && typeof value === 'object' && typeof (value as { id?: unknown }).id === 'number'
      ? (value as { id: number }).id
      : null

/**
 * Address of a link in the text. Internal — the page of the linked news; a project — its page
 * when complex, else the view of its first item (from `projects`); the view of an item
 * (`itemViewHref`, its visibility and type from `items`). A document not readable as published
 * (no slug), a hidden item or a project not visible (or without visible items) gives null: the
 * text stays, without a link. Custom — own pages in the same tab, other sites in a new tab.
 */
export const linkHref = (
  fields: LinkFields | null | undefined,
  items: VisibleItems = new Map(),
  projects: VisibleProjects = new Map(),
): HrefKind | null => {
  if (!fields) return null
  if (fields.linkType === 'internal' && fields.doc?.relationTo === 'projects') {
    const id = docId(fields.doc.value)
    const href = id === null ? undefined : projects.get(id)
    return href ? { kind: 'internal', href } : null
  }
  if (fields.linkType === 'internal' && fields.doc?.relationTo === 'items') {
    const id = docId(fields.doc.value)
    const type = id === null ? undefined : items.get(id)
    return id !== null && type ? { kind: 'internal', href: itemViewHref({ type, id }) } : null
  }
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

type LinkNode = { type?: string; fields?: LinkFields; children?: LinkNode[] }

/** Ids of the documents of a collection linked from the paragraphs. */
function linkedIds(blocks: readonly ArticleBlock[], relationTo: string): number[] {
  const ids = new Set<number>()
  const walk = (node: LinkNode | null | undefined) => {
    if (!node || typeof node !== 'object') return
    if (node.type === 'link' && node.fields?.doc?.relationTo === relationTo) {
      const id = docId(node.fields.doc.value)
      if (id !== null) ids.add(id)
    }
    node.children?.forEach(walk)
  }
  for (const block of blocks) {
    if (block.blockType === 'paragraph') walk(block.text?.root as LinkNode | undefined)
  }
  return [...ids]
}

/** Ids of the items linked from the paragraphs (their visibility is read only when there are). */
export const linkedItemIds = (blocks: readonly ArticleBlock[]): number[] =>
  linkedIds(blocks, 'items')

/** Ids of the projects linked from the paragraphs (read only when there are). */
export const linkedProjectIds = (blocks: readonly ArticleBlock[]): number[] =>
  linkedIds(blocks, 'projects')
