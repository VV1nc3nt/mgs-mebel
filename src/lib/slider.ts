/** Index in 0…count−1, wrapping around in both directions; 0 for an empty slider. */
export const wrapIndex = (index: number, count: number): number =>
  count > 0 ? ((index % count) + count) % count : 0

/** Arrows go round: after the last slide comes the first, before the first — the last. */
export const nextIndex = (index: number, count: number): number => wrapIndex(index + 1, count)

export const prevIndex = (index: number, count: number): number => wrapIndex(index - 1, count)

export type SnapAlign = 'start' | 'center'

/** A scroll-snap track: its width, scroll-padding and scroll range. */
export type SnapTrack = {
  width: number
  paddingStart: number
  paddingEnd: number
  maxScroll: number
}

/**
 * Where the track rests when each slide snaps: its `scroll-snap-align` point lined up with the
 * snapport (the track minus its scroll-padding), clamped to the scroll range. `left` is the slide's
 * `offsetLeft`. Slides that clamp to the same end would share a resting place — one of them could
 * never be selected; the layout keeps the targets apart (salons: tablet snaps by the center).
 */
export const snapTargets = (
  slides: { left: number; width: number }[],
  track: SnapTrack,
  align: SnapAlign,
): number[] => {
  const max = Math.max(track.maxScroll, 0)
  const port = track.width - track.paddingStart - track.paddingEnd
  return slides.map(({ left, width }) => {
    const target =
      align === 'center'
        ? left + width / 2 - (track.paddingStart + port / 2)
        : left - track.paddingStart
    return Math.min(Math.max(target, 0), max)
  })
}

/**
 * The active slide of a scroll-snap track (README «Салоны» §3.3): the one whose snap target is
 * nearest to `scrollLeft`; the first of equals. 0 without slides.
 */
export const nearestSlide = (targets: number[], scrollLeft: number): number => {
  let nearest = 0
  targets.forEach((target, i) => {
    if (Math.abs(target - scrollLeft) < Math.abs(targets[nearest] - scrollLeft)) nearest = i
  })
  return nearest
}

/** Index kept in 0…count−1 (arrows that stop at the ends); 0 for an empty slider. */
export const clampIndex = (index: number, count: number): number =>
  count > 0 ? Math.min(Math.max(index, 0), count - 1) : 0

export const atStart = (index: number): boolean => index <= 0

export const atEnd = (index: number, count: number): boolean => index >= count - 1

/**
 * The inline-axis value of a computed `scroll-snap-align`: «block inline» or one value for both,
 * so the last word.
 */
export const snapAlignOf = (value: string | undefined): SnapAlign =>
  value?.trim().split(/\s+/).pop() === 'center' ? 'center' : 'start'

/** The track is off a snap target by a pixel or more: it has to move there. */
export const needsRealign = (target: number, scrollLeft: number): boolean =>
  Math.abs(target - scrollLeft) >= 1

/** Slider counter «01 / 04»: the current slide (1-based) and the count, two digits at least. */
export const counterParts = (index: number, count: number): [string, string] => [
  String(index + 1).padStart(2, '0'),
  String(count).padStart(2, '0'),
]
