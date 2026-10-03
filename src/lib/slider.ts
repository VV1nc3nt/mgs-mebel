/** Index in 0…count−1, wrapping around in both directions; 0 for an empty slider. */
export const wrapIndex = (index: number, count: number): number =>
  count > 0 ? ((index % count) + count) % count : 0

/** Arrows go round: after the last slide comes the first, before the first — the last. */
export const nextIndex = (index: number, count: number): number => wrapIndex(index + 1, count)

export const prevIndex = (index: number, count: number): number => wrapIndex(index - 1, count)
