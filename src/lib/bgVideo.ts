/** Background video rules (README §1.3): when to load it and when to fall back to the poster. */

/** Connections on which background videos are not loaded (`navigator.connection.effectiveType`). */
export const SLOW_CONNECTIONS: readonly string[] = ['slow-2g', '2g', '3g']

/** Without `playing` this long after a play attempt the video gives way to the poster. */
export const VIDEO_START_TIMEOUT_MS = 4000

export type NetworkInfo = { saveData?: boolean; effectiveType?: string }

/** Data Saver or a slow connection. */
export const isLiteNetwork = ({ saveData, effectiveType }: NetworkInfo): boolean =>
  saveData === true || (effectiveType !== undefined && SLOW_CONNECTIONS.includes(effectiveType))

/** Whether a background video may be loaded at all; otherwise only the poster is shown. */
export const videoAllowed = ({
  reducedMotion,
  liteNetwork,
}: {
  reducedMotion: boolean
  liteNetwork: boolean
}): boolean => !reducedMotion && !liteNetwork

/**
 * Share of a background video block that must be in view before it loads and plays (README §3.1
 * of the salons page; the same for every video without `priority`). No margin around the viewport.
 */
export const VIDEO_VISIBLE_RATIO = 0.5

/**
 * IntersectionObserver threshold of a block: `ratio` of it, or — for a block taller than the
 * viewport — the share that fills `ratio` of the viewport (half of a block three viewports high
 * is never in view at once).
 */
export const visibleThreshold = (
  elementHeight: number,
  rootHeight: number,
  ratio: number = VIDEO_VISIBLE_RATIO,
): number => (elementHeight > 0 ? Math.min(ratio, (ratio * rootHeight) / elementHeight) : ratio)

/** Rounding of the observer's own ratio at the crossing. */
const RATIO_EPSILON = 0.001

/** Whether an observed block is in view enough for its video at this threshold. */
export const isVisibleEnough = (
  { isIntersecting, intersectionRatio }: Pick<IntersectionObserverEntry, 'isIntersecting' | 'intersectionRatio'>,
  threshold: number,
): boolean => isIntersecting && intersectionRatio >= threshold - RATIO_EPSILON
