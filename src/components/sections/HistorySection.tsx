import { MediaCard } from '@/components/ui/MediaCard'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { cn } from '@/lib/cn'
import { asMedia } from '@/lib/media'
import { paragraphs } from '@/lib/text'
import type { SectionHistory } from '@/payload-types'

type Props = {
  /** `history` of a page global (historyTab). */
  history: Partial<SectionHistory> | undefined
  className?: string
}

/**
 * Company history (README §6.1 п.3, §6.2): asymmetric photo grid — 3:4 photo, the accent year
 * plate and a 1:1 photo — next to the lead and text.
 * A column on mobile/tablet, two columns from desktop.
 */
export function HistorySection({ history, className }: Props) {
  const photoMain = asMedia(history?.photoMain)
  const photoSecondary = asMedia(history?.photoSecondary)
  const text = paragraphs(history?.text)
  if (!photoMain && !history?.lead && !text.length) return null

  return (
    <section
      className={cn(
        'page-container flex flex-col gap-7 pt-14',
        'xl:grid xl:grid-cols-2 xl:items-center xl:gap-16 xl:pt-section-xl',
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
      <div className="flex max-w-history flex-col gap-4">
        {history?.label && <SectionLabel>{history.label}</SectionLabel>}
        {history?.lead && <p className="text-lead text-pretty">{history.lead}</p>}
        {text.map((paragraph, i) => (
          <p key={i} className="text-body text-pretty text-text-3">
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  )
}
