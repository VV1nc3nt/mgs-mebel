import { Button } from '@/components/ui/Button'
import { ContactButton } from '@/components/ui/ContactButton'
import type { Messenger } from '@/lib/chrome'
import type { ViewerItem } from '@/lib/workView'

type Props = {
  item: ViewerItem
  /** «Цена актуальна на …» (worksPage.prices); empty — no line. */
  priceDate: string | null
  messengers: Messenger[]
}

/**
 * Panel of the view of an item (works v2 §3.4): title, description, specs, price, «Весь проект →»
 * of a complex project, the CTA. Empty parts are left out.
 */
export function WorkViewPanel({ item, priceDate, messengers }: Props) {
  const cta = messengers.length > 0
  return (
    <div className="flex min-h-full flex-col gap-6 px-5 pt-7 pb-10 xl:px-10 xl:pt-24 xl:pb-8">
      <h2 className="text-viewer-title text-balance xl:text-viewer-title-xl">{item.title}</h2>
      {item.text.map((paragraph, i) => (
        <p key={i} className="text-body text-pretty text-text-2">
          {paragraph}
        </p>
      ))}
      {item.specs.length > 0 && (
        <dl className="flex flex-col">
          {item.specs.map((spec, i) => (
            <div
              key={i}
              className="flex justify-between gap-4 border-t border-border py-3.5 text-body-s"
            >
              <dt className="text-text-4">{spec.label}</dt>
              <dd className="text-right font-semibold">{spec.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {item.price && (
        <div className="flex flex-col gap-1 border-t border-border pt-5">
          <p className="text-body-xs font-semibold text-text-4">Стоимость</p>
          <p className="text-price text-accent">{item.price}</p>
          {priceDate && (
            <p className="text-caption font-normal text-text-4">Цена актуальна на {priceDate}</p>
          )}
        </div>
      )}
      {item.project && (
        // The project page renders on the click only
        <Button href={`/works/${item.project.slug}`} prefetch={false} variant="outline" arrow>
          Весь проект
        </Button>
      )}
      {cta && (
        <div className="mt-auto flex flex-col gap-2.5 pt-2">
          <ContactButton caption={item.cta} messengers={messengers} size={52} fullWidth />
          <p className="text-center text-body-xs text-text-4">Рассчитаем под ваши размеры</p>
        </div>
      )}
    </div>
  )
}
