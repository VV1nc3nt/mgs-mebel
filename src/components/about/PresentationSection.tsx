import { PosterImage } from '@/components/ui/PosterImage'
import { PosterPlayer } from '@/components/ui/PosterPlayer'
import { asMedia, videoSource } from '@/lib/media'
import type { About } from '@/payload-types'
import { MediaHeading } from './MediaHeading'

type Props = {
  /** `mission` of the about global («Видео-презентация»). */
  mission: Partial<About['mission']> | undefined
  idPrefix?: string
}

/**
 * Video presentation «#миссия» (about v2 §2.5): the poster player (a file or a RuTube / VK link,
 * with sound), 4:5 / 16:9 / 21:9. The heading is above it under 1280 and over it from 1280, where
 * it fades while the video plays (data-player-host + media-heading-fade). No poster — no section;
 * neither file nor link — the poster without ▶.
 */
export function PresentationSection({ mission, idPrefix = 'about' }: Props) {
  const poster = asMedia(mission?.poster)
  if (!poster) return null
  const titleId = `${idPrefix}-mission-title`

  return (
    <section
      aria-labelledby={mission?.title ? titleId : undefined}
      data-player-host=""
      className="page-container pt-section xl:pt-section-xl"
    >
      <div className="relative isolate flex flex-col gap-5">
        <MediaHeading
          label={mission?.label}
          title={mission?.title}
          text={mission?.text}
          id={titleId}
          className="media-heading-fade gap-2.5"
        />
        <PosterPlayer
          poster={<PosterImage media={poster} sizes={{ base: '100vw' }} />}
          file={videoSource(mission?.video)}
          embedUrl={mission?.embedUrl}
          caption={mission?.caption}
          duration={mission?.duration}
          className="aspect-4/5 rounded-media md:aspect-video xl:aspect-21/9"
        />
      </div>
    </section>
  )
}
