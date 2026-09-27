import type { Media } from '@/payload-types'

/** Breakpoints in px, the same as `--breakpoint-md` / `--breakpoint-xl` in globals.css. */
export const BREAKPOINTS = { md: 768, xl: 1280 } as const

export type ImageSizeName = keyof NonNullable<Media['sizes']>

/** Upload field value: a populated document, an id (not populated) or nothing. */
export type MediaValue = Media | number | null | undefined

/** Returns the document if the upload is populated, otherwise null. */
export const asMedia = (value: MediaValue): Media | null =>
  value && typeof value === 'object' ? value : null

export const isImage = (value: MediaValue): value is Media =>
  Boolean(asMedia(value)?.mimeType?.startsWith('image/'))

export const isVideo = (value: MediaValue): value is Media =>
  Boolean(asMedia(value)?.mimeType?.startsWith('video/'))

export type ImageSource = { src: string; width: number; height: number; alt: string }

const SIZE_ORDER: ImageSizeName[] = ['thumb', 'card', 'hero']

/**
 * Source for next/image: the requested Payload size, else the next larger one, else the original.
 * Sizes are generated `withoutEnlargement`, so small originals have no larger sizes.
 */
export const imageSource = (value: MediaValue, size: ImageSizeName): ImageSource | null => {
  const media = asMedia(value)
  if (!media || !isImage(media)) return null
  const alt = media.alt ?? ''
  for (const name of SIZE_ORDER.slice(SIZE_ORDER.indexOf(size))) {
    const s = media.sizes?.[name]
    if (s?.url && s.width && s.height) return { src: s.url, width: s.width, height: s.height, alt }
  }
  if (media.url && media.width && media.height) {
    return { src: media.url, width: media.width, height: media.height, alt }
  }
  return null
}

/** Rendered width of an image per breakpoint, e.g. `{ base: '100vw', md: '50vw', xl: '33vw' }`. */
export type SizesPreset = { base: string; md?: string; xl?: string }

/** Builds the `sizes` attribute of next/image from a preset, widest breakpoint first. */
export const imageSizes = ({ base, md, xl }: SizesPreset): string =>
  [
    xl && `(min-width: ${BREAKPOINTS.xl}px) ${xl}`,
    md && `(min-width: ${BREAKPOINTS.md}px) ${md}`,
    base,
  ]
    .filter(Boolean)
    .join(', ')

/** `object-position` from the focal point set in the admin (percent), centre by default. */
export const focalPosition = (value: MediaValue): string => {
  const media = asMedia(value)
  const x = media?.focalX ?? 50
  const y = media?.focalY ?? 50
  return `${x}% ${y}%`
}
