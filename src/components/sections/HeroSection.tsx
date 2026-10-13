import { Fragment, type ReactNode } from 'react'

import { BgVideo } from '@/components/ui/BgVideo'
import { ContactButton } from '@/components/ui/ContactButton'
import { SectionLabel } from '@/components/ui/SectionLabel'
import type { Messenger } from '@/lib/chrome'
import { cn } from '@/lib/cn'
import { asMedia } from '@/lib/media'
import type { SectionHeroCta } from '@/payload-types'

/** The parts of a page hero this section reads: «О нас» (heroTab) and «Дизайнерам». */
export type HeroData = Partial<
  Pick<SectionHeroCta, 'label' | 'title' | 'text' | 'poster' | 'video'>
> & {
  ctaLabel?: string | null
}

/**
 * Per page: the overlay, the mobile height (tablet 780, desktop the screen, at least 780) and the
 * paragraph width. «О нас» — about v2 §2.1; «Дизайнерам» — designers v2 §2.1.
 */
const VARIANT = {
  about: { overlay: 'bg-overlay-about', height: 'h-hero', text: 'max-w-hero-text' },
  designers: { overlay: 'bg-overlay-hero', height: 'h-hero-tall', text: 'max-w-hero-lead' },
} as const

export type HeroVariant = keyof typeof VARIANT

type Props = {
  /** `hero` of a page global; without the CTA label there is no button. */
  hero: HeroData | undefined
  /** «Рассчитать проект»: messengers in order; none — no button. */
  messengers?: Messenger[]
  /** Under the text: the audience chips of «Дизайнерам». */
  chips?: ReactNode
  variant?: HeroVariant
  /** Prefix of the heading ids: one per page (`home-…`, `about-…`). */
  idPrefix?: string
}

/**
 * First screen of an inner page («О нас», «Дизайнерам»): background video over the poster (the
 * LCP image), the overlay, label, H1 (a line break typed in the CMS stays one), text, then the
 * chips or the CTA. The header lies over it; the content sits at the bottom.
 */
export function HeroSection({
  hero,
  messengers = [],
  chips,
  variant = 'about',
  idPrefix = 'home',
}: Props) {
  const title = hero?.title?.trim()
  if (!title) return null
  const poster = asMedia(hero?.poster)
  const ctaLabel = hero?.ctaLabel?.trim()
  const titleId = `${idPrefix}-hero-title`
  const { overlay, height, text } = VARIANT[variant]
  const lines = title.split(/\r?\n/)

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        'relative overflow-hidden bg-surface md:h-hero-md xl:h-screen xl:min-h-hero-md',
        height,
      )}
    >
      {poster && <BgVideo poster={poster} video={hero?.video} sizes={{ base: '100vw' }} priority />}
      <div aria-hidden="true" className={cn('absolute inset-0', overlay)} />
      <div className="absolute inset-x-0 bottom-8 page-container">
        <div className="flex flex-col gap-4 md:max-w-hero">
          {hero?.label && <SectionLabel>{hero.label}</SectionLabel>}
          <h1 id={titleId} className="text-h1 md:text-h1-md xl:text-h1-xl">
            {lines.map((line, i) => (
              <Fragment key={i}>
                {i > 0 && <br />}
                {line}
              </Fragment>
            ))}
          </h1>
          {hero?.text && (
            <p className={cn('text-body text-pretty text-text-2', text)}>{hero.text}</p>
          )}
          {chips}
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
