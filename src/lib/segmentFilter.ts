import { DIRECTION_THRESHOLD } from './scrollDirection'

/** Filter value from the URL: an unknown or missing value is the fallback («все»). */
export const parseFilter = <T extends string>(
  raw: string | null | undefined,
  values: readonly T[],
  fallback: T,
): T => (values as readonly string[]).includes(raw ?? '') ? (raw as T) : fallback

/** Current URL with the filter: the fallback removes the parameter, the hash stays. */
export const filterUrl = (href: string, param: string, value: string, fallback: string): string => {
  const url = new URL(href)
  if (value === fallback) url.searchParams.delete(param)
  else url.searchParams.set(param, value)
  return `${url.pathname}${url.search}${url.hash}`
}

/** The sticky bar has left its place in the flow (the page is scrolled below it). */
export const isStuck = (sentinelTop: number, barTop: number): boolean => barTop - sentinelTop > 0.5

export type FilterScrollInput = {
  /** Current scrollY. */
  y: number
  /** Document offset of the bar's own place (the sentinel right before it). */
  barY: number
  /** Header height (`--header-h`), 0 without one. */
  headerH: number
  /** The header is pinned now. */
  pinned: boolean
}

/**
 * Where to scroll after a filter change while the bar is stuck: the bar back at its own place,
 * right under the header — the list starts from the beginning. A scroll up by more than the
 * direction threshold pins the smart header (nextHeaderState), so the bar goes under it; a
 * smaller one leaves the header as it is: pinned — under it, not pinned — at the top edge.
 */
export const filterScrollTarget = ({ y, barY, headerH, pinned }: FilterScrollInput): number => {
  // Rounded up: a fractional place of the bar never leaves a gap above it, the bar sticks instead
  const underHeader = Math.max(0, Math.ceil(barY - headerH))
  return pinned || y - underHeader > DIRECTION_THRESHOLD ? underHeader : Math.max(0, Math.ceil(barY))
}
