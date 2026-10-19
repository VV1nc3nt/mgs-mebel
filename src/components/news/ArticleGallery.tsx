import { MediaCard } from '@/components/ui/MediaCard'
import { gallerySizes, type ArticleGallery as Gallery } from '@/lib/article'

import { NewsGallery } from './NewsGallery'

/**
 * Photo slider of a news body, the photos rendered here: the page container whether wide or not,
 * the ratio set by the editor (4:5 by default), radius 20, lazy.
 */
export function ArticleGallery({ gallery }: { gallery: Gallery }) {
  const sizes = gallerySizes(gallery.perView)
  return (
    <NewsGallery
      perView={gallery.perView}
      caption={gallery.caption}
      slides={gallery.photos.map((photo) => (
        <MediaCard
          key={photo.id}
          media={photo}
          imageSize="card"
          sizes={sizes}
          ratio={gallery.ratio}
          radius="card"
        />
      ))}
    />
  )
}
