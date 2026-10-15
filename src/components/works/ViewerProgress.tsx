import type { Ref } from 'react'

import { cssVars } from '@/lib/cssVars'

type Props = {
  /** Frames of the project. */
  count: number
  /** Current frame: the ones before are filled. */
  current: number
  /** The current frame is a video that has not ended or failed: its fill starts empty. */
  playback: boolean
  /** Key of the current frame (project and frame): a new one — a new fill, from zero. */
  frameKey: string
  /** Fill of the current segment: the frame's video writes its progress there. */
  fillRef?: Ref<HTMLDivElement>
}

/**
 * Segments over the viewer (README §6.4): one per frame, the passed ones filled. A photo is filled
 * at once; a video's segment fills with the file's own progress (`ViewerVideo`), or at once when
 * the video cannot play.
 */
export function ViewerProgress({ count, current, playback, frameKey, fillRef }: Props) {
  return (
    <div aria-hidden="true" className="flex gap-1">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="h-0.75 flex-1 overflow-hidden rounded-full bg-text/30">
          <div
            key={i === current ? `current-${frameKey}` : i}
            ref={i === current ? fillRef : undefined}
            data-viewer-fill={i === current ? '' : undefined}
            className="h-full bg-text viewer-progress-fill"
            style={cssVars({
              '--viewer-progress': i < current || (i === current && !playback) ? 1 : 0,
            })}
          />
        </div>
      ))}
    </div>
  )
}
