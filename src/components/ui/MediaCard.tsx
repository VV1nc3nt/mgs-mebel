import Image from 'next/image'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'
import {
  asMedia,
  focalPosition,
  imageSizes,
  imageSource,
  videoSource,
  type ImageSizeName,
  type MediaValue,
  type SizesPreset,
} from '@/lib/media'
import { Action } from './Action'
import { BgVideo } from './BgVideo'

const RATIO = {
  '9/16': 'aspect-9/16',
  '9/14': 'aspect-9/14',
  '3/4': 'aspect-3/4',
  '1/1': 'aspect-square',
  '4/3': 'aspect-4/3',
  '4/5': 'aspect-4/5',
  '3/2': 'aspect-3/2',
  '16/9': 'aspect-video',
} as const

// README §3: media cards 24, cards/photos 20, work previews 14–18, article cover 24/28/32 (§6.8).
const RADIUS = {
  media: 'rounded-media',
  card: 'rounded-card',
  thumb: 'rounded-thumb',
  'thumb-lg': 'rounded-thumb-lg',
  // 28 on tablet is the same value as the footer radius
  cover: 'rounded-media md:rounded-footer xl:rounded-cover-xl',
} as const

const OVERLAY = {
  none: '',
  hero: 'bg-overlay-hero',
  card: 'bg-overlay-card',
  work: 'bg-overlay-work',
  viewer: 'bg-overlay-viewer',
} as const

// Slot offsets from the design: 16 top / 20 bottom on cards, 8 on work previews,
// home work previews — icon 10 from the top right corner, text 12 from the edges.
const INSET = {
  md: { top: 'inset-x-4 top-4', bottom: 'inset-x-5 bottom-5' },
  sm: { top: 'inset-x-2 top-2', bottom: 'inset-x-2 bottom-2' },
  work: { top: 'right-2.5 top-2.5', bottom: 'inset-x-3 bottom-3' },
} as const

export type MediaCardProps = {
  /** Image from Payload Media. An id (not populated) or nothing renders an empty surface. */
  media: MediaValue
  /** Background video over `media` as its poster (exhibitions, salon reviews, #mission). */
  video?: MediaValue
  /** Payload size used as the optimizer source: thumb 480, card 960, hero 1920. */
  imageSize?: ImageSizeName
  /** Rendered width per breakpoint, e.g. `{ base: '100vw', md: '50vw', xl: '33vw' }`. */
  sizes: SizesPreset
  /** Aspect ratio; without it set the height via `className`. */
  ratio?: keyof typeof RATIO
  radius?: keyof typeof RADIUS
  /** Text on media always sits on an overlay (README §3). */
  overlay?: keyof typeof OVERLAY
  inset?: keyof typeof INSET
  /** Top row: badges, icon buttons. */
  top?: ReactNode
  /** Bottom content: title, text, actions. */
  children?: ReactNode
  /**
   * Makes the whole card a link (hover: opacity .88, README §9).
   * A link card must not contain buttons or links in `top` / `children`.
   */
  href?: string
  /** Id of the element that names the link card (e.g. its heading) instead of all its text. */
  labelledBy?: string
  /** LCP image: preloaded, not lazy. */
  priority?: boolean
  as?: 'div' | 'article' | 'figure'
  className?: string
}

/**
 * Photo card with an optional overlay and content. Media is clipped by an inner layer, so buttons in
 * the slots keep their extended hit area (::before) outside the rounded corners.
 */
export function MediaCard({
  media,
  video,
  imageSize = 'card',
  sizes,
  ratio,
  radius = 'media',
  overlay = 'none',
  inset = 'md',
  top,
  children,
  href,
  labelledBy,
  priority = false,
  as: Tag = 'div',
  className,
}: MediaCardProps) {
  const image = imageSource(media, imageSize)
  const poster = asMedia(media)
  const withVideo = Boolean(poster && videoSource(video))

  const content = (
    <>
      <div className={cn('absolute inset-0 -z-10 overflow-hidden bg-surface', RADIUS[radius])}>
        {poster && withVideo ? (
          <BgVideo
            poster={poster}
            video={video}
            sizes={sizes}
            imageSize={imageSize}
            priority={priority}
          />
        ) : (
          image && (
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes={imageSizes(sizes)}
              preload={priority}
              fetchPriority={priority ? 'high' : undefined}
              className="object-cover"
              style={{ objectPosition: focalPosition(media) }}
            />
          )
        )}
        {overlay !== 'none' && <div className={cn('absolute inset-0', OVERLAY[overlay])} />}
      </div>
      {top && (
        <div className={cn('absolute flex items-start justify-between gap-2', INSET[inset].top)}>
          {top}
        </div>
      )}
      {children && (
        <div className={cn('absolute flex flex-col gap-2.5', INSET[inset].bottom)}>{children}</div>
      )}
    </>
  )

  const classes = cn('relative isolate block', ratio && RATIO[ratio], RADIUS[radius], className)

  // A link needs an accessible name: the image alt or the content. Empty media and no content
  // (e.g. no seed yet) render a plain block instead of a nameless link.
  if (href && (image || children)) {
    return (
      <Action
        href={href}
        aria-labelledby={labelledBy}
        className={cn(classes, 'transition-opacity hover:opacity-88')}
      >
        {content}
      </Action>
    )
  }
  return <Tag className={classes}>{content}</Tag>
}
