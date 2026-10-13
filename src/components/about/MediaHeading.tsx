import { SectionLabel } from '@/components/ui/SectionLabel'
import { cn } from '@/lib/cn'
import { paragraphs } from '@/lib/text'

type Props = {
  label?: string | null
  title?: string | null
  /** Id of the H2, for `aria-labelledby` of the section. */
  id: string
  text?: string | null
  className?: string
}

/**
 * Heading of a media block (about v2 §2.5, §2.6): label, H2 and text. Under 1280 above the block;
 * from 1280 over it — top / left 48, max 620, not catching clicks (the block's own overlay under
 * it). Spacing between the parts is up to the section.
 */
export function MediaHeading({ label, title, id, text, className }: Props) {
  const lines = paragraphs(text)
  if (!label && !title && !lines.length) return null
  return (
    <div
      className={cn(
        'flex flex-col xl:pointer-events-none xl:absolute xl:top-12 xl:left-12 xl:z-media-text xl:max-w-media-text',
        className,
      )}
    >
      {label && <SectionLabel>{label}</SectionLabel>}
      {title && (
        <h2 id={id} className="text-h2 text-balance md:text-h2-md xl:text-h2-xl">
          {title}
        </h2>
      )}
      {lines.map((line, i) => (
        <p key={i} className="text-body text-pretty text-text-2">
          {line}
        </p>
      ))}
    </div>
  )
}
