import { MediaSlider } from '@/components/ui/MediaSlider'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { visibleProjects } from '@/lib/designers'
import type { Designer } from '@/payload-types'
import { ProjectCard } from './ProjectCard'

type Props = {
  /** `projects` of the designers global. */
  projects: Designer['projects'] | undefined
  idPrefix?: string
}

/**
 * «#проекты» (designers v2 §2.3): label and H2, the counter and (from 1280) the arrows, then the
 * cards on the media slider with the progress bars under 1280. Hidden projects are left out and
 * not counted; none — no section, one — no controls (MediaSlider).
 */
export function ProjectsSection({ projects, idPrefix = 'designers' }: Props) {
  const items = visibleProjects(projects?.items)
  if (!items.length) return null
  const titleId = `${idPrefix}-projects-title`

  return (
    <MediaSlider
      size="project"
      arrows
      counter
      progress
      prevLabel="Предыдущий проект"
      nextLabel="Следующий проект"
      headingId={titleId}
      className="pt-section xl:pt-section-xl"
      heading={
        // Without an H2 the whole heading block names the slider
        <div id={projects?.title ? undefined : titleId}>
          <SectionHeading label={projects?.label} title={projects?.title} id={titleId} />
        </div>
      }
      slides={items.map((item, i) => (
        <ProjectCard
          key={item.id ?? i}
          title={item.title}
          meta={item.meta}
          poster={item.poster}
          video={item.video}
          index={i}
        />
      ))}
    />
  )
}
