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
