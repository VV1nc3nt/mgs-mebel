import { PosterImage } from '@/components/ui/PosterImage'
import { itemNumber } from '@/lib/designers'
import type { Designer } from '@/payload-types'

export type Capability = NonNullable<NonNullable<Designer['capabilities']>['items']>[number]

/**
 * Capability card (designers v2 §2.2): the 4:3 photo with the number on glass, H3 and text.
 */
export function CapabilityCard({ item, index }: { item: Capability; index: number }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-media border border-border bg-surface">
      <div className="relative aspect-4/3 bg-surface-3">
        <PosterImage
          media={item.photo}
          sizes={{ base: '80vw', md: '50vw', xl: '33vw' }}
          imageSize="card"
        />
        <p
          aria-hidden="true"
          className="absolute top-3.5 left-3.5 flex size-9 items-center justify-center rounded-full glass text-body-xs font-bold text-accent"
        >
          {itemNumber(index)}
        </p>
      </div>
      <div className="flex flex-col gap-2 p-5">
        <h3 className="text-capability-title">{item.title}</h3>
        {item.text && <p className="text-body-s text-pretty text-text-3">{item.text}</p>}
      </div>
    </article>
  )
}
