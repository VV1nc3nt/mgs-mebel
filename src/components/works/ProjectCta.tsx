import { ContactButton } from '@/components/ui/ContactButton'
import type { Messenger } from '@/lib/chrome'
import type { WorksPage } from '@/payload-types'

type Props = {
  cta: WorksPage['project'] | undefined
  /** In MESSENGER_ORDER: the button opens the choice in place; none — no button. */
  messengers: Messenger[]
}

const TITLE_ID = 'project-cta-title'

/**
 * The accent strip under the gallery of a project page (works v2 §3.3): title, text and the
 * contact button. From 768 the text on the left, the button on the right. Texts from worksPage;
 * no title — no block.
 */
export function ProjectCta({ cta, messengers }: Props) {
  const title = cta?.ctaTitle?.trim()
  if (!title) return null
  const text = cta?.ctaText?.trim()

  return (
    <section aria-labelledby={TITLE_ID} className="page-container">
      <div className="flex flex-col gap-5 rounded-media bg-accent p-6 text-on-accent md:flex-row md:items-center md:justify-between md:gap-8">
        <div className="flex flex-col gap-3">
          <h2 id={TITLE_ID} className="max-w-article-cta text-h3 text-balance">
            {title}
          </h2>
          {text && <p className="max-w-article-cta text-body text-pretty">{text}</p>}
        </div>
        <div className="flex shrink-0 empty:hidden">
          <ContactButton
            caption={cta?.ctaButton}
            messengers={messengers}
            tone="inverse"
            size={52}
            fullWidth="mobile"
            arrow
          />
        </div>
      </div>
    </section>
  )
}
