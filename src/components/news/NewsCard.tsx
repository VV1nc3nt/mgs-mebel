import { ArrowRight } from 'lucide-react'

import { Chip } from '@/components/ui/Chip'
import { MediaCard } from '@/components/ui/MediaCard'
import type { NewsCardData } from '@/lib/news'

type Props = {
  item: NewsCardData
  /** LCP image: the first card of the server-rendered list. */
  priority?: boolean
}

/**
 * Card of the news list (README §6.7): cover 420 high with the card overlay, date and type tag on
 * top, title, lead and «Читать →» below. The whole card links to the article, named by its title.
 * The cover video is not shown in the list.
 */
export function NewsCard({ item, priority = false }: Props) {
  const titleId = `news-card-${item.id}`
  return (
    <MediaCard
      media={item.cover}
      imageSize="card"
      sizes={{ base: '100vw', md: '50vw', xl: '33vw' }}
      radius="media"
      overlay="card"
      href={item.href}
      labelledBy={titleId}
      // The article is a separate page: no prefetch for every card of the grid
      prefetch={false}
      priority={priority}
      className="h-news-tile"
      top={
        <>
          {item.date && <Chip variant="glass">{item.date}</Chip>}
          {item.tag &&
            (item.type === 'new' ? (
              <Chip variant="accent">{item.tag}</Chip>
            ) : (
              <Chip variant="glass" muted strong>
                {item.tag}
              </Chip>
            ))}
        </>
      }
    >
      <h2 id={titleId} className="text-h3 text-balance">
        {item.title}
      </h2>
      {item.lead && <p className="line-clamp-3 text-body-s text-pretty text-text-2">{item.lead}</p>}
      <span className="flex items-center gap-2 pt-1 text-button-s">
        Читать
        <span
          aria-hidden="true"
          className="flex size-7 items-center justify-center rounded-full bg-text/15 backdrop-blur-glass"
        >
          <ArrowRight className="size-3.5" />
        </span>
      </span>
    </MediaCard>
  )
}
