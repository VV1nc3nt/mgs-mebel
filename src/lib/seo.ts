import type { Metadata } from 'next'

import { asMedia, type MediaValue } from './media'
import { absoluteUrl } from './site'

export const BRAND = 'MGS MEBEL'
const TITLE_MAX = 60
const DESCRIPTION_MAX = 160

const squash = (value: string) => value.replace(/\s+/g, ' ').trim()

/**
 * «{title} — MGS MEBEL» (or «MGS MEBEL — {title}»); the bare title if it already
 * names the brand or the full one is too long.
 */
export const seoTitle = (title: string, brand: 'end' | 'start' = 'end'): string => {
  const text = squash(title)
  if (!text) return BRAND
  if (text.toUpperCase().includes(BRAND)) return text
  const full = brand === 'end' ? `${text} — ${BRAND}` : `${BRAND} — ${text}`
  return full.length <= TITLE_MAX ? full : text
}

/** A sentence end this far in is a better cut than the last word. */
const MIN_SENTENCE_CUT = 80

/**
 * Text cut to at most 160 characters, without an ellipsis: at the last sentence end
 * if it is not too short, otherwise at the last word boundary.
 */
export const seoDescription = (text: string | null | undefined): string | undefined => {
  if (!text) return undefined
  const value = squash(text)
  if (!value) return undefined
  if (value.length <= DESCRIPTION_MAX) return value
  const cut = value.slice(0, DESCRIPTION_MAX + 1)
  const sentenceEnd = Math.max(...['. ', '! ', '? '].map((mark) => cut.lastIndexOf(mark)))
  if (sentenceEnd + 1 >= MIN_SENTENCE_CUT) return value.slice(0, sentenceEnd + 1)
  const space = cut.lastIndexOf(' ')
  return value.slice(0, space > 0 ? space : DESCRIPTION_MAX).replace(/[\s,;:—–-]+$/, '')
}

export type OgImage = { url: string; width: number; height: number; alt: string }

/**
 * Social preview image: the 1200×630 `og` size (cropped around the focal point), else the
 * largest generated size or the original with their real dimensions (files uploaded before
 * the `og` size existed, or smaller than 1200×630).
 */
export const ogImage = (value: MediaValue): OgImage | undefined => {
  const media = asMedia(value)
  if (!media?.mimeType?.startsWith('image/')) return undefined
  const alt = media.alt ?? ''
  for (const name of ['og', 'hero', 'card'] as const) {
    const size = media.sizes?.[name]
    if (size?.url && size.width && size.height) {
      return { url: absoluteUrl(size.url), width: size.width, height: size.height, alt }
    }
  }
  if (media.url && media.width && media.height) {
    return { url: absoluteUrl(media.url), width: media.width, height: media.height, alt }
  }
  return undefined
}

/** SEO fields of `@payloadcms/plugin-seo`. */
export type SeoFields =
  { title?: string | null; description?: string | null; image?: MediaValue } | null | undefined

export type BuildMetadataInput = {
  meta?: SeoFields
  /** Content the page already shows: H1 or title, lead or first paragraph, cover or poster. */
  fallback: { title?: string | null; description?: string | null; image?: MediaValue }
  /** Site path, e.g. `/` or `/news/slug`. */
  path: string
  type?: 'website' | 'article'
}

/**
 * Page metadata by the SEO rules (CLAUDE.md «SEO»): CMS SEO fields first, content as the fallback;
 * absolute canonical without a trailing slash; Open Graph ru_RU and a large Twitter card.
 */
export const buildMetadata = ({
  meta,
  fallback,
  path,
  type = 'website',
}: BuildMetadataInput): Metadata => {
  const title = seoTitle(meta?.title || fallback.title || '')
  const description = seoDescription(meta?.description) ?? seoDescription(fallback.description)
  const image = ogImage(meta?.image) ?? ogImage(fallback.image)
  const url = absoluteUrl(path)

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: BRAND,
      locale: 'ru_RU',
      type,
      images: image ? [image] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image.url] : undefined,
    },
  }
}
