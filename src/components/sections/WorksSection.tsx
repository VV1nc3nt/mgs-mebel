import { Play } from 'lucide-react'

import { CarouselIcon } from '@/components/icons/CarouselIcon'
import { Button } from '@/components/ui/Button'
import { MediaCard } from '@/components/ui/MediaCard'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { initialWorkFilter, type WorkPanel, type WorkPreview } from '@/lib/works'
import type { SectionWorks } from '@/payload-types'
import { WorksChips } from './WorksChips'

type Props = {
  section: Partial<SectionWorks> | undefined
  /** Panels of the chips that have works, in chip order. */
  panels: WorkPanel[]
  /** Prefix of the heading ids: one per page (`home-…`, `about-…`). */
  idPrefix?: string
}

function WorkCard({ work }: { work: WorkPreview }) {
  return (
    <MediaCard
      media={work.image}
      sizes={{ base: '50vw', md: '25vw' }}
      ratio="9/14"
      radius="thumb-lg"
      overlay="work"
      inset="work"
      href={work.href}
      top={
        <span className="flex size-8 items-center justify-center rounded-full glass text-text [&_svg]:size-4">
          {work.kind === 'video' ? (
            <Play aria-hidden="true" fill="currentColor" />
          ) : (
            <CarouselIcon />
          )}
          <span className="sr-only">{work.kind === 'video' ? 'Видео' : 'Фото'}</span>
        </span>
      }
    >
      <div className="flex flex-col gap-1">
        {work.category && (
          <p className="text-caption-s font-normal text-text-2 lowercase">{work.category}</p>
        )}
        <h3 className="text-body-xs font-bold text-text">{work.title}</h3>
      </div>
    </MediaCard>
  )
}

/**
 * «#Наши работы» (README §6.1 п.6): chips (reels + categories), up to 4 previews per chip
 * (2 columns, 4 from tablet), «Смотреть все работы». No works at all — no section.
 */
export function WorksSection({ section, panels, idPrefix = 'home' }: Props) {
  const headingId = `${idPrefix}-works-title`
  const initial = initialWorkFilter(panels)
  if (!initial) return null
  const title = section?.title?.trim()
  const buttonLabel = section?.buttonLabel?.trim()

  return (
    <section
      aria-labelledby={title ? headingId : undefined}
      aria-label={title ? undefined : (section?.label ?? undefined)}
      className="flex flex-col gap-heading pt-section xl:pt-section-xl"
    >
      <SectionHeading
        label={section?.label}
        title={title}
        id={headingId}
        className="page-container"
      />
      <WorksChips
        chips={panels.map(({ key, label }) => ({ key, label }))}
        initial={initial}
        panels={panels.map((panel) => (
          <ul key={panel.key} className="page-container grid grid-cols-2 gap-2 md:grid-cols-4">
            {panel.works.map((work) => (
              <li key={work.id}>
                <WorkCard work={work} />
              </li>
            ))}
          </ul>
        ))}
      />
      {buttonLabel && (
        <div className="page-container flex justify-center">
          <Button href="/works" variant="outline" size={52} width="mobile-full" arrow>
            {buttonLabel}
          </Button>
        </div>
      )}
    </section>
  )
}
