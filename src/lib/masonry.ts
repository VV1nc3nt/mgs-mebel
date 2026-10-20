/**
 * Masonry of the works page, laid out on the server for 2 / 3 / 4 columns (mobile / md / xl):
 * every tile goes to the shortest column, so the order reads by rows. The tiles sit `absolute`
 * by CSS custom properties (`works-grid` in globals.css), one DOM list for every layout — no JS,
 * no shift, and no hidden copies whose images would load.
 */

/** Column counts of the three breakpoints. */
export const MASONRY_COLUMNS = [2, 3, 4] as const
export type MasonryColumns = (typeof MASONRY_COLUMNS)[number]

/** Height / width of a tile whose image size is unknown (4:5). */
export const FALLBACK_RATIO = 5 / 4

/**
 * Vertical gap in column widths, per column count: 12 px at a typical column width (390 → 169,
 * 834 → 248, 1440 → 316). Only breaks ties between nearly equal columns; the CSS adds real gaps.
 */
const GAP_SHARE: Record<MasonryColumns, number> = { 2: 12 / 169, 3: 12 / 248, 4: 12 / 316 }

export type MasonryPlace = {
  /** Column index. */
  column: number
  /** Sum of the height / width ratios of the tiles above, in column widths. */
  top: number
  /** Number of tiles above (vertical gaps). */
  above: number
}

export type MasonryLayout = {
  places: MasonryPlace[]
  /** Per column: sum of ratios and number of tiles. */
  columns: { units: number; count: number }[]
}

/** Height / width ratio from image dimensions; FALLBACK_RATIO when unknown. */
export const tileRatio = (width?: number | null, height?: number | null): number =>
  width && height && width > 0 && height > 0 ? height / width : FALLBACK_RATIO

/** Each tile in the shortest column (the leftmost one on a tie). */
export function masonry(ratios: readonly number[], count: MasonryColumns): MasonryLayout {
  const gap = GAP_SHARE[count]
  const columns = Array.from({ length: count }, () => ({ units: 0, count: 0 }))
  const height = (c: { units: number; count: number }) => c.units + c.count * gap
  const places = ratios.map((ratio) => {
    let column = 0
    for (let i = 1; i < count; i++) {
      // A strict «<» keeps ties on the left: the first row fills left to right
      if (height(columns[i]!) < height(columns[column]!) - 1e-9) column = i
    }
    const target = columns[column]!
    const place = { column, top: target.units, above: target.count }
    target.units += ratio
    target.count += 1
    return place
  })
  return { places, columns }
}

const round = (n: number) => Math.round(n * 1e4) / 1e4

/**
 * Height of the list: the tallest column. CSS `max()` over every column, so the estimate of the
 * column width never decides it. `--cw` — column width, `--gy` — vertical gap (globals.css).
 */
export const masonryHeight = ({ columns }: MasonryLayout): string => {
  const terms = columns
    .filter((c) => c.count > 0)
    .map((c) => `calc(${round(c.units)} * var(--cw) + ${c.count - 1} * var(--gy))`)
  return terms.length ? `max(${terms.join(', ')})` : '0'
}

/** Custom properties of a tile in the three layouts: `--c2 --t2 --k2 …`, and its ratio `--r`. */
export const tileVars = (
  ratio: number,
  layouts: readonly MasonryLayout[],
  index: number,
): Record<string, number> => {
  const vars: Record<string, number> = { '--r': round(ratio) }
  MASONRY_COLUMNS.forEach((count, l) => {
    const place = layouts[l]!.places[index]!
    vars[`--c${count}`] = place.column
    vars[`--t${count}`] = round(place.top)
    vars[`--k${count}`] = place.above
  })
  return vars
}

/** Custom properties of the list: its height in the three layouts. */
export const gridVars = (layouts: readonly MasonryLayout[]): Record<string, string> =>
  Object.fromEntries(MASONRY_COLUMNS.map((count, l) => [`--h${count}`, masonryHeight(layouts[l]!)]))

/** The three layouts of the same tiles. */
export const masonryLayouts = (ratios: readonly number[]): MasonryLayout[] =>
  MASONRY_COLUMNS.map((count) => masonry(ratios, count))
