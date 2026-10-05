import { Chip } from '@/components/ui/Chip'
import { MediaCard } from '@/components/ui/MediaCard'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { formatDate } from '@/lib/date'
import type { NewsSlide } from '@/lib/queries'
import type { SectionNews } from '@/payload-types'
import { NewsSlider } from './NewsSlider'

type Props = {
  section: Partial<SectionNews> | undefined
  /** The latest published news, newest first. */
  news: NewsSlide[]
}

const HEADING_ID = 'home-news-title'

/**
 * «#Новости» (README §6.1 п.4): a slider of the latest news, one card per view
 * (440 / 560 / 640). The whole card links to the article; the title names the link.
 * No news — no section; one news — no arrows and segments.
 */
export function NewsSection({ section, news }: Props) {
  if (!news.length) return null
  const title = section?.title?.trim()

  const slides = news.map((item) => {
    const titleId = `home-news-${item.id}`
    const date = formatDate(item.date)
    return (
      <MediaCard
        key={item.id}
        media={item.cover}
        imageSize="hero"
        sizes={{ base: '100vw' }}
        radius="media"
        overlay="card"
        href={`/news/${item.slug}`}
        labelledBy={titleId}
        className="h-news-card md:h-tall-md xl:h-tall-xl"
        top={date && <Chip variant="glass">{date}</Chip>}
      >
        {/* Room for the progress segments over the track: 22 + 3 + 6 (design: home) */}
        <div className="flex max-w-slide-text flex-col gap-2.5 pb-2.75">
          <h3 id={titleId} className="text-h3 text-balance">
            {item.title}
          </h3>
          {item.lead && <p className="text-body-s text-pretty text-text-2">{item.lead}</p>}
        </div>
      </MediaCard>
    )
  })

  return (
    <NewsSlider
      heading={<SectionHeading label={section?.label} title={title} id={HEADING_ID} />}
      headingId={title ? HEADING_ID : undefined}
      label={section?.label ?? undefined}
      slides={slides}
    />
  )
}
