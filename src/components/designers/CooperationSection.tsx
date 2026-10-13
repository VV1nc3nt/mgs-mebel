import { ArrowRight } from 'lucide-react'

import { MessengerIcon } from '@/components/icons/MessengerIcon'
import { PosterImage } from '@/components/ui/PosterImage'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { MESSENGER_NAMES } from '@/lib/chrome'
import { cn } from '@/lib/cn'
import type { DesignerManager } from '@/lib/designers'
import { asMedia } from '@/lib/media'
import type { Designer } from '@/payload-types'

/** One column per messenger: 1 — the full width, 3 at most (designers v2 §2.4). */
const COLUMNS = ['grid-cols-1', 'grid-cols-1', 'grid-cols-2', 'grid-cols-3'] as const

type Props = {
  /** `cooperation` of the designers global. */
  cooperation: Designer['cooperation'] | undefined
  /** From the settings (toDesignerManager); null — nothing to contact, no section. */
  manager: DesignerManager | null
  idPrefix?: string
}

/**
 * «#сотрудничество» (designers v2 §2.4): label and H2, the manager card — photo in the lime ring,
 * name, position, the phone row (a `tel:` link), the messenger buttons (direct links, in
 * MESSENGER_ORDER). Under 1280 the heading is above the card; from 1280 they stand side by side.
 */
export function CooperationSection({ cooperation, manager, idPrefix = 'designers' }: Props) {
  if (!manager) return null
  const titleId = `${idPrefix}-cooperation-title`
  const { name, position, phone, messengers } = manager
  const messengersLabel = cooperation?.messengersLabel?.trim()

  return (
    <section
      aria-labelledby={cooperation?.title ? titleId : undefined}
      className="page-container flex flex-col gap-heading pt-section xl:grid xl:grid-cols-2 xl:items-center xl:gap-16 xl:pt-section-xl"
    >
      <SectionHeading label={cooperation?.label} title={cooperation?.title} id={titleId} />
      <div className="flex flex-col gap-5 rounded-media border border-border bg-surface px-5 py-6">
        {(name || position || asMedia(manager.photo)) && (
          <div className="flex items-center gap-4">
            {asMedia(manager.photo) && (
              <div className="relative size-avatar shrink-0 overflow-hidden rounded-full bg-surface-3 shadow-avatar-ring">
                <PosterImage
                  media={manager.photo}
                  sizes={{ base: '25vw', xl: '10vw' }}
                  imageSize="thumb"
                />
              </div>
            )}
            <div className="flex flex-col gap-1">
              {name && <p className="text-title-s">{name}</p>}
              {position && <p className="text-body-xs text-text-3">{position}</p>}
            </div>
          </div>
        )}
        {phone && (
          <a
            href={phone.href}
            className="group flex items-center justify-between border-y border-divider py-4"
          >
            <span className="flex flex-col gap-0.5">
              <span className="text-caption font-normal text-text-4">Телефон</span>
              <span className="text-phone transition-colors group-hover:text-accent">
                {phone.display}
              </span>
            </span>
            <span
              aria-hidden="true"
              className="flex size-11 items-center justify-center rounded-full bg-surface-3"
            >
              <ArrowRight className="size-4" />
            </span>
          </a>
        )}
        {messengers.length > 0 && (
          <div className="flex flex-col gap-3">
            {messengersLabel && (
              <p className="text-body-xs font-semibold text-text-2">{messengersLabel}</p>
            )}
            <ul className={cn('grid gap-2', COLUMNS[Math.min(messengers.length, 3)])}>
              {messengers.map(({ kind, href }) => (
                <li key={kind} className="flex">
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={MESSENGER_NAMES[kind]}
                    className="flex h-14 flex-1 items-center justify-center rounded-pill border border-border-strong transition-colors hover:border-accent hover:bg-surface-3"
                  >
                    <MessengerIcon kind={kind} className="size-6" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
