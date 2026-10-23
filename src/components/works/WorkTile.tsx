import { ArrowRight, ArrowUpRight } from 'lucide-react'

import { Chip } from '@/components/ui/Chip'
import { MediaCard } from '@/components/ui/MediaCard'
import type { SizesPreset } from '@/lib/media'
import type { GalleryTile } from '@/lib/workProject'
import { mediaBadge, type WorkTile as Tile } from '@/lib/works'
import { workTypeLabel } from '@/lib/workTypes'
import { ProjectLink } from './ProjectLink'
import { WorkViewLink } from './WorkViewContext'

type Props = {
  tile: Tile | GalleryTile
  /** H2 on /works (under the page's H1), H3 under a section's H2. */
  heading?: 'h2' | 'h3'
  /** LCP image: preloaded, not lazy (the first row of the grid). */
  priority?: boolean
}

// Columns of the masonry: 2 / 3 / 4 (lib/masonry)
const SIZES: SizesPreset = { base: '50vw', md: '33vw', xl: '25vw' }

/** «▶ REELS» (design: light pill, dark triangle). */
function ReelsBadge() {
  return (
    <Chip
      variant="tile-light"
      icon={<span className="size-0 border-y-4 border-l-6 border-y-transparent border-l-bg" />}
    >
      REELS
    </Chip>
  )
}

/**
 * Tile of the works masonry (design: works v2 §2.3, §3.3): a project of «Комплекс» (link to its
 * page), an item of a type feed (link to its view), a video of REELS, or a frame of a project
 * (link to the view at it). All text lies on the image, over the gradient: the height is the
 * image's own ratio (the masonry places it by that alone).
 */
export function WorkTile({ tile, heading: Heading = 'h2', priority }: Props) {
  const titleId = `works-${tile.key}`

  if (tile.kind === 'frame') {
    // Named by the photo's alt (a video's — its poster's): the badges repeat what the page shows
    return (
      <MediaCard
        media={tile.image}
        sizes={SIZES}
        radius="media"
        inset="tile"
        href={tile.href}
        prefetch={false}
        linkAs={WorkViewLink}
        priority={priority}
        className="size-full cursor-zoom-in"
        top={
          <>
            <span aria-hidden="true" className="min-w-0">
              {tile.zone && (
                <Chip variant="tile" className="max-w-full">
                  <span className="truncate">{tile.zone}</span>
                </Chip>
              )}
            </span>
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-full glass text-text"
            >
              <ArrowUpRight className="size-4" />
            </span>
          </>
        }
      />
    )
  }

  if (tile.kind === 'reel') {
    const zone = workTypeLabel(tile.type)
    return (
      <MediaCard
        media={tile.image}
        sizes={SIZES}
        radius="media"
        overlay="work-tile"
        inset="tile"
        priority={priority}
        className="size-full"
        top={
          <div className="flex flex-wrap gap-1.5">
            <ReelsBadge />
            {zone && <Chip variant="tile">{zone}</Chip>}
          </div>
        }
      />
    )
  }

  const badge = mediaBadge(tile.photos, tile.videos)
  return (
    <MediaCard
      media={tile.image}
      sizes={SIZES}
      radius="media"
      overlay="work-tile"
      inset="tile"
      // A project — its page; an item — its view (opened in place by WorkViewLink)
      href={tile.href}
      labelledBy={titleId}
      // The project page is fetched ahead on an intent (hover, touch); the view is the same page
      prefetch={false}
      linkAs={tile.kind === 'item' ? WorkViewLink : ProjectLink}
      priority={priority}
      className="size-full"
      top={
        <div className="flex flex-wrap gap-1.5">
          {tile.kind === 'project' && tile.videos > 0 && <ReelsBadge />}
          {badge && <Chip variant="tile">{badge}</Chip>}
        </div>
      }
    >
      <div className="flex flex-col gap-1.5">
        <Heading
          id={titleId}
          className="line-clamp-3 text-work-title text-pretty md:text-work-title-md xl:text-work-title-xl"
        >
          {tile.title}
        </Heading>
        {tile.place && (
          <p className="flex items-center gap-1.5 text-body-xs font-semibold text-accent">
            <span className="line-clamp-1">{tile.place}</span>
            {tile.kind === 'project' && (
              <ArrowRight aria-hidden="true" className="size-3.5 shrink-0" />
            )}
          </p>
        )}
      </div>
    </MediaCard>
  )
}
