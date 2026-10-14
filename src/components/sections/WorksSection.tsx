import { Button } from '@/components/ui/Button'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { WorkCard } from '@/components/works/WorkCard'
import { initialWorkFilter, type WorkPanel } from '@/lib/works'
import type { SectionWorks } from '@/payload-types'
import { WorksChips } from './WorksChips'

type Props = {
  section: Partial<SectionWorks> | undefined
  /** Panels of the chips that have works, in chip order. */
  panels: WorkPanel[]
  /** Prefix of the heading ids: one per page (`home-…`, `about-…`). */
  idPrefix?: string
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
                <WorkCard work={work} variant="home" />
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
