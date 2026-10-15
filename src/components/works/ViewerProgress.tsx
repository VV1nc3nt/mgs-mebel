import { cn } from '@/lib/cn'

type Props = {
  /** Frames of the project. */
  count: number
  /** Current frame: it and the ones before are filled. */
  current: number
}

/**
 * Segments over the viewer (README §6.4): one per frame, the passed ones and the current one
 * filled. A photo is filled at once; a video's segment is filled too until playback comes.
 */
export function ViewerProgress({ count, current }: Props) {
  return (
    <div aria-hidden="true" className="flex gap-1">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="h-0.75 flex-1 overflow-hidden rounded-full bg-text/30">
          <div className={cn('h-full bg-text', i <= current ? 'w-full' : 'w-0')} />
        </div>
      ))}
    </div>
  )
}
