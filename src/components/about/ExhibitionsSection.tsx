import { SectionLabel } from '@/components/ui/SectionLabel'
import { MediaSlider } from '@/components/ui/MediaSlider'
import { asMedia } from '@/lib/media'
import { paragraphs } from '@/lib/text'
import type { About } from '@/payload-types'
import { ExhibitionCard } from './ExhibitionCard'

type Props = {
  /** `exhibitions` of the about global. */
  exhibitions: About['exhibitions'] | undefined
  idPrefix?: string
}

/**
 * Exhibitions «#выставки» (about v2 §2.7): label, H2 and text, then the cards on the media slider
 * (arrows from 1280). Cards without a poster or a title are left out; none — no section.
 */
export function ExhibitionsSection({ exhibitions, idPrefix = 'about' }: Props) {
  const items = (exhibitions?.items ?? []).filter(
    (item) => asMedia(item.poster) && item.title?.trim(),
  )
  if (!items.length) return null
  const titleId = `${idPrefix}-exhibitions-title`
  const text = paragraphs(exhibitions?.text)

  return (
    <MediaSlider
      size="exhibition"
      arrows
      prevLabel="Предыдущая выставка"
      nextLabel="Следующая выставка"
      headingId={titleId}
      className="pt-section xl:pt-section-xl"
      heading={
        // Without an H2 the whole heading block names the slider
        <div
          id={exhibitions?.title ? undefined : titleId}
          className="flex max-w-section-text flex-col gap-4"
        >
          {exhibitions?.label && <SectionLabel>{exhibitions.label}</SectionLabel>}
          {exhibitions?.title && (
            <h2 id={titleId} className="text-h2 text-balance md:text-h2-md xl:text-h2-xl">
              {exhibitions.title}
            </h2>
          )}
          {text.map((line, i) => (
            <p key={i} className="text-body text-pretty text-text-3">
              {line}
            </p>
          ))}
        </div>
      }
      slides={items.map((item) => (
        <ExhibitionCard key={item.id} item={item} />
      ))}
    />
  )
}
