import Link from 'next/link'

import { Chip } from '@/components/ui/Chip'
import { HIT_AREA_Y } from '@/components/ui/hitArea'
import { MediaCard } from '@/components/ui/MediaCard'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { cn } from '@/lib/cn'
import { asMedia } from '@/lib/media'
import { paragraphs } from '@/lib/text'
import type { SectionHistoryLink } from '@/payload-types'

type Props = {
  /** `history` of a page global (historyTab); the link label exists only in the link variant. */
  history: Partial<SectionHistoryLink> | undefined
  /** «Подробнее о компании»: shown when the page passes it and the label is filled in. */
  linkHref?: string
  className?: string
}

/**
 * Company history (README §6.1 п.3, §6.2): asymmetric photo grid — 3:4 photo, the accent year
 * plate and a 1:1 photo — next to the lead, text, value chips and the link to «О нас».
 * A column on mobile/tablet, two columns from desktop.
 */
export function HistorySection({ history, linkHref, className }: Props) {
  const photoMain = asMedia(history?.photoMain)
  const photoSecondary = asMedia(history?.photoSecondary)
  const text = paragraphs(history?.text)
  if (!photoMain && !history?.lead && !text.length) return null
  const values = history?.values?.filter((v) => v.label.trim()) ?? []
  const linkLabel = linkHref ? history?.linkLabel?.trim() : undefined

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
        {values.length > 0 && (
          <ul className="flex flex-wrap gap-2 pt-1">
            {values.map((value) => (
              <li key={value.id ?? value.label}>
                <Chip>{value.label}</Chip>
              </li>
            ))}
          </ul>
        )}
        {linkHref && linkLabel && (
          <div className="flex pt-2">
            <Link
              href={linkHref}
              className={cn(
                'relative inline-flex items-center gap-2.5 text-button transition-colors hover:text-accent',
                HIT_AREA_Y,
              )}
            >
              {linkLabel}
              <span
                aria-hidden="true"
                className="flex size-8 items-center justify-center rounded-full bg-surface-3"
              >
                →
              </span>
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
