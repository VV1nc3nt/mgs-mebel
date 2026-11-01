import type { ReelTile } from './works'

export const REEL_PARAM = 'reel'
export type SearchParams = Record<string, string | string[] | undefined>

/** Stable owner + media identity, never a position in a sortable field. */
export function parseReel(value: unknown): string | null {
  if (typeof value !== 'string' || !/^[pi]-[1-9]\d{0,15}-[1-9]\d{0,15}$/.test(value)) return null
  return value
    .slice(2)
    .split('-')
    .every((id) => Number.isSafeInteger(Number(id)))
    ? value
    : null
}

export function reelHref(key: string, path = '/works'): string {
  const query = new URLSearchParams(path === '/works' ? { category: 'reels' } : {})
  query.set(REEL_PARAM, key)
  return `${path}?${query}`
}

export function searchOf(params: SearchParams): URLSearchParams {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    for (const part of Array.isArray(value) ? value : value === undefined ? [] : [value])
      search.append(key, part)
  }
  return search
}

export function withoutView(search: URLSearchParams): URLSearchParams {
  const clean = new URLSearchParams(search)
  for (const key of [REEL_PARAM, 'item', 'photo']) clean.delete(key)
  return clean
}

export function address(path: string, search: URLSearchParams): string {
  return `${path}${search.size ? `?${search}` : ''}`
}

/** Presence of reel takes precedence, including an invalid reel. No fallback to item. */
export function normalizeReel(search: URLSearchParams, reels: readonly ReelTile[]) {
  const next = new URLSearchParams(search)
  let key: string | null = null
  if (next.has(REEL_PARAM)) {
    const values = next.getAll(REEL_PARAM)
    const parsed = values.length === 1 ? parseReel(values[0]) : null
    key = parsed && reels.some((reel) => reel.reel === parsed) ? parsed : null
    next.delete('item')
    next.delete('photo')
    if (!key) next.delete(REEL_PARAM)
  } else if (!next.has('item')) next.delete('photo')
  return { key, search: next, changed: next.toString() !== search.toString() }
}
