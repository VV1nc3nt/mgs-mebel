import { BgVideo } from '@/components/ui/BgVideo'
import { asMedia } from '@/lib/media'
import type { About } from '@/payload-types'
import { MediaHeading } from './MediaHeading'

type Props = {
  /** `hardware` of the about global. */
  hardware: Partial<About['hardware']> | undefined
  idPrefix?: string
}

/**
 * Hardware «#фурнитура» (about v2 §2.6): a background video over the poster, 4:5 / 16:9 / 21:9,
 * playing only while half of it is in view (BgVideo); the caption on glass at the bottom left.
 * The heading is above the block under 1280 and over it from 1280, on the side gradient.
 * No poster — no section.
 */
export function HardwareSection({ hardware, idPrefix = 'about' }: Props) {
  const poster = asMedia(hardware?.poster)
  if (!poster) return null
  const titleId = `${idPrefix}-hardware-title`

  return (
    <section
      aria-labelledby={hardware?.title ? titleId : undefined}
      className="page-container pt-section xl:pt-section-xl"
    >
      <div className="relative isolate flex flex-col gap-5">
        <MediaHeading
          label={hardware?.label}
          title={hardware?.title}
          text={hardware?.text}
          id={titleId}
          className="gap-3.5"
        />
        <div className="relative aspect-4/5 overflow-hidden rounded-media bg-surface md:aspect-video xl:aspect-21/9">
          <BgVideo poster={poster} video={hardware?.video} sizes={{ base: '100vw' }} />
          <div aria-hidden="true" className="absolute inset-0 hidden bg-overlay-side xl:block" />
          {hardware?.caption && (
            <p className="absolute bottom-5 left-5 rounded-2xl glass px-3.5 py-2 text-body-xs font-semibold">
              {hardware.caption}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
