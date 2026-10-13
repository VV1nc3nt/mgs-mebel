/**
 * Only one video with sound plays at a time (the «О нас» presentation, the news video blocks): a
 * module store, as lib/overlay.ts. Background videos are muted and not part of it.
 */
let stopCurrent: (() => void) | null = null

/**
 * A player starts with sound: the one playing before it stops. Returns the release to call when
 * this player stops on its own.
 */
export function claimSound(stop: () => void): () => void {
  if (stopCurrent && stopCurrent !== stop) stopCurrent()
  stopCurrent = stop
  return () => {
    if (stopCurrent === stop) stopCurrent = null
  }
}
