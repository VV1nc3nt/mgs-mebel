import { Button } from '@/components/ui/Button'
import { ContactButton } from '@/components/ui/ContactButton'
import type { Messenger } from '@/lib/chrome'
import type { NewsPage } from '@/payload-types'

type Props = {
  cta: NewsPage['articleCta'] | undefined
  /** In MESSENGER_ORDER: «Рассчитать проект» opens the choice in place, as everywhere. */
  messengers: Messenger[]
}

const SALONS_PATH = '/salons'

/**
 * Accent CTA under the article (README §6.8): title, text, «Найти салон» → salons and «Рассчитать
 * проект» → a messenger. Texts from newsPage; no title — no block, an empty label — no button of
 * its own.
 */
export function ArticleCta({ cta, messengers }: Props) {
  const title = cta?.title?.trim()
  if (!title) return null
  const text = cta?.text?.trim()
  const primary = cta?.primaryLabel?.trim()

  return (
    <section aria-labelledby="article-cta-title" className="page-container pt-12">
      <div className="flex flex-col gap-3 rounded-media bg-accent p-7 text-on-accent">
        <h2 id="article-cta-title" className="max-w-article-cta text-h3 text-balance">
          {title}
        </h2>
        {text && <p className="max-w-article-cta text-body text-pretty">{text}</p>}
        <div className="flex flex-wrap gap-2.5 pt-2 empty:hidden">
          {primary && (
            <Button href={SALONS_PATH} variant="inverse" size={48}>
              {primary}
            </Button>
          )}
          <ContactButton
            caption={cta?.secondaryLabel}
            messengers={messengers}
            tone="outline"
            size={48}
          />
        </div>
      </div>
    </section>
  )
}
