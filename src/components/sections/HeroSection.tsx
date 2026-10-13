import { BgVideo } from '@/components/ui/BgVideo'
import { ContactButton } from '@/components/ui/ContactButton'
import { SectionLabel } from '@/components/ui/SectionLabel'
import type { Messenger } from '@/lib/chrome'
import { asMedia } from '@/lib/media'
import type { SectionHeroCta } from '@/payload-types'

type Props = {
  /** `hero` of a page global (heroTab); without the CTA label there is no button. */
  hero: Partial<SectionHeroCta> | undefined
  /** «Рассчитать проект»: messengers in order; none — no button. */
  messengers: Messenger[]
  /** Prefix of the heading ids: one per page (`home-…`, `about-…`). */
  idPrefix?: string
}

/**
 * First screen of «О нас» (about v2 §2.1): background video over the poster (the LCP image), the
 * «О нас» overlay, label, H1, text, CTA. The header lies over it; the content sits at the bottom.
 */
export function HeroSection({ hero, messengers, idPrefix = 'home' }: Props) {
  const title = hero?.title?.trim()
  if (!title) return null
  const poster = asMedia(hero?.poster)
  const ctaLabel = hero?.ctaLabel?.trim()
  const titleId = `${idPrefix}-hero-title`

  return (
    <section
      aria-labelledby={titleId}
      className="relative h-hero overflow-hidden bg-surface md:h-hero-md xl:h-screen xl:min-h-hero-md"
    >
      {poster && <BgVideo poster={poster} video={hero?.video} sizes={{ base: '100vw' }} priority />}
      <div aria-hidden="true" className="absolute inset-0 bg-overlay-about" />
      <div className="absolute inset-x-0 bottom-8 page-container">
        <div className="flex flex-col gap-4 md:max-w-hero">
          {hero?.label && <SectionLabel>{hero.label}</SectionLabel>}
          <h1 id={titleId} className="text-h1 md:text-h1-md xl:text-h1-xl">
            {title}
          </h1>
          {hero?.text && (
            <p className="max-w-hero-text text-body text-pretty text-text-2">{hero.text}</p>
          )}
          {ctaLabel && messengers.length > 0 && (
            <div className="flex pt-1.5">
              <ContactButton
                caption={ctaLabel}
                messengers={messengers}
                size={52}
                fullWidth="mobile"
                arrow
              />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
