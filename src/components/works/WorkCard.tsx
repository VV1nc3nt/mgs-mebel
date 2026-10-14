import { Play } from 'lucide-react'

import { CarouselIcon } from '@/components/icons/CarouselIcon'
import { MediaCard } from '@/components/ui/MediaCard'
import type { WorkPreview } from '@/lib/works'

type Props = {
  work: WorkPreview
  /**
   * `home` — preview of the home «Наши работы» (README §6.1 п.6, H3 under the section's H2);
   * `feed` — card of the works feed (README §6.4, H2 under the page's H1).
   */
  variant: 'home' | 'feed'
  /** LCP image: preloaded, not lazy (the first row of the feed). */
  priority?: boolean
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
export function WorkCard({ work, variant, priority }: Props) {
  if (variant === 'home') {
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

  return (
    <MediaCard
      media={work.image}
      imageSize="thumb"
      sizes={{ base: '33vw', md: '25vw', xl: '17vw' }}
      ratio="9/16"
      radius="thumb"
      overlay="work"
      inset="sm"
      href={work.href}
      // The project page comes with the project viewer: until then a prefetch would answer 404
      prefetch={false}
      priority={priority}
      top={
        <KindIcon
          work={work}
          className="ml-auto flex size-6.5 items-center justify-center rounded-full glass text-text [&_svg]:size-3"
        />
      }
    >
      <div className="flex flex-col gap-1">
        {work.category && (
          <p className="text-work-category text-accent uppercase">{work.category}</p>
        )}
        <h2 className="text-caption-s font-bold text-text">{work.title}</h2>
      </div>
    </MediaCard>
  )
}
