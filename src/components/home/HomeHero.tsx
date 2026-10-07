import Link from 'next/link'

import { ContactButton } from '@/components/ui/ContactButton'
import { HIT_AREA_Y } from '@/components/ui/hitArea'
import type { Messenger } from '@/lib/chrome'
import { cn } from '@/lib/cn'
import type { SectionHeroSlides } from '@/payload-types'
import { HomeHeroStage, type HeroSegment } from './HomeHeroStage'

type Props = {
  /** `hero` of the home global (heroSlidesTab). */
  hero: Partial<SectionHeroSlides> | undefined
  /** «Рассчитать проект»: messengers in order; none — no button. */
  messengers: Messenger[]
  idPrefix?: string
}

// The scene shows at most two segments (home README §1).
const MAX_SEGMENTS = 2

/**
 * Home hero scene (home README §1): one or two segments over background videos, the CTA, the link
 * to «О нас» and, with two segments, the switching controls. No title in segment 01 — no hero;
 * one segment — a plain hero without controls. Texts and posters are in the server HTML.
 */
export function HomeHero({ hero, messengers, idPrefix = 'home' }: Props) {
  const segments: HeroSegment[] = (hero?.slides ?? [])
    .filter((slide) => slide.title?.trim())
    .slice(0, MAX_SEGMENTS)
    .map((slide) => ({
      label: slide.label?.trim() || undefined,
      title: slide.title.trim(),
      text: slide.text?.trim() || undefined,
      poster: slide.poster,
      video: slide.video,
    }))
  if (!hero?.slides?.[0]?.title?.trim() || !segments.length) return null
  const linkLabel = hero.linkLabel?.trim()
  const ctaLabel = hero.ctaLabel?.trim()

  return (
    <HomeHeroStage
      segments={segments}
      titleId={`${idPrefix}-hero-title`}
      cta={
        ctaLabel &&
        messengers.length > 0 && (
          <ContactButton
            caption={ctaLabel}
            messengers={messengers}
            size={52}
            fullWidth="mobile"
            arrow
          />
        )
      }
      link={
        linkLabel && (
          <Link
            href="/about"
            // Mobile: as high as drawn (the 32 arrow circle), the 44 hit area from ::before
            className={cn(
              'relative flex basis-full items-center justify-center gap-2.5 text-button transition-colors hover:text-accent md:min-h-hit md:basis-auto',
              HIT_AREA_Y,
            )}
          >
            {linkLabel}
            <span
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-full bg-surface-3"
            >
              →
            </span>
          </Link>
        )
      }
    />
  )
}
