import { BgVideo } from '@/components/ui/BgVideo'
import type { About } from '@/payload-types'

export type Exhibition = NonNullable<NonNullable<About['exhibitions']>['items']>[number]

/**
 * Exhibition card of the media slider (about v2 §2.7): poster and background video (only the
 * active card's plays — the slider tells it), the gradient, the date chip on glass, H3 and text at
 * the bottom.
 */
export function ExhibitionCard({ item }: { item: Exhibition }) {
  return (
    <>
      <BgVideo
        poster={item.poster}
        video={item.video}
        sizes={{ base: '86vw', md: '62vw', xl: '78vw' }}
        lazySrc
      />
      <div aria-hidden="true" className="absolute inset-0 bg-overlay-expo" />
      <p className="absolute top-4 left-4 rounded-thumb glass px-3 py-1.5 text-caption">
        {item.date}
      </p>
      <div className="absolute inset-x-6 bottom-6.5 flex max-w-slide-text flex-col gap-2.5">
        <h3 className="text-expo-title md:text-expo-title-md xl:text-expo-title-xl">
          {item.title}
        </h3>
        {item.text && <p className="text-body text-pretty text-text-2">{item.text}</p>}
      </div>
    </>
  )
}
