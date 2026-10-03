import { BgVideo } from '@/components/ui/BgVideo'
import { Button } from '@/components/ui/Button'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { contactLabel, type Messenger } from '@/lib/chrome'
import { asMedia } from '@/lib/media'
import type { Home } from '@/payload-types'

type Props = {
  hero: Partial<Home['hero']> | undefined
  /** «Рассчитать проект»: WhatsApp, else Telegram, else no button. */
  action: Messenger | undefined
}

/**
 * Home first screen (README §6.1 п.1): background video over the poster (the LCP image), the hero
 * overlay, label, H1, text, CTA. The header lies over it; the content sits at the bottom.
 */
export function HomeHero({ hero, action }: Props) {
  const title = hero?.title?.trim()
  if (!title) return null
  const poster = asMedia(hero?.poster)
  const ctaLabel = hero?.ctaLabel?.trim()

  return (
    <section
      aria-labelledby="home-hero-title"
      className="relative h-hero overflow-hidden bg-surface md:h-hero-md xl:h-screen xl:min-h-hero-md"
    >
      {poster && <BgVideo poster={poster} video={hero?.video} sizes={{ base: '100vw' }} priority />}
      <div aria-hidden="true" className="absolute inset-0 bg-overlay-hero" />
      <div className="absolute inset-x-0 bottom-8 page-container">
        <div className="flex flex-col gap-4 md:max-w-hero">
          {hero?.label && <SectionLabel>{hero.label}</SectionLabel>}
          <h1 id="home-hero-title" className="text-h1 md:text-h1-md xl:text-h1-xl">
            {title}
          </h1>
          {hero?.text && (
            <p className="max-w-hero-text text-body text-pretty text-text-2">{hero.text}</p>
          )}
          {ctaLabel && action && (
            <div className="flex pt-1.5">
              <Button
                href={action.href}
                size={52}
                width="mobile-full"
                arrow
                aria-label={contactLabel(ctaLabel, action)}
              >
                {ctaLabel}
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
