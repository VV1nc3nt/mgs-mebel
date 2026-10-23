import { memo, type CSSProperties, type ReactNode, type Ref } from 'react'

import { gridVars, masonryLayouts, tileVars } from '@/lib/masonry'
import type { GalleryTile } from '@/lib/workProject'
import type { WorkTile as Tile } from '@/lib/works'
import { WorkTile } from './WorkTile'

type Props = {
  tiles: readonly (Tile | GalleryTile)[]
  /** Change of the feed: the old tiles fade out (`works-wave` in globals.css). */
  leaving?: boolean
  /** Tiles whose image is preloaded: the first row of the widest layout. */
  priority?: number
  listRef?: Ref<HTMLUListElement>
  /** Content of the CTA tile of a project page (its place is in `tiles`). */
  cta?: ReactNode
}

/**
 * Masonry of the works page: laid out on the server for 2 / 3 / 4 columns (lib/masonry), one list
 * for every breakpoint — the order of the list is the reading order by rows. Memoized: the
 * address of the view of an item changes on every step, the feed under it stays as it is.
 */
export const WorksGrid = memo(function WorksGrid({
  tiles,
  leaving,
  priority = 0,
  listRef,
  cta,
}: Props) {
  const layouts = masonryLayouts(tiles.map((tile) => tile.ratio))
  return (
    <div className="page-container">
      <div className="@container">
        <ul
          ref={listRef}
          data-works-grid=""
          data-wave={leaving ? 'out' : undefined}
          className="works-grid works-wave"
          style={gridVars(layouts) as CSSProperties}
        >
          {tiles.map((tile, i) => (
            <li key={tile.key} style={tileVars(tile.ratio, layouts, i) as CSSProperties}>
              {tile.kind === 'cta' ? cta : <WorkTile tile={tile} priority={i < priority} />}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
})
