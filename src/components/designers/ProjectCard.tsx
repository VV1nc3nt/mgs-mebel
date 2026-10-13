import { BgVideo } from '@/components/ui/BgVideo'
import { itemNumber } from '@/lib/designers'
import type { Media } from '@/payload-types'

type Props = {
  title: string
  meta?: string | null
  poster: Media | number
  video?: Media | number | null
  /** Place among the visible projects: 0 → «01». */
  index: number
}

/**
 * Project card of the media slider (designers v2 §2.3): poster and background video (only the
 * active card's plays — the slider tells it), the gradient, the number on glass, H3 and the
 * caption at the bottom.
 */
export function ProjectCard({ title, meta, poster, video, index }: Props) {
  return (
    <>
      <BgVideo
        poster={poster}
        video={video}
        sizes={{ base: '86vw', md: '80vw', xl: '82vw' }}
        lazySrc
      />
      <div aria-hidden="true" className="absolute inset-0 bg-overlay-project" />
      <p
        aria-hidden="true"
        className="absolute top-4 left-4 flex size-9 items-center justify-center rounded-full glass text-body-xs font-bold text-accent"
      >
        {itemNumber(index)}
      </p>
      <div className="absolute inset-x-5 bottom-5 flex flex-col gap-1.5">
        <h3 className="text-title-s">{title}</h3>
        {meta && <p className="text-body-xs text-text-2">{meta}</p>}
      </div>
    </>
  )
}
