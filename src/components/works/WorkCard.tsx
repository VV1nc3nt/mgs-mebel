import { Play } from 'lucide-react'

import { CarouselIcon } from '@/components/icons/CarouselIcon'
import { MediaCard } from '@/components/ui/MediaCard'
import type { WorkPreview } from '@/lib/works'

type Props = {
  /** Preview of the home «Наши работы» (README §6.1 п.6, H3 under the section's H2). */
  work: WorkPreview
}

function KindIcon({ work, className }: { work: WorkPreview; className: string }) {
  return (
    <span className={className}>
      {work.kind === 'video' ? <Play aria-hidden="true" fill="currentColor" /> : <CarouselIcon />}
      <span className="sr-only">{work.kind === 'video' ? 'Видео' : 'Фото'}</span>
    </span>
  )
}

/** Work preview: the first frame, ▶ (video) or the carousel icon (photos), category and title. */
export function WorkCard({ work }: Props) {
  return (
    <MediaCard
      media={work.image}
      sizes={{ base: '50vw', md: '25vw' }}
      ratio="9/14"
      radius="thumb-lg"
      overlay="work"
      inset="work"
      href={work.href}
      // The project page is rendered on the click only
      prefetch={false}
      top={
        <KindIcon
          work={work}
          className="flex size-8 items-center justify-center rounded-full glass text-text [&_svg]:size-4"
        />
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
