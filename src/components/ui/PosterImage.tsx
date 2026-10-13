import Image from 'next/image'

import {
  focalPosition,
  imageSizes,
  imageSource,
  type ImageSizeName,
  type MediaValue,
  type SizesPreset,
} from '@/lib/media'

type Props = {
  media: MediaValue
  sizes: SizesPreset
  imageSize?: ImageSizeName
}

/**
 * A poster that fills its positioned parent (object-cover, focal point), rendered on the server —
 * for client players that take it as a slot (PosterPlayer). Nothing without an image.
 */
export function PosterImage({ media, sizes, imageSize = 'hero' }: Props) {
  const image = imageSource(media, imageSize)
  if (!image) return null
  return (
    <Image
      src={image.src}
      alt={image.alt}
      fill
      sizes={imageSizes(sizes)}
      className="object-cover"
      style={{ objectPosition: focalPosition(media) }}
    />
  )
}
