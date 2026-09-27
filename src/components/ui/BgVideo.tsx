import Image from 'next/image'

import { cn } from '@/lib/cn'
import {
  focalPosition,
  imageSizes,
  imageSource,
  videoSource,
  type ImageSizeName,
  type SizesPreset,
} from '@/lib/media'
import type { Media } from '@/payload-types'
import { BgVideoPlayer } from './BgVideoPlayer'

export type BgVideoProps = {
  /** Required (README §7): shown until the video plays and instead of it. */
  poster: Media | number
  /** Optional: without it only the poster is shown. */
  video?: Media | number | null
  sizes: SizesPreset
  imageSize?: ImageSizeName
  /** Hero: the poster is the LCP image, the video starts loading at once. */
  priority?: boolean
  className?: string
}

/**
 * Decorative background video: autoplay, muted, loop, no controls, no pause button.
 * Fills the nearest positioned parent. The poster is rendered on the server.
 */
export function BgVideo({
  poster,
  video,
  sizes,
  imageSize = 'hero',
  priority = false,
  className,
}: BgVideoProps) {
  const image = imageSource(poster, imageSize)
  const source = videoSource(video)

  return (
    <div
      className={cn('pointer-events-none absolute inset-0 overflow-hidden bg-surface', className)}
      data-bg-video={source ? '' : undefined}
    >
      {image && (
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes={imageSizes(sizes)}
          preload={priority}
          fetchPriority={priority ? 'high' : undefined}
          className="object-cover"
          style={{ objectPosition: focalPosition(poster) }}
        />
      )}
      {source && <BgVideoPlayer {...source} priority={priority} />}
    </div>
  )
}
