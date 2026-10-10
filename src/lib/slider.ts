/** Index in 0…count−1, wrapping around in both directions; 0 for an empty slider. */
export const wrapIndex = (index: number, count: number): number =>
  count > 0 ? ((index % count) + count) % count : 0

/** Arrows go round: after the last slide comes the first, before the first — the last. */
export const nextIndex = (index: number, count: number): number => wrapIndex(index + 1, count)

export const prevIndex = (index: number, count: number): number => wrapIndex(index - 1, count)

/**
 * Slide nearest to the start of a scroll-snap track (README «Салоны» §3.3): `offsets` are the
 * slides' `offsetLeft − paddingLeft`. At the end of the track the last slide wins — with several
 * slides per view it can never reach the start.
 */
export const nearestSlide = (offsets: number[], scrollLeft: number, maxScroll: number): number => {
  if (!offsets.length) return 0
  if (maxScroll > 0 && scrollLeft >= maxScroll - 1) return offsets.length - 1
  let nearest = 0
  offsets.forEach((offset, i) => {
    if (Math.abs(offset - scrollLeft) < Math.abs(offsets[nearest] - scrollLeft)) nearest = i
  })
  return nearest
}
