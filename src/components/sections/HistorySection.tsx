import { MediaCard } from '@/components/ui/MediaCard'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { cn } from '@/lib/cn'
import { asMedia } from '@/lib/media'
import { paragraphs } from '@/lib/text'
import type { SectionHistory, Stat } from '@/payload-types'
import { StatsSection } from './StatsSection'

type Props = {
  /** `history` of a page global (historyTab). */
  history: Partial<SectionHistory> | undefined
  /** The `stats` global: a grid under the text from 1280 (the strip above takes it under 1280). */
  stats?: Stat['items'] | null
  /** Prefix of the label id, which names the section (there is no heading): `about-history-label`. */
  idPrefix?: string
  className?: string
}

/**
 * Company history (about v2 §2.4): asymmetric photo collage — 3:4 photo, the accent year plate and
 * a 1:1 photo — then the lead and text; from 1280 two columns (1fr : 1.05fr, 72 apart, centred),
 * with the statistics grid under the text. The section has no heading: the label names it, if any.
 */
export function HistorySection({ history, stats, idPrefix = 'about', className }: Props) {
  const photoMain = asMedia(history?.photoMain)
  const photoSecondary = asMedia(history?.photoSecondary)
  const text = paragraphs(history?.text)
  if (!photoMain && !history?.lead && !text.length) return null
  const label = history?.label?.trim()
  const labelId = label ? `${idPrefix}-history-label` : undefined

  return (
    <section
      aria-labelledby={labelId}
      className={cn(
        'page-container flex flex-col gap-7 pt-14',
        'xl:grid xl:grid-history-xl xl:items-center xl:gap-18',
        className,
      )}
    >
      {(photoMain || photoSecondary || history?.yearValue) && (
        <div className="grid grid-history items-end gap-2.5">
          <MediaCard
            media={photoMain}
            ratio="3/4"
            radius="card"
            sizes={{ base: '55vw', xl: '25vw' }}
          />
          <div className="flex flex-col gap-2.5">
            {history?.yearValue && (
              <div className="flex flex-col gap-1 rounded-card bg-accent p-4 text-on-accent">
                <p className="text-year">{history.yearValue}</p>
                {history.yearCaption && <p className="text-caption">{history.yearCaption}</p>}
              </div>
            )}
            {photoSecondary && (
              <MediaCard
                media={photoSecondary}
                ratio="1/1"
                radius="card"
                sizes={{ base: '45vw', xl: '20vw' }}
              />
            )}
          </div>
        </div>
      )}
      <div className="flex flex-col gap-4">
        {label && <SectionLabel id={labelId}>{label}</SectionLabel>}
        {history?.lead && <p className="text-lead text-pretty">{history.lead}</p>}
        {text.map((paragraph, i) => (
          <p key={i} className="text-body text-pretty text-text-3">
            {paragraph}
          </p>
        ))}
        {!!stats?.length && (
          <div className="hidden pt-3 xl:block">
            <StatsSection items={stats} variant="grid" />
          </div>
        )}
      </div>
    </section>
  )
}
