import { Action } from '@/components/ui/Action'
import { contactLinkLabel, type Messenger } from '@/lib/chrome'
import type { ProjectCtaData } from '@/lib/workProject'
import { ProjectCtaChooser } from './ProjectCtaChooser'
import {
  CTA_CONTENT,
  CTA_LABEL_TEXT,
  CTA_TEXT_ID,
  CTA_TILE,
  CTA_TITLE_ID,
  CTA_TRIGGER,
} from './projectCtaStyles'

type Props = {
  cta: ProjectCtaData
  /** In MESSENGER_ORDER, at least one (projectCta). */
  messengers: Messenger[]
}

/**
 * The CTA of a project page, a 3:4 tile of the masonry among the frames (works v2, decisions of
 * 24.10): title, text and, at the bottom, «<button> →» — the lime capsule, or lime text on a narrow
 * tile. The whole tile is one contact button: one messenger — a link to it, two or three — the
 * choice opened inside the tile.
 */
export function ProjectCtaTile({ cta, messengers }: Props) {
  const [first] = messengers
  if (!first) return null
  const describedBy = cta.text ? `${CTA_TITLE_ID} ${CTA_TEXT_ID}` : CTA_TITLE_ID

  const head = (
    <>
      <h2
        id={CTA_TITLE_ID}
        className="line-clamp-3 text-work-title text-pretty @cta-tile:text-work-title-md"
      >
        {cta.title}
      </h2>
      {cta.text && (
        <p
          id={CTA_TEXT_ID}
          className="line-clamp-4 min-h-0 overflow-hidden text-body-xs text-pretty text-text-2 @cta-tile:line-clamp-5 @cta-tile:text-body-s"
        >
          {cta.text}
        </p>
      )}
    </>
  )
  if (messengers.length > 1) {
    return (
      <ProjectCtaChooser
        caption={cta.button}
        messengers={messengers}
        describedBy={describedBy}
        head={head}
      />
    )
  }

  return (
    <div className={CTA_TILE}>
      <Action
        href={first.href}
        aria-label={contactLinkLabel(cta.button, first)}
        aria-describedby={describedBy}
        className={CTA_TRIGGER}
      />
      <div className={CTA_CONTENT}>
        {head}
        <div className="mt-auto">
          <CtaLabel caption={cta.button} />
        </div>
      </div>
    </div>
  )
}

/**
 * «<button> →» of the tile with one messenger: the capsule from the width of the token, lime text
 * with wrapping below it (with two or three — ProjectCtaChooser).
 */
function CtaLabel({ caption }: { caption: string }) {
  return (
    <span aria-hidden="true" className="flex">
      <span className={`${CTA_LABEL_TEXT} @cta-tile:hidden`}>{caption} →</span>
      <span className="hidden h-11 max-w-full items-center gap-2 rounded-pill bg-accent px-4.5 text-button-s text-on-accent transition-colors group-hover/cta:bg-accent-hover @cta-tile:inline-flex">
        <span className="truncate">{caption}</span>
        <span>→</span>
      </span>
    </span>
  )
}
