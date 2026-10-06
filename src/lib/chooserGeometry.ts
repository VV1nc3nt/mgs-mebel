/*
 * Size of a contact button's capsule (README of the buttons §4). Closed: the button itself.
 * Open: padding 4 and a 1px glass border around cells of at least 44 (the hit area), gap 4,
 * «×» a circle of the cell height. The capsule keeps the closed width unless the cells need more.
 */
export const CHOOSER_CELL = 44
export const CHOOSER_GAP = 4
/** Padding 4 + border 1 on each side. */
export const CHOOSER_INSET = 5

export type ChooserGeometry = {
  /** Capsule, outer size. */
  width: number
  height: number
  /** The button: the whole capsule when closed, the «×» circle when open. */
  button: number
}

/** Narrowest open capsule for `n` messengers: (n + 1) cells, n gaps, the insets (3 → 198, 2 → 150). */
export const minChooserWidth = (n: number): number =>
  (n + 1) * CHOOSER_CELL + n * CHOOSER_GAP + 2 * CHOOSER_INSET

/**
 * `width` and `height` are the closed button's. Open, a capsule lower than 54 grows to it (the
 * cells stay ≥ 44), evenly up and down; the caller centres it, so neighbours do not move.
 */
export function chooserGeometry({
  width,
  height,
  n,
  open,
}: {
  width: number
  height: number
  n: number
  open: boolean
}): ChooserGeometry {
  if (!open) return { width, height, button: width }
  const cell = Math.max(CHOOSER_CELL, height - 2 * CHOOSER_INSET)
  return {
    width: Math.max(width, minChooserWidth(n)),
    height: cell + 2 * CHOOSER_INSET,
    button: cell,
  }
}
