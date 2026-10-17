import Link from 'next/link'

import { Chip } from '@/components/ui/Chip'
import { HIT_AREA_Y } from '@/components/ui/hitArea'
import { MediaCard } from '@/components/ui/MediaCard'
import { readingLabel } from '@/lib/article'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/date'
import type { MediaValue } from '@/lib/media'
import { newsTypeLabel } from '@/lib/newsTypes'

type Props = {
  /** Name of the news section in the crumbs (nav label). */
  newsCrumb: string
  type: string | null | undefined
  date: string
  minutes: number
  title: string
  lead?: string | null
  cover: MediaValue
}

const CRUMB = cn(
  'relative text-text-4 transition-colors hover:text-text',
  // Height only: the links are wider than they are tall, neighbours do not overlap
  HIT_AREA_Y,
)

/**
 * Head of a news article (README §6.8): crumbs, tag / date / reading time, H1, lead and the cover.
 * The cover is the LCP image.
 */
export function ArticleHeader({ newsCrumb, type, date, minutes, title, lead, cover }: Props) {
  const tag = newsTypeLabel(type)
  const day = formatDate(date)
  return (
    <>
      <div className="page-container flex flex-col gap-5 pt-7 xl:pt-18">
        <nav aria-label="Навигационная цепочка">
          <ol className="flex flex-wrap items-center gap-2 text-body-xs font-semibold text-text-4">
            <li>
              <Link href="/" className={CRUMB}>
                Главная
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/news" className={CRUMB}>
                {newsCrumb}
              </Link>
            </li>
          </ol>
        </nav>
        <ul className="flex flex-wrap items-center gap-2">
          {tag && (
            <li className="flex">
              {type === 'new' ? (
                <Chip variant="accent" strong>
                  {tag}
                </Chip>
              ) : (
                <Chip variant="glass" muted strong bordered>
                  {tag}
                </Chip>
              )}
            </li>
          )}
          {day && (
            <li className="flex">
              <Chip variant="outline">
                <time dateTime={date}>{day}</time>
              </Chip>
            </li>
          )}
          <li className="flex">
            <Chip variant="outline">{readingLabel(minutes)}</Chip>
          </li>
        </ul>
        <h1 className="max-w-article-title text-article-title text-balance md:text-article-title-md xl:text-article-title-xl">
          {title}
        </h1>
        {lead?.trim() && (
          <p className="max-w-article-lead text-article-lead text-pretty text-text-2 md:text-article-lead-md">
            {lead}
          </p>
        )}
      </div>
      <div className="page-container pt-7">
        <MediaCard
          media={cover}
          imageSize="hero"
          sizes={{ base: '100vw' }}
          radius="cover"
          priority
          className="h-article-cover md:h-article-cover-md xl:h-article-cover-xl"
        />
      </div>
    </>
  )
}
