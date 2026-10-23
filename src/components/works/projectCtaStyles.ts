/**
 * Classes of the CTA tile of a project page, shared by its link (one messenger, server) and its
 * choice (two or three, client). The whole tile is the trigger: an `absolute inset-0` link or
 * button under a layer of text that lets clicks through.
 */

export const CTA_TITLE_ID = 'project-cta-title'
export const CTA_TEXT_ID = 'project-cta-text'

/** The tile: dark like «О проекте»; hover as the frame tiles (MediaCard); widths by container. */
export const CTA_TILE =
  'group/cta @container relative flex size-full flex-col rounded-media bg-surface transition-opacity not-data-open:hover:opacity-88'

/** The trigger over the whole tile, its border on it: the focus ring around the tile, as on tiles. */
export const CTA_TRIGGER = 'absolute inset-0 rounded-media border border-border'

/** Text over the trigger; nothing of it leaves the tile (clamped title and text). */
export const CTA_CONTENT =
  'pointer-events-none relative flex min-h-0 flex-1 flex-col gap-2 p-3 @cta-tile:gap-3 @cta-tile:p-4'

/** «<button> →» of a narrow tile: lime text, wrapping to two lines. */
export const CTA_LABEL_TEXT = 'line-clamp-2 text-body-xs font-bold text-accent'
